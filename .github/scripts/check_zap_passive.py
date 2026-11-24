"""Import only captured Playwright messages into an offline passive ZAP instance."""

from __future__ import annotations

import argparse
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time
from typing import Any, Mapping, Sequence
from urllib.parse import urlsplit
import uuid


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_COMPOSE = ROOT / "docker-compose-security-e2e.yml"
DEFAULT_POLICY = ROOT / ".github/quality/zap/passive-policy.json"
DEFAULT_CAPTURE_DIR = Path(
    os.environ.get(
        "SECURITY_ZAP_CAPTURE_DIR",
        str(Path(os.getenv("RUNNER_TEMP", tempfile.gettempdir())) / "lab-solos-zap-capture"),
    )
)
DEFAULT_REPORT = Path(
    os.environ.get(
        "SECURITY_ZAP_REPORT",
        str(Path(os.getenv("RUNNER_TEMP", tempfile.gettempdir())) / "lab-solos-zap-passive.json"),
    )
)
ALLOWED_SOURCES = ("browser", "api_request_context")
ALLOWED_RISKS = {"High", "Medium", "Low", "Informational"}
ALLOWED_CONFIDENCE = {"High", "Medium", "Low"}
MAX_MESSAGES = 10_000


class PassiveAnalysisError(Exception):
    """A fail-closed capture, scanner, or reporting result with a safe reason code."""

    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


@dataclass(frozen=True)
class PolicyResult:
    approved: bool
    blocking_alerts: tuple[dict[str, str], ...]
    excepted_alerts: tuple[dict[str, str], ...]


def _valid_expected_origin(expected_origin: str) -> str:
    try:
        parsed = urlsplit(expected_origin)
        port = parsed.port
    except ValueError as exc:
        raise PassiveAnalysisError("invalid_expected_origin") from exc
    if (
        parsed.scheme != "https"
        or parsed.hostname != "localhost"
        or port is None
        or parsed.username is not None
        or parsed.password is not None
        or parsed.path not in ("", "/")
        or parsed.query
        or parsed.fragment
    ):
        raise PassiveAnalysisError("invalid_expected_origin")
    return f"https://localhost:{port}"


def _entry_origin(url: str) -> str:
    try:
        parsed = urlsplit(url)
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
    except (TypeError, ValueError) as exc:
        raise PassiveAnalysisError("origin_mismatch") from exc
    if not parsed.scheme or not parsed.hostname:
        raise PassiveAnalysisError("origin_mismatch")
    if parsed.username is not None or parsed.password is not None or parsed.fragment:
        raise PassiveAnalysisError("origin_mismatch")
    return f"{parsed.scheme}://{parsed.hostname}:{port}"


def collect_har_entries(
    captures: Mapping[str, Sequence[Mapping[str, Any]]], *, expected_origin: str
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    """Validate and combine browser/APIRequestContext HARs for one exact origin."""
    expected = _valid_expected_origin(expected_origin)
    combined: list[dict[str, Any]] = []
    counts = {"browser": 0, "api_request_context": 0, "frontend_routes": 0, "api_routes": 0}

    for source in ALLOWED_SOURCES:
        files = captures.get(source)
        if not isinstance(files, Sequence) or isinstance(files, (str, bytes)):
            raise PassiveAnalysisError("missing_capture")
        source_count = 0
        for document in files:
            if not isinstance(document, Mapping):
                raise PassiveAnalysisError("invalid_capture")
            log = document.get("log")
            entries = log.get("entries") if isinstance(log, Mapping) else None
            if not isinstance(entries, list) or not entries:
                raise PassiveAnalysisError("invalid_capture")
            for entry in entries:
                if not isinstance(entry, Mapping):
                    raise PassiveAnalysisError("invalid_capture")
                request = entry.get("request")
                response = entry.get("response")
                if not isinstance(request, Mapping) or not isinstance(response, Mapping):
                    raise PassiveAnalysisError("invalid_capture")
                url = request.get("url")
                method = request.get("method")
                status = response.get("status")
                if not isinstance(url, str) or _entry_origin(url) != expected:
                    raise PassiveAnalysisError("origin_mismatch")
                if not isinstance(method, str) or not method or not isinstance(status, int) or not 100 <= status <= 599:
                    raise PassiveAnalysisError("invalid_capture")
                if not isinstance(request.get("headers", []), list) or not isinstance(response.get("headers", []), list):
                    raise PassiveAnalysisError("invalid_capture")
                combined.append(dict(entry))
                source_count += 1
                if urlsplit(url).path.startswith("/api/"):
                    counts["api_routes"] += 1
                else:
                    counts["frontend_routes"] += 1
                if len(combined) > MAX_MESSAGES:
                    raise PassiveAnalysisError("message_limit_exceeded")
        if source_count == 0:
            raise PassiveAnalysisError("missing_capture")
        counts[source] = source_count

    if not combined:
        raise PassiveAnalysisError("missing_capture")
    return combined, counts


def _parse_timestamp(value: Any) -> datetime:
    if not isinstance(value, str):
        raise ValueError("invalid timestamp")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("timestamp must be timezone aware")
    return parsed.astimezone(timezone.utc)


def load_exceptions(path: Path, *, now: datetime | None = None) -> list[dict[str, str]]:
    try:
        document = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(document, Mapping) or document.get("version") != "1":
            raise ValueError("invalid exception format")
        entries = document.get("exceptions")
        if not isinstance(entries, list):
            raise ValueError("invalid exception list")
        current = now or datetime.now(timezone.utc)
        normalized: list[dict[str, str]] = []
        seen: set[str] = set()
        for entry in entries:
            if not isinstance(entry, Mapping):
                raise ValueError("invalid exception")
            exception_id = entry.get("id")
            rule_id = entry.get("rule_id")
            route = entry.get("path")
            approver = entry.get("approver")
            justification = entry.get("justification")
            created_at = entry.get("created_at")
            expires_at = entry.get("expires_at")
            created = _parse_timestamp(created_at)
            expires = _parse_timestamp(expires_at)
            if (
                not isinstance(exception_id, str)
                or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,63}", exception_id)
                or exception_id in seen
                or not isinstance(rule_id, str)
                or not re.fullmatch(r"\d{1,6}", rule_id)
                or not isinstance(route, str)
                or not route.startswith("/")
                or "?" in route
                or "#" in route
                or "\\" in route
                or "*" in route
                or ".." in route.split("/")
                or not isinstance(approver, str)
                or not approver.strip()
                or not isinstance(justification, str)
                or not justification.strip()
                or not timedelta(0) < expires - created <= timedelta(days=30)
            ):
                raise ValueError("invalid exception")
            seen.add(exception_id)
            status = "valid" if created <= current < expires else "pending" if current < created else "expired"
            normalized.append({"id": exception_id, "rule_id": rule_id, "path": route, "status": status})
        return normalized
    except (OSError, UnicodeError, json.JSONDecodeError, ValueError, TypeError, KeyError) as exc:
        raise PassiveAnalysisError("invalid_report") from exc


def evaluate_policy(
    alerts: Sequence[Mapping[str, Any]],
    exceptions: Sequence[Mapping[str, str]] = (),
) -> PolicyResult:
    blocking: list[dict[str, str]] = []
    excepted: list[dict[str, str]] = []
    for alert in alerts:
        if not isinstance(alert, Mapping):
            raise PassiveAnalysisError("invalid_report")
        plugin_id = alert.get("pluginId")
        risk = alert.get("risk")
        confidence = alert.get("confidence")
        if (
            not isinstance(plugin_id, (str, int))
            or not re.fullmatch(r"\d{1,6}", str(plugin_id))
            or risk not in ALLOWED_RISKS
            or confidence not in ALLOWED_CONFIDENCE
        ):
            raise PassiveAnalysisError("invalid_report")
        if risk == "High" and confidence == "High":
            route = urlsplit(str(alert.get("url", ""))).path
            exception = next(
                (
                    record
                    for record in exceptions
                    if record.get("rule_id") == str(plugin_id)
                    and record.get("path") == route
                    and record.get("status") == "valid"
                ),
                None,
            )
            normalized = {"rule_id": str(plugin_id), "risk": risk, "confidence": confidence}
            if exception:
                excepted.append({**normalized, "exception_id": exception["id"], "path": route})
            else:
                blocking.append(normalized)
    return PolicyResult(
        approved=not blocking,
        blocking_alerts=tuple(blocking),
        excepted_alerts=tuple(excepted),
    )


def validate_alert_origins(alerts: Sequence[Mapping[str, Any]], expected_origin: str) -> None:
    expected = _valid_expected_origin(expected_origin)
    for alert in alerts:
        if not isinstance(alert, Mapping):
            raise PassiveAnalysisError("invalid_report")
        url = alert.get("url")
        if not isinstance(url, str) or _entry_origin(url) != expected:
            raise PassiveAnalysisError("origin_mismatch")


def sanitize_report(
    *,
    alerts: Sequence[Mapping[str, Any]],
    source_counts: Mapping[str, int],
    duration_seconds: float,
    completed: bool,
    exceptions: Sequence[Mapping[str, str]] = (),
) -> dict[str, Any]:
    """Return only counts and IDs; never retain raw URLs, headers, bodies, or evidence."""
    if not completed:
        raise PassiveAnalysisError("processing_timeout")
    if not isinstance(duration_seconds, (int, float)) or duration_seconds < 0:
        raise PassiveAnalysisError("invalid_report")
    if set(source_counts) != {
        "browser", "api_request_context", "frontend_routes", "api_routes",
        "body_unavailable", "cache_skipped", "body_unavailable_cache_skipped",
        "cache_evidence_ambiguous", "wire_304_responses", "wire_304_ambiguous",
    }:
        raise PassiveAnalysisError("invalid_report")
    if any(not isinstance(value, int) or value < 0 for value in source_counts.values()):
        raise PassiveAnalysisError("invalid_report")
    if source_counts["browser"] <= 0 or source_counts["api_request_context"] <= 0:
        raise PassiveAnalysisError("missing_capture")
    if source_counts["browser"] + source_counts["api_request_context"] != source_counts["frontend_routes"] + source_counts["api_routes"]:
        raise PassiveAnalysisError("invalid_report")
    if source_counts["cache_skipped"] != source_counts["body_unavailable_cache_skipped"]:
        raise PassiveAnalysisError("invalid_report")

    evaluated = evaluate_policy(alerts, exceptions)
    exception_ids = {
        (item["rule_id"], item["path"]): item["exception_id"] for item in evaluated.excepted_alerts
    }
    grouped: Counter[tuple[str, str, str, str, str]] = Counter()
    for alert in alerts:
        rule_id, risk, confidence = str(alert["pluginId"]), str(alert["risk"]), str(alert["confidence"])
        route = urlsplit(str(alert.get("url", ""))).path
        exception_id = exception_ids.get((rule_id, route), "") if risk == "High" and confidence == "High" else ""
        status = "excepted" if exception_id else "observed"
        grouped[(rule_id, risk, confidence, status, exception_id)] += 1
    safe_alerts = []
    for (rule_id, risk, confidence, status, exception_id), count in sorted(grouped.items()):
        safe_alert = {
            "rule_id": rule_id,
            "risk": risk,
            "confidence": confidence,
            "alert_status": status,
            "count": count,
        }
        if status == "excepted":
            safe_alert["exception_id"] = exception_id
        safe_alerts.append(safe_alert)
    return {
        "schema_version": 1,
        "status": (
            "inconclusive"
            if source_counts["body_unavailable"] > 0
            else "passed" if evaluated.approved else "policy_failed"
        ),
        "messages": {key: source_counts[key] for key in sorted(source_counts)},
        "processing_seconds": round(float(duration_seconds), 3),
        "alerts": safe_alerts,
    }


def failure_report(reason: str, source_counts: Mapping[str, int] | None = None) -> dict[str, Any]:
    allowed_reasons = {
        "invalid_expected_origin",
        "missing_capture",
        "invalid_capture",
        "capture_incomplete",
        "origin_mismatch",
        "message_limit_exceeded",
        "processing_timeout",
        "invalid_report",
        "scanner_unavailable",
        "scanner_failed",
        "sanitization_failed",
        "cleanup_failed",
    }
    if reason not in allowed_reasons:
        reason = "scanner_failed"
    normalized_counts = {
        "api_request_context": 0,
        "api_routes": 0,
        "body_unavailable": 0,
        "body_unavailable_cache_skipped": 0,
        "cache_evidence_ambiguous": 0,
        "wire_304_ambiguous": 0,
        "wire_304_responses": 0,
        "browser": 0,
        "cache_skipped": 0,
        "frontend_routes": 0,
    }
    if source_counts:
        for key in normalized_counts:
            value = source_counts.get(key)
            if isinstance(value, int) and value >= 0:
                normalized_counts[key] = value
    return {
        "schema_version": 1,
        "status": "inconclusive",
        "reason": reason,
        "messages": normalized_counts,
        "processing_seconds": None,
        "alerts": [],
    }


def _read_capture_files(directory: Path) -> dict[str, list[dict[str, Any]]]:
    captures: dict[str, list[dict[str, Any]]] = {source: [] for source in ALLOWED_SOURCES}
    source_dirs = {"browser": "browser", "api_request_context": "api-request-context"}
    for source, dirname in source_dirs.items():
        source_dir = directory / dirname
        files = sorted(source_dir.glob("*.har")) if source_dir.is_dir() else []
        status_files = sorted(source_dir.glob("*.status.json")) if source_dir.is_dir() else []
        if not status_files:
            raise PassiveAnalysisError("missing_capture")
        expected_hars: set[str] = set()
        expected_counts: dict[str, int] = {}
        for status_path in status_files:
            try:
                status = json.loads(status_path.read_text(encoding="utf-8"))
            except (OSError, UnicodeError, json.JSONDecodeError) as exc:
                raise PassiveAnalysisError("invalid_capture") from exc
            if not isinstance(status, Mapping):
                raise PassiveAnalysisError("invalid_capture")
            count = status.get("count")
            observed = status.get("observed")
            cache_skipped = status.get("cache_skipped")
            body_unavailable = status.get("body_unavailable")
            body_unavailable_cache_skipped = status.get("body_unavailable_cache_skipped")
            wire_304_responses = status.get("wire_304_responses")
            wire_304_ambiguous = status.get("wire_304_ambiguous")
            cache_evidence_ambiguous = status.get("cache_evidence_ambiguous")
            failed_messages = status.get("failed_messages")
            if (
                not isinstance(count, int)
                or count < 0
                or not isinstance(observed, int)
                or observed < 0
                or not isinstance(cache_skipped, int)
                or cache_skipped < 0
                or not isinstance(body_unavailable, int)
                or body_unavailable < 0
                or not isinstance(body_unavailable_cache_skipped, int)
                or body_unavailable_cache_skipped < 0
                or not isinstance(wire_304_responses, int)
                or wire_304_responses < 0
                or not isinstance(wire_304_ambiguous, int)
                or wire_304_ambiguous < 0
                or not isinstance(cache_evidence_ambiguous, int)
                or cache_evidence_ambiguous < 0
                or not isinstance(failed_messages, int)
                or failed_messages < 0
                or count + cache_skipped != observed
                or body_unavailable > count
                or body_unavailable_cache_skipped != cache_skipped
                or (
                    cache_skipped > 0
                    and (
                        wire_304_responses > 0
                        or wire_304_ambiguous > 0
                        or cache_evidence_ambiguous > 0
                    )
                )
            ):
                raise PassiveAnalysisError("invalid_capture")
            if status.get("complete") is False:
                raise PassiveAnalysisError("capture_incomplete")
            if status.get("complete") is not True:
                raise PassiveAnalysisError("invalid_capture")
            if failed_messages != 0:
                raise PassiveAnalysisError("invalid_capture")
            stem = status_path.name.removesuffix(".status.json")
            matching_har = source_dir / f"{stem}.har"
            if count > 0:
                expected_hars.add(matching_har.name)
                expected_counts[matching_har.name] = count
                if not matching_har.is_file():
                    raise PassiveAnalysisError("invalid_capture")
            elif matching_har.exists():
                raise PassiveAnalysisError("invalid_capture")
        if {path.name for path in files} != expected_hars:
            raise PassiveAnalysisError("invalid_capture")
        for path in files:
            try:
                value = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, UnicodeError, json.JSONDecodeError) as exc:
                raise PassiveAnalysisError("invalid_capture") from exc
            log = value.get("log") if isinstance(value, Mapping) else None
            entries = log.get("entries") if isinstance(log, Mapping) else None
            if not isinstance(entries, list) or len(entries) != expected_counts[path.name]:
                raise PassiveAnalysisError("invalid_capture")
            captures[source].append(value)
    return captures


def _summarize_capture_status(directory: Path) -> dict[str, int]:
    counts = {
        "browser": 0,
        "api_request_context": 0,
        "frontend_routes": 0,
        "api_routes": 0,
        "body_unavailable": 0,
        "body_unavailable_cache_skipped": 0,
        "cache_skipped": 0,
        "cache_evidence_ambiguous": 0,
        "wire_304_responses": 0,
        "wire_304_ambiguous": 0,
    }
    source_dirs = {"browser": "browser", "api_request_context": "api-request-context"}
    for source, dirname in source_dirs.items():
        source_dir = directory / dirname
        if not source_dir.is_dir():
            continue
        for path in source_dir.glob("*.status.json"):
            try:
                status = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, UnicodeError, json.JSONDecodeError):
                continue
            count = status.get("count") if isinstance(status, Mapping) else None
            if isinstance(count, int) and count >= 0:
                counts[source] += count
            unavailable = status.get("body_unavailable") if isinstance(status, Mapping) else None
            if isinstance(unavailable, int) and unavailable >= 0:
                counts["body_unavailable"] += unavailable
            skipped = status.get("cache_skipped") if isinstance(status, Mapping) else None
            if isinstance(skipped, int) and skipped >= 0:
                counts["cache_skipped"] += skipped
            skipped_unavailable = (
                status.get("body_unavailable_cache_skipped")
                if isinstance(status, Mapping)
                else None
            )
            if isinstance(skipped_unavailable, int) and skipped_unavailable >= 0:
                counts["body_unavailable_cache_skipped"] += skipped_unavailable
            evidence_ambiguous = (
                status.get("cache_evidence_ambiguous")
                if isinstance(status, Mapping)
                else None
            )
            if isinstance(evidence_ambiguous, int) and evidence_ambiguous >= 0:
                counts["cache_evidence_ambiguous"] += evidence_ambiguous
            wire_304_responses = (
                status.get("wire_304_responses")
                if isinstance(status, Mapping)
                else None
            )
            if isinstance(wire_304_responses, int) and wire_304_responses >= 0:
                counts["wire_304_responses"] += wire_304_responses
            wire_304_ambiguous = (
                status.get("wire_304_ambiguous")
                if isinstance(status, Mapping)
                else None
            )
            if isinstance(wire_304_ambiguous, int) and wire_304_ambiguous >= 0:
                counts["wire_304_ambiguous"] += wire_304_ambiguous
    return counts


def _docker_exec(container_id: str, args: Sequence[str], *, timeout: int = 10) -> str:
    completed = subprocess.run(
        ["docker", "exec", container_id, *args],
        check=False,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    if completed.returncode != 0:
        raise PassiveAnalysisError("scanner_unavailable")
    return completed.stdout


def _copy_into_tmpfs(container_id: str, source: Path, destination: str) -> None:
    completed = subprocess.run(
        ["docker", "exec", "-i", container_id, "sh", "-c", f"cat > {destination}"],
        check=False,
        input=source.read_bytes(),
        capture_output=True,
        timeout=30,
    )
    if completed.returncode != 0:
        raise PassiveAnalysisError("scanner_failed")


def _zap_api(container_id: str, api_key: str, endpoint: str, params: Mapping[str, str] | None = None) -> Any:
    command = ["curl", "--fail", "--silent", "--show-error", "--get", "--data-urlencode", f"apikey={api_key}"]
    for key, value in (params or {}).items():
        command.extend(["--data-urlencode", f"{key}={value}"])
    command.append(f"http://127.0.0.1:8080/JSON/{endpoint}/")
    raw = _docker_exec(container_id, command)
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise PassiveAnalysisError("invalid_report") from exc


def _start_zap(
    compose: Path, project: str, container_name: str, compose_override: Path | None = None
) -> str:
    command = ["docker", "compose", "--project-name", project, "--file", str(compose)]
    if compose_override:
        command.extend(["--file", str(compose_override)])
    command.extend(
        [
            "--profile", "zap-passive", "run", "--detach", "--no-deps", "--name", container_name,
            "zap-passive",
        ]
    )
    completed = subprocess.run(
        command,
        check=False,
        capture_output=True,
        text=True,
        timeout=120,
    )
    if completed.returncode != 0:
        raise PassiveAnalysisError("scanner_unavailable")
    candidates = re.findall(r"\b[0-9a-f]{12,64}\b", completed.stdout, re.IGNORECASE)
    if not candidates:
        raise PassiveAnalysisError("scanner_unavailable")
    return candidates[-1]


def _wait_zap(container_id: str, api_key: str, timeout_seconds: float) -> None:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        try:
            response = _zap_api(container_id, api_key, "core/view/version")
            if isinstance(response, Mapping) and isinstance(response.get("version"), str):
                return
        except PassiveAnalysisError:
            time.sleep(0.5)
    raise PassiveAnalysisError("scanner_unavailable")


def _import_and_wait(
    container_id: str,
    api_key: str,
    input_path: str,
    expected_origin: str,
    timeout_seconds: float,
) -> list[dict[str, Any]]:
    imported = _zap_api(
        container_id,
        api_key,
        "exim/action/importHar",
        {"filePath": input_path, "sendRequests": "false", "maxMessages": "0"},
    )
    if not isinstance(imported, Mapping) or imported.get("Result") != "OK":
        raise PassiveAnalysisError("scanner_failed")

    urls = _zap_api(container_id, api_key, "core/view/urls")
    if not isinstance(urls, Mapping) or not isinstance(urls.get("urls"), list) or not urls["urls"]:
        raise PassiveAnalysisError("invalid_report")
    for url in urls["urls"]:
        if not isinstance(url, str) or _entry_origin(url) != expected_origin:
            raise PassiveAnalysisError("origin_mismatch")

    deadline = time.monotonic() + timeout_seconds
    pending_samples: list[int] = []
    while time.monotonic() < deadline:
        pending = _zap_api(container_id, api_key, "pscan/view/recordsToScan")
        raw_count = pending.get("recordsToScan") if isinstance(pending, Mapping) else None
        try:
            count = int(raw_count)
        except (TypeError, ValueError) as exc:
            raise PassiveAnalysisError("invalid_report") from exc
        if count < 0:
            raise PassiveAnalysisError("invalid_report")
        pending_samples.append(count)
        if count == 0:
            break
        time.sleep(0.25)
    else:
        print(f"[zap-passive] queue={summarize_queue_progress(pending_samples)}", flush=True)
        raise PassiveAnalysisError("processing_timeout")
    print(f"[zap-passive] queue={summarize_queue_progress(pending_samples)}", flush=True)

    results: list[dict[str, Any]] = []
    start = 0
    page_size = 500
    while True:
        page = _zap_api(
            container_id,
            api_key,
            "alert/view/alerts",
            {"baseurl": expected_origin, "start": str(start), "count": str(page_size)},
        )
        alerts = page.get("alerts") if isinstance(page, Mapping) else None
        if not isinstance(alerts, list):
            raise PassiveAnalysisError("invalid_report")
        if not alerts:
            break
        results.extend(alerts)
        if len(alerts) < page_size:
            break
        start += page_size
        if start > 50_000:
            raise PassiveAnalysisError("message_limit_exceeded")
    validate_alert_origins(results, expected_origin)
    return results


def summarize_queue_progress(samples: Sequence[int]) -> dict[str, int | None]:
    """Summarize only passive-scan queue sizes; never include message data."""
    if not samples:
        return {
            "pending_start": None,
            "pending_min": None,
            "pending_end": None,
            "decreases": 0,
            "samples": 0,
        }
    return {
        "pending_start": samples[0],
        "pending_min": min(samples),
        "pending_end": samples[-1],
        "decreases": sum(current < previous for previous, current in zip(samples, samples[1:])),
        "samples": len(samples),
    }


def _load_policy(path: Path) -> dict[str, Any]:
    try:
        policy = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise PassiveAnalysisError("invalid_report") from exc
    if (
        not isinstance(policy, dict)
        or policy.get("schema_version") != 1
        or policy.get("owner") != "CI quality maintainer"
        or policy.get("passive_only") is not True
        or policy.get("send_requests") is not False
        or policy.get("blocking") != {"risk": "High", "confidence": "High"}
        or policy.get("scope") != {
            "scheme": "https",
            "hostname": "localhost",
            "port_source": "SECURITY_E2E_HTTPS_PORT",
        }
        or policy.get("limits") != {
            "max_messages": MAX_MESSAGES,
            "startup_seconds": 90,
            "processing_seconds": 120,
        }
        or policy.get("report_fields") != [
            "schema_version", "status", "messages", "messages.body_unavailable",
            "messages.cache_skipped", "messages.body_unavailable_cache_skipped",
            "messages.cache_evidence_ambiguous", "messages.wire_304_responses",
            "messages.wire_304_ambiguous", "processing_seconds", "alerts", "reason",
            "rule_id", "risk", "confidence", "count", "alert_status", "exception_id"
        ]
        or policy.get("exceptions") != "exceptions.json"
    ):
        raise PassiveAnalysisError("invalid_report")
    return policy


def _cleanup_owned_capture_dir(capture_dir: Path) -> None:
    temporary_root = Path(os.environ.get("RUNNER_TEMP", tempfile.gettempdir())).resolve()
    target = capture_dir.resolve()
    if target.parent == temporary_root and target.name.startswith("lab-solos-zap-capture-"):
        shutil.rmtree(target, ignore_errors=False)


def run_analysis(
    *,
    capture_dir: Path,
    report_path: Path,
    expected_origin: str,
    compose: Path = DEFAULT_COMPOSE,
    compose_override: Path | None = None,
    policy_path: Path = DEFAULT_POLICY,
    startup_timeout: float = 90,
    processing_timeout: float = 120,
) -> tuple[dict[str, Any], int]:
    """Run ZAP with no network, import recorded messages, and always remove its container."""
    started = time.monotonic()
    source_counts: dict[str, int] = {}
    container_id: str | None = None
    report: dict[str, Any]
    exit_code = 2
    try:
        source_counts = _summarize_capture_status(capture_dir)
        target_origin = _valid_expected_origin(expected_origin)
        policy = _load_policy(policy_path)
        exceptions = load_exceptions(policy_path.parent / policy["exceptions"])
        entries, collected_counts = collect_har_entries(
            _read_capture_files(capture_dir), expected_origin=target_origin
        )
        source_counts = {
            **collected_counts,
            "body_unavailable": source_counts["body_unavailable"],
            "cache_skipped": source_counts["cache_skipped"],
            "body_unavailable_cache_skipped": source_counts[
                "body_unavailable_cache_skipped"
            ],
            "cache_evidence_ambiguous": source_counts[
                "cache_evidence_ambiguous"
            ],
            "wire_304_responses": source_counts["wire_304_responses"],
            "wire_304_ambiguous": source_counts["wire_304_ambiguous"],
        }
        combined_path = capture_dir / "combined-zap-input.har"
        combined_path.parent.mkdir(parents=True, exist_ok=True)
        combined_path.write_text(
            json.dumps({"log": {"version": "1.2", "creator": {"name": "lab-solos-passive-capture", "version": "1"}, "entries": entries}}, separators=(",", ":")),
            encoding="utf-8",
        )
        project = f"lab-solos-zap-{uuid.uuid4().hex[:10]}"
        container_name = f"{project}-analyzer"
        container_id = _start_zap(compose, project, container_name, compose_override)
        _wait_zap(container_id, "lab-solos-local-passive-key", startup_timeout)
        _copy_into_tmpfs(container_id, combined_path, "/tmp/security-e2e-capture.har")
        alerts = _import_and_wait(
            container_id,
            "lab-solos-local-passive-key",
            "/tmp/security-e2e-capture.har",
            target_origin,
            processing_timeout,
        )
        report = sanitize_report(
            alerts=alerts,
            source_counts=source_counts,
            duration_seconds=time.monotonic() - started,
            completed=True,
            exceptions=exceptions,
        )
        exit_code = 0 if report["status"] == "passed" else 1 if report["status"] == "policy_failed" else 2
    except PassiveAnalysisError as exc:
        report = failure_report(exc.reason, source_counts)
    except (OSError, subprocess.SubprocessError):
        report = failure_report("scanner_failed", source_counts)
    finally:
        cleanup_failed = False
        if container_id:
            removed = subprocess.run(
                ["docker", "rm", "--force", container_id],
                check=False,
                capture_output=True,
                text=True,
                timeout=30,
            )
            cleanup_failed = removed.returncode != 0
        try:
            (capture_dir / "combined-zap-input.har").unlink(missing_ok=True)
        except OSError:
            cleanup_failed = True
        try:
            _cleanup_owned_capture_dir(capture_dir)
        except OSError:
            cleanup_failed = True
        if cleanup_failed:
            report = failure_report("cleanup_failed", source_counts)
            exit_code = 2

    try:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        serialized = json.dumps(report, indent=2, sort_keys=True) + "\n"
        report_path.write_text(serialized, encoding="utf-8")
        # A report containing anything beyond the fixed schema is never published.
        encoded = report_path.read_text(encoding="utf-8")
        parsed = json.loads(encoded)
        if parsed != report:
            raise PassiveAnalysisError("sanitization_failed")
    except (OSError, UnicodeError, json.JSONDecodeError, PassiveAnalysisError):
        report = failure_report("sanitization_failed", source_counts)
        exit_code = 2
        try:
            report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        except OSError:
            pass
    return report, exit_code


def default_origin() -> str:
    port_raw = os.environ.get("SECURITY_E2E_HTTPS_PORT", "18443")
    try:
        port = int(port_raw)
    except ValueError as exc:
        raise PassiveAnalysisError("invalid_expected_origin") from exc
    if not 1 <= port <= 65535:
        raise PassiveAnalysisError("invalid_expected_origin")
    configured = os.environ.get("SECURITY_E2E_BASE_URL", f"https://localhost:{port}")
    if configured != f"https://localhost:{port}":
        raise PassiveAnalysisError("invalid_expected_origin")
    return _valid_expected_origin(configured)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--capture-dir", type=Path, default=DEFAULT_CAPTURE_DIR)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--compose-file", type=Path, default=DEFAULT_COMPOSE)
    parser.add_argument("--compose-override", type=Path)
    parser.add_argument("--policy", type=Path, default=DEFAULT_POLICY)
    parser.add_argument("--startup-timeout", type=float, default=90)
    parser.add_argument("--processing-timeout", type=float, default=120)
    args = parser.parse_args(argv)
    try:
        origin = default_origin()
        report, exit_code = run_analysis(
            capture_dir=args.capture_dir,
            report_path=args.report,
            expected_origin=origin,
            compose=args.compose_file,
            compose_override=args.compose_override,
            policy_path=args.policy,
            startup_timeout=args.startup_timeout,
            processing_timeout=args.processing_timeout,
        )
    except PassiveAnalysisError as exc:
        report = failure_report(exc.reason)
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        exit_code = 2
    print(json.dumps(report, sort_keys=True))
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
