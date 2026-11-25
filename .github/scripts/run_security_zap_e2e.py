"""Run the existing security Playwright project, analyze it, and erase raw captures."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
import hashlib
import json
import math
import os
from pathlib import Path
import signal
import shutil
import subprocess
import sys
import tempfile
from typing import Callable, Iterable, Mapping, Sequence
from urllib.parse import urlsplit
import uuid


ROOT = Path(__file__).resolve().parents[2]
FRONTEND = ROOT / "frontend"
CHECKER = ROOT / ".github/scripts/check_zap_passive.py"
COMPOSE_FILE = ROOT / "docker-compose-security-e2e.yml"
CAPTURE_PREFIX = "lab-solos-zap-capture-"
DEFAULT_COMPOSE_PROJECT = "lab-solos-ci-browser-security"
MAX_ACCESS_LOG_LINE_BYTES = 128 * 1024
MAX_ACCESS_LOG_BYTES = 32 * 1024 * 1024
MAX_ACCESS_LOG_RECORDS = 20_000
ACCESS_LOG_TIMEOUT_SECONDS = 60
# Caddy's access record is emitted after the request handler completes. Its `ts`
# is therefore treated as the finish time; `ts-duration` estimates request start.
# Both clocks are local. End-to-end runs measured up to 1.04 s between browser
# request timing and Caddy's duration-derived start; keep a 1.25 s hard ceiling.
ACCESS_LOG_TIME_TOLERANCE_SECONDS = 1.250
CACHEABLE_CDP_SOURCES = frozenset(
    {"cache_unspecified", "disk_cache", "prefetch_cache", "early_hints_cache"}
)
CACHE_HIT_ASSOCIATION_MARGIN_SECONDS = 0.030
CommandRunner = Callable[[Sequence[str], Path, Mapping[str, str]], int]


class AccessLogEvidenceError(ValueError):
    """A bounded, sanitized failure while collecting or validating Caddy evidence."""


@dataclass(frozen=True, repr=False)
class CaddyAccessRecord:
    method: str
    authority: str
    uri: str
    status: int
    started_at: float


AccessLogReader = Callable[[Path, str, Path | None, datetime], list[CaddyAccessRecord]]


@dataclass(frozen=True)
class AccessLogReconciliation:
    complete: bool
    matched_access_records: int
    unmatched_access_records: int
    ambiguous: int
    wire_304_responses: int
    wire_304_ambiguous: int
    cache_skipped_confirmed: int
    cache_evidence_ambiguous: int
    cache_hits_confirmed: int = 0
    unmatched_capture_requests: int = 0
    unmatched_identity: int = 0
    unmatched_timing: int = 0
    unmatched_competing: int = 0
    route_diagnostics: tuple[str, ...] = ()
    failure_reason: str | None = None


def _expected_authority(expected_origin: str) -> str:
    try:
        parsed = urlsplit(expected_origin)
        port = parsed.port
    except ValueError as exc:
        raise AccessLogEvidenceError("invalid_expected_origin") from exc
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
        raise AccessLogEvidenceError("invalid_expected_origin")
    return f"localhost:{port}"


def _normalize_uri_path_and_query(value: str) -> str:
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc or parsed.fragment or not value.startswith("/"):
        raise AccessLogEvidenceError("invalid_access_uri")
    path = parsed.path or "/"
    return path + (f"?{parsed.query}" if parsed.query else "")


def _candidate_identity(
    candidate: Mapping[str, object], *, expected_authority: str
) -> tuple[str, str, str, float, str]:
    method = candidate.get("method")
    raw_url = candidate.get("url")
    timestamp = candidate.get("started_at")
    if not isinstance(method, str) or not method or not isinstance(raw_url, str):
        raise AccessLogEvidenceError("invalid_candidate_metadata")
    try:
        parsed = urlsplit(raw_url)
        port = parsed.port
    except ValueError as exc:
        raise AccessLogEvidenceError("invalid_candidate_metadata") from exc
    if (
        parsed.scheme != "https"
        or parsed.hostname is None
        or parsed.hostname.casefold() != "localhost"
        or port is None
        or parsed.username is not None
        or parsed.password is not None
        or parsed.fragment
        or f"localhost:{port}" != expected_authority
    ):
        raise AccessLogEvidenceError("origin_mismatch")
    if isinstance(timestamp, bool):
        raise AccessLogEvidenceError("invalid_candidate_timestamp")
    if isinstance(timestamp, str):
        try:
            parsed_timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            if parsed_timestamp.tzinfo is None:
                raise ValueError
            started_at = parsed_timestamp.astimezone(timezone.utc).timestamp()
        except ValueError as exc:
            raise AccessLogEvidenceError("invalid_candidate_timestamp") from exc
    elif isinstance(timestamp, (int, float)) and math.isfinite(float(timestamp)):
        started_at = float(timestamp)
        # CDP timestamps may be expressed as epoch milliseconds in the sidecar.
        if started_at > 100_000_000_000:
            started_at /= 1000
    else:
        raise AccessLogEvidenceError("invalid_candidate_timestamp")
    uri = _normalize_uri_path_and_query(f"{parsed.path or '/'}?{parsed.query}" if parsed.query else parsed.path or "/")
    return method, expected_authority, uri, started_at


def _is_explicit_local_mock(request: Mapping[str, object], response: Mapping[str, object]) -> bool:
    headers = response.get("headers")
    if not isinstance(headers, list):
        return False
    marker_values = [
        header.get("value")
        for header in headers
        if isinstance(header, Mapping)
        and isinstance(header.get("name"), str)
        and header["name"].casefold() == "x-lab-solos-e2e-local-mock"
    ]
    if not marker_values:
        return False
    raw_url = request.get("url")
    try:
        path = urlsplit(raw_url).path if isinstance(raw_url, str) else None
    except ValueError as exc:
        raise AccessLogEvidenceError("capture_har_invalid") from exc
    if marker_values != ["csp-dynamic-eval-probe"] or path != "/csp-dynamic-eval-probe.js":
        raise AccessLogEvidenceError("capture_sidecar_conflict")
    return True


def parse_caddy_access_log_lines(lines: Iterable[str]) -> list[CaddyAccessRecord]:
    """Keep only bounded request fields from Caddy JSON; never return raw log data."""
    records: list[CaddyAccessRecord] = []
    consumed_bytes = 0
    for line in lines:
        if not isinstance(line, str):
            raise AccessLogEvidenceError("invalid_access_log_record")
        try:
            encoded_size = len(line.encode("utf-8", errors="strict"))
        except UnicodeEncodeError as exc:
            raise AccessLogEvidenceError("invalid_access_log_encoding") from exc
        consumed_bytes += encoded_size
        if encoded_size > MAX_ACCESS_LOG_LINE_BYTES or consumed_bytes > MAX_ACCESS_LOG_BYTES:
            raise AccessLogEvidenceError("access_log_limit_exceeded")
        try:
            event = json.loads(line)
        except json.JSONDecodeError as exc:
            if "http.log.access" in line or "handled request" in line:
                raise AccessLogEvidenceError("invalid_access_log_json") from exc
            continue
        if not isinstance(event, Mapping):
            continue
        logger = event.get("logger")
        if not isinstance(logger, str) or not logger.startswith("http.log.access"):
            continue
        request = event.get("request")
        if not isinstance(request, Mapping):
            raise AccessLogEvidenceError("invalid_access_log_request")
        method = request.get("method")
        host = request.get("host")
        uri = request.get("uri")
        status = event.get("status")
        timestamp = event.get("ts")
        duration = event.get("duration")
        if not isinstance(method, str) or not method:
            raise AccessLogEvidenceError("invalid_access_log_method")
        if not isinstance(host, str) or not host:
            raise AccessLogEvidenceError("invalid_access_log_host")
        if not isinstance(uri, str) or not uri.startswith("/"):
            raise AccessLogEvidenceError("invalid_access_log_uri")
        # Caddy records status 0 when the request ends before an HTTP response
        # is written. Keep that evidence so reconciliation can fail the capture
        # as an unmatched request or a status conflict instead of hiding it as
        # malformed input.
        if (
            isinstance(status, bool)
            or not isinstance(status, int)
            or (status != 0 and not 100 <= status <= 599)
        ):
            raise AccessLogEvidenceError("invalid_access_log_status")
        if (
            isinstance(timestamp, bool)
            or not isinstance(timestamp, (int, float))
            or not math.isfinite(float(timestamp))
            or isinstance(duration, bool)
            or not isinstance(duration, (int, float))
            or not math.isfinite(float(duration))
            or float(duration) < 0
        ):
            raise AccessLogEvidenceError("invalid_access_log_timing")
        try:
            host_parsed = urlsplit(f"//{host}")
            if host_parsed.username is not None or host_parsed.password is not None:
                raise ValueError
            host_authority = f"{host_parsed.hostname}:{host_parsed.port}" if host_parsed.port else host_parsed.hostname
        except ValueError as exc:
            raise AccessLogEvidenceError("invalid_access_log_host") from exc
        if not host_authority:
            raise AccessLogEvidenceError("invalid_access_log_host")
        try:
            normalized_uri = _normalize_uri_path_and_query(uri)
        except (AccessLogEvidenceError, ValueError) as exc:
            raise AccessLogEvidenceError("invalid_access_log_uri") from exc
        records.append(
            CaddyAccessRecord(
                method=method,
                authority=host_authority.casefold(),
                uri=normalized_uri,
                status=status,
                started_at=float(timestamp) - float(duration),
            )
        )
        if len(records) > MAX_ACCESS_LOG_RECORDS:
            raise AccessLogEvidenceError("access_log_limit_exceeded")
    return records


def reconcile_caddy_access_logs(
    observations: Sequence[Mapping[str, object]],
    access_records: Sequence[CaddyAccessRecord],
    *,
    expected_origin: str,
    tolerance_seconds: float = ACCESS_LOG_TIME_TOLERANCE_SECONDS,
) -> AccessLogReconciliation:
    """Correlate exact request identity and time; ambiguous evidence never passes."""
    if (
        isinstance(tolerance_seconds, bool)
        or not isinstance(tolerance_seconds, (int, float))
        or not math.isfinite(float(tolerance_seconds))
        or tolerance_seconds < 0
    ):
        raise AccessLogEvidenceError("invalid_correlation_window")
    expected_authority = _expected_authority(expected_origin)
    identities = [
        _candidate_identity(item, expected_authority=expected_authority)
        for item in observations
    ]
    observations_by_identity: dict[tuple[str, str, str], list[int]] = {}
    logs_by_identity: dict[tuple[str, str, str], list[int]] = {}
    for observation_index, identity in enumerate(identities):
        observations_by_identity.setdefault(identity[:3], []).append(observation_index)
    wire_304 = 0
    wire_304_ambiguous = 0
    ambiguous = 0
    unmatched_logs = 0
    unmatched_observations = 0
    unmatched_identity = 0
    unmatched_timing = 0
    unmatched_competing = 0
    cache_evidence_ambiguous = 0
    route_diagnostic_counts: dict[str, int] = {}
    cache_collision_observations: set[int] = set()
    matched_log_to_observation: dict[int, int] = {}
    matched_observation_to_log: dict[int, int] = {}
    for log_index, record in enumerate(access_records):
        if record.status == 304:
            wire_304 += 1
        if record.authority.casefold() != expected_authority.casefold():
            unmatched_logs += 1
            if record.status == 304:
                wire_304_ambiguous += 1
            continue
        logs_by_identity.setdefault(
            (record.method, expected_authority, record.uri), []
        ).append(log_index)

    # A route may be requested repeatedly within the clock tolerance. Match the
    # whole identity group one-to-one by the lowest total time delta instead of
    # letting every access record claim every nearby HAR entry. A tied optimum
    # remains ambiguous and fails closed.
    for identity_key in set(observations_by_identity) | set(logs_by_identity):
        observation_indexes = observations_by_identity.get(identity_key, [])
        log_indexes = logs_by_identity.get(identity_key, [])
        retained_indexes = [
            index for index in observation_indexes
            if observations[index].get("skipped") is not True
            and observations[index].get("cache_hit") is not True
        ]
        ordered_observations = sorted(retained_indexes, key=lambda index: identities[index][3])
        ordered_logs = sorted(log_indexes, key=lambda index: access_records[index].started_at)

        path = urlsplit(identity_key[2]).path
        route_fingerprint = hashlib.sha256(
            f"{identity_key[0]}\0{path}".encode("utf-8")
        ).hexdigest()[:10]

        @lru_cache(maxsize=None)
        def best_matches(
            i: int, j: int
        ) -> tuple[int, int, float, tuple[tuple[tuple[int, int], ...], ...]]:
            if i == len(ordered_observations) or j == len(ordered_logs):
                return 0, 0, 0.0, ((),)

            options: list[
                tuple[int, int, float, tuple[tuple[tuple[int, int], ...], ...]]
            ] = [
                best_matches(i + 1, j),
                best_matches(i, j + 1),
            ]
            observation_index = ordered_observations[i]
            log_index = ordered_logs[j]
            delta = abs(identities[observation_index][3] - access_records[log_index].started_at)
            if delta <= tolerance_seconds:
                count, status_mismatches, cost, paths = best_matches(i + 1, j + 1)
                observation_status = observations[observation_index].get("status")
                options.append(
                    (
                        count + 1,
                        status_mismatches
                        + int(
                            isinstance(observation_status, int)
                            and not isinstance(observation_status, bool)
                            and observation_status != access_records[log_index].status
                        ),
                        cost + delta,
                        tuple(
                            ((observation_index, log_index),) + path
                            for path in paths
                        ),
                    )
                )

            max_count = max(option[0] for option in options)
            min_status_mismatches = min(
                option[1] for option in options if option[0] == max_count
            )
            min_cost = min(
                option[2]
                for option in options
                if option[0] == max_count
                and option[1] == min_status_mismatches
            )
            paths: list[tuple[tuple[int, int], ...]] = []
            for count, status_mismatches, cost, option_paths in options:
                if (
                    count != max_count
                    or status_mismatches != min_status_mismatches
                    or abs(cost - min_cost) > 1e-9
                ):
                    continue
                for path in option_paths:
                    if path not in paths:
                        paths.append(path)
                        if len(paths) == 2:
                            break
                if len(paths) == 2:
                    break
            return max_count, min_status_mismatches, min_cost, tuple(paths)

        _count, _status_mismatches, _cost, optimal_paths = best_matches(0, 0)
        if len(optimal_paths) > 1:
            ambiguous += 1
            route_diagnostic_counts[f"ambiguous:{route_fingerprint}"] = len(log_indexes)
            if any(access_records[index].status == 304 for index in log_indexes):
                wire_304_ambiguous += 1
            continue
        for observation_index, log_index in optimal_paths[0]:
            matched_observation_to_log[observation_index] = log_index
            matched_log_to_observation[log_index] = observation_index
            observation_status = observations[observation_index].get("status")
            if (
                isinstance(observation_status, int)
                and not isinstance(observation_status, bool)
                and observation_status != access_records[log_index].status
            ):
                key = f"status_mismatch:{route_fingerprint}"
                route_diagnostic_counts[key] = route_diagnostic_counts.get(key, 0) + 1
        unmatched_in_group = [
            index for index in log_indexes if index not in matched_log_to_observation
        ]
        unmatched_logs += len(unmatched_in_group)
        for index in unmatched_in_group:
            record = access_records[index]
            close_observations = [
                observation_index for observation_index in observation_indexes
                if abs(identities[observation_index][3] - record.started_at)
                <= tolerance_seconds
            ]
            if not observation_indexes:
                unmatched_identity += 1
                diagnostic = "unmatched_identity"
            elif not close_observations:
                unmatched_timing += 1
                diagnostic = "unmatched_timing"
                nearest_delta_ms = round(
                    min(
                        abs(identities[observation_index][3] - record.started_at)
                        for observation_index in observation_indexes
                    )
                    * 1000
                )
                route_diagnostic_counts[
                    f"timing_miss_ms:{route_fingerprint}"
                ] = nearest_delta_ms
            else:
                unmatched_competing += 1
                diagnostic = "unmatched_competing"
            key = f"{diagnostic}:{route_fingerprint}"
            route_diagnostic_counts[key] = route_diagnostic_counts.get(key, 0) + 1
        unmatched_observations += len(retained_indexes) - sum(
            1 for index in retained_indexes if index in matched_observation_to_log
        )
        unmatched_capture_indexes = [
            index for index in retained_indexes
            if index not in matched_observation_to_log
        ]
        if unmatched_in_group or unmatched_capture_indexes:
            capture_statuses: dict[int, int] = {}
            proxy_statuses: dict[int, int] = {}
            for observation_index in retained_indexes:
                status = observations[observation_index].get("status")
                if isinstance(status, int) and not isinstance(status, bool):
                    capture_statuses[status] = capture_statuses.get(status, 0) + 1
            for log_index in log_indexes:
                status = access_records[log_index].status
                proxy_statuses[status] = proxy_statuses.get(status, 0) + 1
            capture_status_summary = ",".join(
                f"{status}x{count}" for status, count in sorted(capture_statuses.items())
            ) or "none"
            proxy_status_summary = ",".join(
                f"{status}x{count}" for status, count in sorted(proxy_statuses.items())
            ) or "none"
            group_key = (
                f"group:{route_fingerprint}:capture={len(retained_indexes)}:"
                f"proxy={len(log_indexes)}:capture_statuses={capture_status_summary}:"
                f"proxy_statuses={proxy_status_summary}"
            )
            route_diagnostic_counts[group_key] = 1
        for observation_index in retained_indexes:
            if observation_index in matched_observation_to_log:
                continue
            if not log_indexes:
                diagnostic = "unmatched_capture_no_access"
            elif not any(
                abs(identities[observation_index][3] - access_records[index].started_at)
                <= tolerance_seconds
                for index in log_indexes
            ):
                diagnostic = "unmatched_capture_timing"
                nearest_delta_ms = round(
                    min(
                        abs(identities[observation_index][3] - access_records[index].started_at)
                        for index in log_indexes
                    )
                    * 1000
                )
                route_diagnostic_counts[
                    f"capture_timing_miss_ms:{route_fingerprint}"
                ] = nearest_delta_ms
            else:
                diagnostic = "unmatched_capture_competing"
            key = f"{diagnostic}:{route_fingerprint}"
            route_diagnostic_counts[key] = route_diagnostic_counts.get(key, 0) + 1
        if any(
            access_records[index].status == 304 and index not in matched_log_to_observation
            for index in log_indexes
        ):
            wire_304_ambiguous += 1

        for observation_index in observation_indexes:
            item = observations[observation_index]
            if (
                item.get("skipped") is not True
                and item.get("cache_hit") is not True
            ):
                continue
            cache_timestamp = identities[observation_index][3]
            collision = False
            for log_index in log_indexes:
                cache_delta = abs(access_records[log_index].started_at - cache_timestamp)
                if cache_delta > tolerance_seconds:
                    continue
                matched_network_observation = matched_log_to_observation.get(log_index)
                if matched_network_observation is None:
                    collision = True
                    break
                network_delta = abs(
                    access_records[log_index].started_at
                    - identities[matched_network_observation][3]
                )
                if network_delta + CACHE_HIT_ASSOCIATION_MARGIN_SECONDS >= cache_delta:
                    collision = True
                    break
            if collision:
                ambiguous += 1
                cache_collision_observations.add(observation_index)
                key = f"cache_skipped_collision:{route_fingerprint}"
                route_diagnostic_counts[key] = route_diagnostic_counts.get(key, 0) + 1
                cache_evidence_ambiguous += 1

    cache_skipped_confirmed = 0
    cache_hits_confirmed = 0
    conflict_count = 0
    for observation_index, item in enumerate(observations):
        matched_log = matched_observation_to_log.get(observation_index)
        matched_logs = [matched_log] if matched_log is not None else []
        skipped = item.get("skipped") is True
        cache_source = item.get("cache_source")
        body_unavailable = item.get("body_unavailable") is True
        cache_event = item.get("cache_event_observed") is True
        cache_hit = item.get("cache_hit") is True
        if skipped or cache_hit:
            if observation_index in cache_collision_observations:
                conflict_count += 1
                continue
            cache_source_is_reliable = (
                cache_source in CACHEABLE_CDP_SOURCES
                and (
                    cache_source != "cache_unspecified"
                    or cache_event is True
                )
                and item.get("response_extra_info") != "status304"
                and item.get("loading_finished") is True
                and item.get("status") != 304
            )
            if (
                (skipped and not body_unavailable)
                or not cache_source_is_reliable
                or matched_logs
            ):
                cache_evidence_ambiguous += 1
                conflict_count += int(bool(matched_logs))
            else:
                cache_hits_confirmed += 1
                cache_skipped_confirmed += int(skipped)
        elif matched_logs:
            matched = access_records[matched_log]
            if matched.status != 304:
                status = item.get("status")
                if isinstance(status, int) and not isinstance(status, bool) and status != matched.status:
                    conflict_count += 1
            if (
                cache_source in {"disk_cache", "prefetch_cache", "early_hints_cache"}
                or (cache_source == "cache_unspecified" and cache_event is True)
            ):
                cache_evidence_ambiguous += 1
                conflict_count += 1
        elif not skipped:
            conflict_count += 1

    if cache_hits_confirmed and wire_304:
        cache_evidence_ambiguous += cache_hits_confirmed
        conflict_count += 1
    complete = not (
        unmatched_logs
        or unmatched_observations
        or ambiguous
        or conflict_count
        or wire_304_ambiguous
        or cache_evidence_ambiguous
        or (
            any(
                item.get("skipped") is not True
                and item.get("cache_hit") is not True
                for item in observations
            )
            and not access_records
        )
    )
    matched_access_records = len(matched_log_to_observation)
    return AccessLogReconciliation(
        complete=complete,
        matched_access_records=matched_access_records,
        unmatched_access_records=unmatched_logs,
        unmatched_capture_requests=unmatched_observations,
        unmatched_identity=unmatched_identity,
        unmatched_timing=unmatched_timing,
        unmatched_competing=unmatched_competing,
        route_diagnostics=tuple(sorted(
            f"{key}={count}" for key, count in route_diagnostic_counts.items()
        )),
        ambiguous=ambiguous,
        wire_304_responses=wire_304,
        wire_304_ambiguous=wire_304_ambiguous,
        cache_skipped_confirmed=cache_skipped_confirmed,
        cache_evidence_ambiguous=cache_evidence_ambiguous,
        cache_hits_confirmed=cache_hits_confirmed,
    )


def read_compose_caddy_access_logs(
    compose_file: Path,
    project_name: str,
    compose_override: Path | None,
    since: datetime,
) -> list[CaddyAccessRecord]:
    """Read the current proxy access records into memory without exposing raw logs."""
    if (
        not project_name
        or not project_name[0].isalnum()
        or len(project_name) > 63
        or not all(
        char.isalnum() or char in "-_" for char in project_name
        )
    ):
        raise AccessLogEvidenceError("invalid_compose_project")
    command = [
        "docker",
        "compose",
        "--project-name",
        project_name,
        "--file",
        str(compose_file),
    ]
    if compose_override:
        command.extend(["--file", str(compose_override)])
    command.extend(
        [
            "logs",
            "--since",
            since.astimezone(timezone.utc).isoformat(timespec="microseconds"),
            "--no-color",
            "--no-log-prefix",
            "proxy",
        ]
    )
    try:
        completed = subprocess.run(
            command,
            cwd=ROOT,
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            encoding="utf-8",
            errors="strict",
            timeout=ACCESS_LOG_TIMEOUT_SECONDS,
        )
    except (OSError, subprocess.SubprocessError, UnicodeError) as exc:
        raise AccessLogEvidenceError("access_log_unavailable") from exc
    if completed.returncode != 0:
        raise AccessLogEvidenceError("access_log_unavailable")
    try:
        raw_size = len(completed.stdout.encode("utf-8", errors="strict"))
    except UnicodeEncodeError as exc:
        raise AccessLogEvidenceError("invalid_access_log_encoding") from exc
    if raw_size > MAX_ACCESS_LOG_BYTES:
        raise AccessLogEvidenceError("access_log_limit_exceeded")
    try:
        records = parse_caddy_access_log_lines(completed.stdout.splitlines())
    finally:
        # Do not retain the raw Docker output after extracting allowlisted fields.
        completed.stdout = ""
    if not records:
        raise AccessLogEvidenceError("access_log_missing")
    return records


def _is_nonnegative_int(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value >= 0


def _load_capture_observations(
    capture_dir: Path, *, expected_origin: str
) -> tuple[list[dict[str, object]], list[Path], int, int, int, int]:
    """Load minimal HAR identity plus temporary candidate metadata, never headers/bodies."""
    expected_authority = _expected_authority(expected_origin)
    source_dirs = {
        "browser": capture_dir / "browser",
        "api_request_context": capture_dir / "api-request-context",
    }
    observations: list[dict[str, object]] = []
    status_paths: list[Path] = []
    cache_skipped_total = 0
    wire_304_total = 0
    wire_304_ambiguous_total = 0
    cache_evidence_ambiguous_total = 0
    allowed_cache_sources = CACHEABLE_CDP_SOURCES | {
        "network",
        "service_worker",
        "metadata_missing",
        "ambiguous",
    }
    allowed_resource_types = {
        "Document", "Stylesheet", "Image", "Media", "Font", "Script",
        "TextTrack", "XHR", "Fetch", "Prefetch", "EventSource", "WebSocket",
        "Manifest", "SignedExchange", "Ping", "CSPViolationReport", "Preflight",
        "FedCM", "Other", "unknown",
    }
    required_candidate_fields = {
        "original_entry_index", "har_entry_index", "method", "url", "response_status", "started_at",
        "cache_source", "body_unavailable", "skipped", "cache_event_observed",
        "has_extra_info", "response_extra_info", "resource_type", "loading_finished",
    }
    required_request_evidence_fields = {
        "har_entry_index", "cache_source", "cache_event_observed",
        "has_extra_info", "response_extra_info", "resource_type", "loading_finished",
    }

    for source, directory in source_dirs.items():
        files = sorted(directory.glob("*.status.json")) if directory.is_dir() else []
        if not files:
            raise AccessLogEvidenceError("capture_sidecar_missing")
        for status_path in files:
            try:
                status = json.loads(status_path.read_text(encoding="utf-8"))
            except (OSError, UnicodeError, json.JSONDecodeError) as exc:
                raise AccessLogEvidenceError("capture_sidecar_invalid") from exc
            if not isinstance(status, Mapping):
                raise AccessLogEvidenceError("capture_sidecar_invalid")
            count = status.get("count")
            observed = status.get("observed")
            cache_skipped = status.get("cache_skipped")
            unavailable = status.get("body_unavailable")
            unavailable_skipped = status.get("body_unavailable_cache_skipped")
            wire_304 = status.get("wire_304_responses")
            wire_304_ambiguous = status.get("wire_304_ambiguous")
            cache_ambiguous = status.get("cache_evidence_ambiguous")
            timing_missing = status.get("request_timing_missing")
            failed_messages = status.get("failed_messages")
            candidate_items = status.get("bodyless_cache_candidates")
            candidate_count = status.get("bodyless_cache_candidate_count")
            request_evidence_items = status.get("browser_request_evidence")
            if (
                not _is_nonnegative_int(count)
                or not _is_nonnegative_int(observed)
                or not _is_nonnegative_int(cache_skipped)
                or not _is_nonnegative_int(unavailable)
                or not _is_nonnegative_int(unavailable_skipped)
                or not _is_nonnegative_int(wire_304)
                or not _is_nonnegative_int(wire_304_ambiguous)
                or not _is_nonnegative_int(cache_ambiguous)
                or not _is_nonnegative_int(timing_missing)
                or not _is_nonnegative_int(failed_messages)
                or not _is_nonnegative_int(candidate_count)
                or not isinstance(candidate_items, list)
                or not isinstance(request_evidence_items, list)
                or candidate_count != len(candidate_items)
                or timing_missing != 0
                or status.get("complete") is not True
                or failed_messages != 0
                or count + cache_skipped != observed
                or unavailable_skipped != cache_skipped
            ):
                raise AccessLogEvidenceError("capture_sidecar_invalid")
            har_path = status_path.with_name(status_path.name.removesuffix(".status.json") + ".har")
            entries: list[object] = []
            if count > 0:
                try:
                    document = json.loads(har_path.read_text(encoding="utf-8"))
                except (OSError, UnicodeError, json.JSONDecodeError) as exc:
                    raise AccessLogEvidenceError("capture_har_invalid") from exc
                log = document.get("log") if isinstance(document, Mapping) else None
                raw_entries = log.get("entries") if isinstance(log, Mapping) else None
                if not isinstance(raw_entries, list) or len(raw_entries) != count:
                    raise AccessLogEvidenceError("capture_har_invalid")
                entries = raw_entries
            elif har_path.exists():
                raise AccessLogEvidenceError("capture_har_invalid")

            candidate_by_har_index: dict[int, Mapping[str, object]] = {}
            request_evidence_by_har_index: dict[int, Mapping[str, object]] = {}
            if source == "browser":
                for item in request_evidence_items:
                    if (
                        not isinstance(item, Mapping)
                        or set(item) != required_request_evidence_fields
                    ):
                        raise AccessLogEvidenceError("capture_sidecar_invalid")
                    har_index = item.get("har_entry_index")
                    cache_source = item.get("cache_source")
                    cache_event_observed = item.get("cache_event_observed")
                    has_extra_info = item.get("has_extra_info")
                    response_extra_info = item.get("response_extra_info")
                    resource_type = item.get("resource_type")
                    loading_finished = item.get("loading_finished")
                    if (
                        not _is_nonnegative_int(har_index)
                        or har_index >= count
                        or har_index in request_evidence_by_har_index
                        or cache_source not in allowed_cache_sources
                        or not isinstance(cache_event_observed, bool)
                        or (has_extra_info is not None and not isinstance(has_extra_info, bool))
                        or response_extra_info not in {"status304", "otherStatus", "absent"}
                        or resource_type not in allowed_resource_types
                        or not isinstance(loading_finished, bool)
                    ):
                        raise AccessLogEvidenceError("capture_sidecar_invalid")
                    request_evidence_by_har_index[har_index] = item
                if set(request_evidence_by_har_index) != set(range(count)):
                    raise AccessLogEvidenceError("capture_sidecar_conflict")
            elif request_evidence_items:
                raise AccessLogEvidenceError("capture_sidecar_invalid")
            skipped_for_file = 0
            seen_original_indexes: set[int] = set()
            for item in candidate_items:
                if not isinstance(item, Mapping) or set(item) != required_candidate_fields:
                    raise AccessLogEvidenceError("capture_sidecar_invalid")
                original_index = item.get("original_entry_index")
                har_index = item.get("har_entry_index")
                method = item.get("method")
                raw_url = item.get("url")
                response_status = item.get("response_status")
                started_at = item.get("started_at")
                cache_source = item.get("cache_source")
                body_unavailable = item.get("body_unavailable")
                skipped = item.get("skipped")
                cache_event_observed = item.get("cache_event_observed")
                has_extra_info = item.get("has_extra_info")
                response_extra_info = item.get("response_extra_info")
                resource_type = item.get("resource_type")
                loading_finished = item.get("loading_finished")
                if (
                    not _is_nonnegative_int(original_index)
                    or original_index in seen_original_indexes
                    or not isinstance(method, str)
                    or not method
                    or not isinstance(raw_url, str)
                    or isinstance(response_status, bool)
                    or not isinstance(response_status, int)
                    or not 100 <= response_status <= 599
                    or not isinstance(started_at, str)
                    or cache_source not in allowed_cache_sources
                    or not isinstance(body_unavailable, bool)
                    or not isinstance(skipped, bool)
                    or not isinstance(cache_event_observed, bool)
                    or (has_extra_info is not None and not isinstance(has_extra_info, bool))
                    or response_extra_info not in {"status304", "otherStatus", "absent"}
                    or resource_type not in allowed_resource_types
                    or not isinstance(loading_finished, bool)
                ):
                    raise AccessLogEvidenceError("capture_sidecar_invalid")
                identity = _candidate_identity(item, expected_authority=expected_authority)
                seen_original_indexes.add(original_index)
                if skipped:
                    if (
                        har_index is not None
                        or not body_unavailable
                        or not loading_finished
                        or has_extra_info is None
                        or (not has_extra_info and response_extra_info != "absent")
                        or response_status == 304
                        or response_extra_info == "status304"
                    ):
                        raise AccessLogEvidenceError("capture_sidecar_invalid")
                    skipped_for_file += 1
                    observations.append(
                        {
                            "method": method,
                            "url": raw_url,
                            "status": response_status,
                            "started_at": started_at,
                            "cache_source": cache_source,
                            "body_unavailable": body_unavailable,
                            "skipped": True,
                            "cache_hit": True,
                            "cache_event_observed": cache_event_observed,
                            "has_extra_info": has_extra_info,
                            "response_extra_info": response_extra_info,
                            "loading_finished": loading_finished,
                        }
                    )
                else:
                    if (
                        not _is_nonnegative_int(har_index)
                        or har_index >= len(entries)
                        or har_index in candidate_by_har_index
                    ):
                        raise AccessLogEvidenceError("capture_sidecar_invalid")
                    candidate_by_har_index[har_index] = item
                    entry = entries[har_index]
                    request = entry.get("request") if isinstance(entry, Mapping) else None
                    response = entry.get("response") if isinstance(entry, Mapping) else None
                    har_identity = {
                        "method": request.get("method") if isinstance(request, Mapping) else None,
                        "url": request.get("url") if isinstance(request, Mapping) else None,
                        "started_at": entry.get("startedDateTime") if isinstance(entry, Mapping) else None,
                    }
                    har_status = response.get("status") if isinstance(response, Mapping) else None
                    har_key = _candidate_identity(har_identity, expected_authority=expected_authority)
                    if (
                        har_key[:3] != identity[:3]
                        or abs(har_key[3] - identity[3]) > ACCESS_LOG_TIME_TOLERANCE_SECONDS
                        or har_status != response_status
                    ):
                        raise AccessLogEvidenceError("capture_sidecar_conflict")
            if skipped_for_file != cache_skipped:
                raise AccessLogEvidenceError("capture_sidecar_conflict")
            status_paths.append(status_path)
            cache_skipped_total += cache_skipped
            wire_304_total += wire_304
            wire_304_ambiguous_total += wire_304_ambiguous
            cache_evidence_ambiguous_total += cache_ambiguous

            for entry_index, entry in enumerate(entries):
                if not isinstance(entry, Mapping):
                    raise AccessLogEvidenceError("capture_har_invalid")
                request = entry.get("request")
                response = entry.get("response")
                if not isinstance(request, Mapping) or not isinstance(response, Mapping):
                    raise AccessLogEvidenceError("capture_har_invalid")
                method = request.get("method")
                raw_url = request.get("url")
                started_at = entry.get("startedDateTime")
                status_code = response.get("status")
                if (
                    not isinstance(method, str)
                    or not method
                    or not isinstance(raw_url, str)
                    or isinstance(status_code, bool)
                    or not isinstance(status_code, int)
                    or not 100 <= status_code <= 599
                ):
                    raise AccessLogEvidenceError("capture_har_invalid")
                if _is_explicit_local_mock(request, response):
                    continue
                observation: dict[str, object] = {
                    "method": method,
                    "url": raw_url,
                    "started_at": started_at,
                    "status": status_code,
                    "cache_source": "network",
                    "body_unavailable": False,
                    "skipped": False,
                    "cache_hit": False,
                    "cache_event_observed": False,
                    "has_extra_info": None,
                    "response_extra_info": "absent",
                    "resource_type": "unknown",
                    "loading_finished": True,
                }
                if source == "browser":
                    evidence = request_evidence_by_har_index[entry_index]
                    observation.update(
                        cache_source=evidence["cache_source"],
                        cache_event_observed=evidence["cache_event_observed"],
                        has_extra_info=evidence["has_extra_info"],
                        response_extra_info=evidence["response_extra_info"],
                        resource_type=evidence["resource_type"],
                        loading_finished=evidence["loading_finished"],
                    )
                    observation["cache_hit"] = (
                        evidence["cache_source"] in CACHEABLE_CDP_SOURCES
                        and (
                            evidence["cache_source"] != "cache_unspecified"
                            or evidence["cache_event_observed"] is True
                        )
                        and evidence["response_extra_info"] != "status304"
                        and evidence["loading_finished"] is True
                        and status_code != 304
                    )
                candidate = candidate_by_har_index.get(entry_index)
                if candidate:
                    for key in (
                        "cache_source", "body_unavailable", "cache_event_observed",
                        "response_extra_info", "started_at",
                    ):
                        observation[key] = candidate[key]
                _candidate_identity(observation, expected_authority=expected_authority)
                observations.append(observation)
    if not status_paths:
        raise AccessLogEvidenceError("capture_sidecar_missing")
    return (
        observations,
        status_paths,
        cache_skipped_total,
        wire_304_total,
        wire_304_ambiguous_total,
        cache_evidence_ambiguous_total,
    )


def mark_capture_incomplete(capture_dir: Path) -> bool:
    """Turn readable sidecars into a checker-visible failure, reporting write failures."""
    persisted = True
    for status_path in capture_dir.glob("*/*.status.json"):
        try:
            status = json.loads(status_path.read_text(encoding="utf-8"))
            if not isinstance(status, dict):
                continue
            if status.get("complete") is False:
                continue
            status["complete"] = False
            status_path.write_text(json.dumps(status, separators=(",", ":")), encoding="utf-8")
        except (OSError, UnicodeError, json.JSONDecodeError):
            persisted = False
            continue
    return persisted


def write_capture_failure_report(report_path: Path) -> bool:
    """Write a minimal allowlisted failure report if a sidecar cannot be invalidated."""
    report = {
        "schema_version": 1,
        "status": "inconclusive",
        "reason": "capture_incomplete",
        "messages": {
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
        },
        "processing_seconds": None,
        "alerts": [],
    }
    try:
        serialized = json.dumps(report, indent=2, sort_keys=True) + "\n"
        report_path.write_text(serialized, encoding="utf-8")
        return json.loads(report_path.read_text(encoding="utf-8")) == report
    except (OSError, UnicodeError, json.JSONDecodeError):
        return False


def reconcile_capture_directory(
    capture_dir: Path,
    access_records: Sequence[CaddyAccessRecord],
    *,
    expected_origin: str,
) -> AccessLogReconciliation:
    """Validate sidecars and Caddy evidence, then leave only aggregate state in memory."""
    try:
        (
            observations,
            _status_paths,
            cache_skipped,
            cdp_304,
            cdp_304_ambiguous,
            cache_ambiguous,
        ) = _load_capture_observations(
            capture_dir, expected_origin=expected_origin
        )
        result = reconcile_caddy_access_logs(
            observations, access_records, expected_origin=expected_origin
        )
        if (
            not result.complete
            or result.cache_skipped_confirmed != cache_skipped
            or result.wire_304_responses != cdp_304
            or cdp_304_ambiguous != 0
            or cache_ambiguous != 0
            or (cache_skipped > 0 and result.wire_304_responses > 0)
        ):
            mark_capture_incomplete(capture_dir)
            return AccessLogReconciliation(
                complete=False,
                matched_access_records=result.matched_access_records,
                unmatched_access_records=result.unmatched_access_records,
                ambiguous=result.ambiguous,
                wire_304_responses=result.wire_304_responses,
                wire_304_ambiguous=max(result.wire_304_ambiguous, cdp_304_ambiguous),
                cache_skipped_confirmed=result.cache_skipped_confirmed,
                cache_hits_confirmed=result.cache_hits_confirmed,
                unmatched_capture_requests=result.unmatched_capture_requests,
                unmatched_identity=result.unmatched_identity,
                unmatched_timing=result.unmatched_timing,
                unmatched_competing=result.unmatched_competing,
                route_diagnostics=result.route_diagnostics,
                cache_evidence_ambiguous=max(
                    result.cache_evidence_ambiguous,
                    int(result.cache_skipped_confirmed != cache_skipped),
                ),
            )
        return result
    except AccessLogEvidenceError as exc:
        mark_capture_incomplete(capture_dir)
        return AccessLogReconciliation(
            complete=False,
            matched_access_records=0,
            unmatched_access_records=0,
            ambiguous=0,
            wire_304_responses=0,
            wire_304_ambiguous=0,
            cache_skipped_confirmed=0,
            cache_evidence_ambiguous=0,
            failure_reason=str(exc),
        )


def expected_origin_from_env(env: Mapping[str, str]) -> str:
    port_value = env.get("SECURITY_E2E_HTTPS_PORT", "18443")
    try:
        port = int(port_value)
    except (TypeError, ValueError) as exc:
        raise AccessLogEvidenceError("invalid_expected_origin") from exc
    if not 1 <= port <= 65535:
        raise AccessLogEvidenceError("invalid_expected_origin")
    origin = f"https://localhost:{port}"
    configured = env.get("SECURITY_E2E_BASE_URL", origin)
    if configured != origin:
        raise AccessLogEvidenceError("invalid_expected_origin")
    _expected_authority(origin)
    return origin


def _run_child(command: Sequence[str], cwd: Path, env: Mapping[str, str]) -> int:
    try:
        process = subprocess.Popen(
            list(command),
            cwd=cwd,
            env=dict(env),
            start_new_session=os.name != "nt",
            creationflags=getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0) if os.name == "nt" else 0,
        )
    except OSError:
        return 127
    try:
        return process.wait()
    except KeyboardInterrupt:
        if os.name == "nt":
            process.send_signal(signal.CTRL_BREAK_EVENT)
        else:
            os.killpg(process.pid, signal.SIGINT)
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            if os.name == "nt":
                process.terminate()
            else:
                os.killpg(process.pid, signal.SIGKILL)
            process.wait()
        raise


def cleanup_capture_directory(directory: Path, *, temp_root: Path | None = None) -> None:
    root = (temp_root or Path(tempfile.gettempdir())).resolve()
    target = directory.resolve()
    if target.parent != root or not target.name.startswith(CAPTURE_PREFIX):
        raise RuntimeError("refusing to remove a capture path outside the per-run temp root")
    if target.exists():
        shutil.rmtree(target)


def run_pipeline(
    *,
    frontend: Path = FRONTEND,
    env: Mapping[str, str] | None = None,
    command_runner: CommandRunner = _run_child,
    temp_root: Path | None = None,
    report_root: Path | None = None,
    compose_override: Path | None = None,
    test_grep: str | None = None,
    compose_project: str | None = None,
    access_log_reader: AccessLogReader = read_compose_caddy_access_logs,
) -> tuple[int, Path]:
    """Run tests and passive scanning with a unique disposable capture tree."""
    temp_directory = (temp_root or Path(os.environ.get("RUNNER_TEMP", tempfile.gettempdir()))).resolve()
    temp_directory.mkdir(parents=True, exist_ok=True)
    capture_dir = Path(tempfile.mkdtemp(prefix=CAPTURE_PREFIX, dir=temp_directory))
    try:
        output_directory = (report_root or temp_directory).resolve()
        output_directory.mkdir(parents=True, exist_ok=True)
        report = output_directory / f"lab-solos-zap-passive-{uuid.uuid4().hex}.json"
        child_env = dict(os.environ if env is None else env)
        child_env["SECURITY_ZAP_CAPTURE_DIR"] = str(capture_dir)
        child_env["SECURITY_ZAP_REPORT"] = str(report)
        capture_started = datetime.now(timezone.utc)
        project_name = (
            compose_project
            or child_env.get("SECURITY_E2E_COMPOSE_PROJECT")
            or child_env.get("COMPOSE_PROJECT_NAME")
            or DEFAULT_COMPOSE_PROJECT
        )
        playwright_command = ["npm", "run", "test:e2e", "--", "--project=security"]
        if test_grep:
            playwright_command.extend(["--grep", test_grep])
        if os.name == "nt":
            playwright_command = ["cmd.exe", "/c", "npm.cmd", *playwright_command[1:]]
        tests_exit = command_runner(playwright_command, frontend, child_env)
        incomplete_marker_persisted = True
        reconciliation: AccessLogReconciliation | None = None
        evidence_error: str | None = None
        try:
            access_records = access_log_reader(
                COMPOSE_FILE, project_name, compose_override, capture_started
            )
            reconciliation = reconcile_capture_directory(
                capture_dir,
                access_records,
                expected_origin=expected_origin_from_env(child_env),
            )
            if not reconciliation.complete:
                incomplete_marker_persisted = mark_capture_incomplete(capture_dir)
        except AccessLogEvidenceError as exc:
            # These error codes are static, allowlisted identifiers. Never echo
            # the Docker log, HAR data, exception cause, or any request content.
            candidate_reason = str(exc)
            evidence_error = (
                candidate_reason
                if candidate_reason.replace("_", "").isalnum()
                else "invalid"
            )
            incomplete_marker_persisted = mark_capture_incomplete(capture_dir)
        if reconciliation is None:
            print(
                "[security-zap-access-log] "
                f"complete=false evidence={evidence_error or 'unknown'}"
            )
        elif reconciliation.failure_reason is not None:
            reason = reconciliation.failure_reason
            safe_reason = reason if reason.replace("_", "").isalnum() else "invalid"
            print(
                "[security-zap-access-log] "
                f"complete=false evidence={safe_reason}"
            )
        else:
            print(
                "[security-zap-access-log] "
                f"complete={str(reconciliation.complete).lower()} "
                f"matched={reconciliation.matched_access_records} "
                f"unmatched={reconciliation.unmatched_access_records} "
                f"unmatched_capture={reconciliation.unmatched_capture_requests} "
                f"unmatched_identity={reconciliation.unmatched_identity} "
                f"unmatched_timing={reconciliation.unmatched_timing} "
                f"unmatched_competing={reconciliation.unmatched_competing} "
                f"ambiguous={reconciliation.ambiguous} "
                f"route_diagnostics={','.join(reconciliation.route_diagnostics) or 'none'} "
                f"cache_skipped_confirmed={reconciliation.cache_skipped_confirmed} "
                f"cache_hits_confirmed={reconciliation.cache_hits_confirmed} "
                f"wire_304={reconciliation.wire_304_responses} "
                f"wire_304_ambiguous={reconciliation.wire_304_ambiguous} "
                f"cache_evidence_ambiguous={reconciliation.cache_evidence_ambiguous}"
            )
        checker_command = [
            sys.executable,
            str(CHECKER),
            "--capture-dir",
            str(capture_dir),
            "--report",
            str(report),
            "--compose-file",
            str(COMPOSE_FILE),
        ]
        if compose_override:
            checker_command.extend(["--compose-override", str(compose_override)])
        if incomplete_marker_persisted:
            scan_exit = command_runner(checker_command, ROOT, child_env)
        else:
            write_capture_failure_report(report)
            scan_exit = 2
        return (tests_exit if tests_exit != 0 else scan_exit), report
    finally:
        cleanup_capture_directory(capture_dir, temp_root=temp_directory)


def _terminate_as_keyboard_interrupt(signum: int, _frame: object) -> None:
    raise KeyboardInterrupt(f"signal {signum}")


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--frontend", type=Path, default=FRONTEND)
    parser.add_argument("--report-root", type=Path)
    parser.add_argument("--compose-override", type=Path)
    parser.add_argument("--compose-project", default=os.environ.get("SECURITY_E2E_COMPOSE_PROJECT"))
    parser.add_argument("--test-grep")
    arguments = parser.parse_args(argv)
    previous_sigterm = signal.signal(signal.SIGTERM, _terminate_as_keyboard_interrupt)
    try:
        exit_code, report = run_pipeline(
            frontend=arguments.frontend,
            report_root=arguments.report_root,
            compose_override=arguments.compose_override,
            test_grep=arguments.test_grep,
            compose_project=arguments.compose_project,
        )
        print(f"sanitized_report={report}")
        return exit_code
    except KeyboardInterrupt:
        print("security E2E cancelled; temporary captures removed")
        return 130
    finally:
        signal.signal(signal.SIGTERM, previous_sigterm)


if __name__ == "__main__":
    sys.exit(main())
