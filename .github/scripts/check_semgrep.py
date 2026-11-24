"""Scan or evaluate Semgrep 1.185.0 results without publishing source excerpts.

Exit 0 means passed, 1 means a blocking finding, and 2 means incomplete analysis.
The scan mode captures raw reports in memory. The evaluate mode requires each
report to be wrapped with the expected module and execution identity.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import signal
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_POLICY = ROOT / ".github/quality/semgrep/policy.json"
MODULES = ("frontend", "backend")
TOKEN = re.compile(r"[A-Za-z0-9][A-Za-z0-9._:-]{0,127}")
SEVERITIES = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}


class InvalidAnalysis(ValueError):
    pass


def unique_fields(pairs: list[tuple[str, object]]) -> dict:
    result = {}
    for key, value in pairs:
        if key in result:
            raise InvalidAnalysis("invalid_json")
        result[key] = value
    return result


def reject_constant(_: str) -> None:
    raise InvalidAnalysis("invalid_json")


def read_json(path: Path) -> dict:
    value = json.loads(path.read_text(encoding="utf-8"),
                       object_pairs_hook=unique_fields, parse_constant=reject_constant)
    if not isinstance(value, dict):
        raise InvalidAnalysis("invalid_json")
    return value


def valid_token(value: object) -> bool:
    return isinstance(value, str) and TOKEN.fullmatch(value) is not None


def relative_path(value: object) -> str:
    if not isinstance(value, str) or not value or "\\" in value or ":" in value:
        raise InvalidAnalysis("invalid_path")
    path = PurePosixPath(value)
    if path.is_absolute() or any(part in ("..", ".") for part in value.split("/")):
        raise InvalidAnalysis("invalid_path")
    if any(ord(character) < 32 for character in value):
        raise InvalidAnalysis("invalid_path")
    return str(path)


def timestamp(value: object) -> datetime:
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ", value):
        raise InvalidAnalysis("invalid_timestamp")
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def load_policy(path: Path) -> tuple[dict, dict]:
    try:
        policy = read_json(path)
        if (not valid_token(policy.get("version"))
                or policy.get("tool_version") != "1.185.0"
                or not isinstance(policy.get("tool_image"), str)
                or not re.fullmatch(r"semgrep/semgrep:1\.185\.0@sha256:[0-9a-f]{64}", policy["tool_image"])
                or policy.get("owner_role") != "CI quality maintainer"
                or policy.get("blocking_severities") != ["HIGH", "CRITICAL"]
                or set(policy.get("modules", {})) != set(MODULES)):
            raise InvalidAnalysis("invalid_policy")
        catalog = {}
        for module in MODULES:
            entry = policy["modules"][module]
            expected_root = "frontend/src" if module == "frontend" else "backend/LabSolos-Server-DotNet8"
            config_name = relative_path(entry["config"])
            if (entry["root"] != expected_root or "/" in config_name
                    or not isinstance(entry.get("exclude"), list)
                    or not all(isinstance(item, str) and item for item in entry["exclude"])):
                raise InvalidAnalysis("invalid_policy")
            config_path = path.parent / config_name
            entry["config_sha256"] = hashlib.sha256(config_path.read_bytes()).hexdigest()
            rules = read_json(config_path)["rules"]
            if not isinstance(rules, list) or not rules:
                raise InvalidAnalysis("invalid_policy")
            for rule in rules:
                rule_id = rule["id"]
                metadata = rule["metadata"]
                alternatives = rule.get("pattern-either", [{"pattern": rule.get("pattern")}])
                if (not valid_token(rule_id) or rule_id in catalog
                        or not rule_id.startswith(f"labon.{module}.")
                        or rule["severity"] not in ("ERROR", "WARNING", "INFO")
                        or metadata["security-severity"] not in SEVERITIES
                        or metadata["confidence"] not in ("LOW", "MEDIUM", "HIGH")
                        or type(metadata["blocking-approved"]) is not bool
                        or not isinstance(rule.get("languages"), list) or not rule["languages"]
                        or not isinstance(alternatives, list) or not alternatives
                        or not all(isinstance(pattern, dict)
                                   and isinstance(pattern.get("pattern"), str)
                                   and pattern["pattern"].strip() for pattern in alternatives)):
                    raise InvalidAnalysis("invalid_policy")
                catalog[rule_id] = {
                    "module": module, "severity": metadata["security-severity"],
                    "confidence": metadata["confidence"],
                    "confirmed": metadata["blocking-approved"],
                    "scanner_severity": rule["severity"],
                }
        return policy, catalog
    except (OSError, ValueError, KeyError, TypeError, AttributeError):
        raise InvalidAnalysis("invalid_policy") from None


def load_exceptions(path: Path, policy: dict, catalog: dict, now: datetime) -> list[dict]:
    try:
        document = read_json(path)
        if document.get("version") != policy["version"] or not isinstance(document.get("exceptions"), list):
            raise InvalidAnalysis("invalid_exceptions")
        records = []
        seen = set()
        for item in document["exceptions"]:
            rule = catalog[item["rule"]]
            path_value = relative_path(item["path"])
            created, expires = timestamp(item["created_at"]), timestamp(item["expires_at"])
            if (not valid_token(item["id"]) or item["id"] in seen
                    or not isinstance(item.get("approver"), str) or not item["approver"].strip()
                    or not isinstance(item.get("justification"), str) or not item["justification"].strip()
                    or not path_value.startswith(policy["modules"][rule["module"]]["root"] + "/")
                    or any(character in path_value for character in "*?[]")
                    or not timedelta(0) < expires - created <= timedelta(days=30)):
                raise InvalidAnalysis("invalid_exceptions")
            seen.add(item["id"])
            status = "valid"
            if now >= expires:
                status = "expired"
            elif now < created:
                status = "pending"
            records.append({
                "id": item["id"], "rule": item["rule"], "path": path_value,
                "expires_at": item["expires_at"], "status": status,
            })
        return records
    except (OSError, ValueError, KeyError, TypeError, AttributeError):
        raise InvalidAnalysis("invalid_exceptions") from None


def evaluate_module(module: str, wrapper: dict, identity: dict, policy: dict,
                    catalog: dict, exceptions: list[dict]) -> dict:
    if (wrapper.get("module") != module
            or any(type(wrapper.get(key)) is not type(value) or wrapper.get(key) != value
                   for key, value in identity.items())
            or wrapper.get("policy_version") != policy["version"]
            or wrapper.get("config_sha256") != policy["modules"][module]["config_sha256"]
            or type(wrapper.get("scanner_exit_code")) is not int
            or wrapper["scanner_exit_code"] != 0):
        raise InvalidAnalysis("execution_mismatch_or_interrupted")
    report = wrapper.get("report")
    if (not isinstance(report, dict) or report.get("version") != policy["tool_version"]
            or report.get("errors") != [] or not isinstance(report.get("results"), list)):
        raise InvalidAnalysis("invalid_scanner_report")
    scanned = report.get("paths", {}).get("scanned")
    if not isinstance(scanned, list) or not scanned:
        raise InvalidAnalysis("empty_scan")
    prefix = policy["modules"][module]["root"] + "/"
    paths = {relative_path(path) for path in scanned}
    if not all(path.startswith(prefix) for path in paths):
        raise InvalidAnalysis("module_scope_mismatch")
    findings = []
    for finding in report["results"]:
        rule_id = finding.get("check_id")
        rule = catalog.get(rule_id)
        path = relative_path(finding.get("path"))
        line = finding.get("start", {}).get("line")
        extra = finding.get("extra", {})
        if (rule is None or rule["module"] != module or path not in paths
                or type(line) is not int or line < 1
                or extra.get("severity") != rule["scanner_severity"]):
            raise InvalidAnalysis("invalid_finding")
        exception = next((item for item in exceptions if item["rule"] == rule_id
                          and item["path"] == path and item["status"] == "valid"), None)
        blocking = (rule["severity"] in policy["blocking_severities"]
                    and rule["confidence"] == "HIGH" and rule["confirmed"])
        status = "review"
        if exception:
            status = "excepted"
        elif blocking:
            status = "blocking"
        normalized = {
            "rule": rule_id, "path": path, "line": line,
            "severity": rule["severity"], "status": status,
        }
        if exception:
            normalized["exception_id"] = exception["id"]
        findings.append(normalized)
    return {
        "status": "failed" if any(item["status"] == "blocking" for item in findings) else "passed",
        "scanned_file_count": len(paths), "config_sha256": policy["modules"][module]["config_sha256"],
        "findings": findings,
    }


def scan_module(module: str, arguments: argparse.Namespace, identity: dict, policy: dict) -> dict:
    entry = policy["modules"][module]
    command = [
        arguments.semgrep, "scan", "--json", "--metrics=off", "--disable-version-check",
        "--disable-nosem", "--strict", "--oss-only", "--no-git-ignore", "--no-rewrite-rule-ids",
        "--config", str(arguments.policy.resolve().parent / entry["config"]),
    ]
    for pattern in entry["exclude"]:
        command.extend(("--exclude", pattern))
    command.append(entry["root"])
    try:
        with subprocess.Popen(command, cwd=arguments.repo_root, stdout=subprocess.PIPE,
                              stderr=subprocess.PIPE, text=True, encoding="utf-8",
                              start_new_session=os.name == "posix") as process:
            try:
                stdout, _ = process.communicate(timeout=180)
            except subprocess.TimeoutExpired:
                if os.name == "posix":
                    os.killpg(process.pid, signal.SIGKILL)
                else:
                    process.kill()
                process.communicate()
                raise InvalidAnalysis("scanner_timeout") from None
        report = json.loads(stdout, object_pairs_hook=unique_fields,
                            parse_constant=reject_constant)
    except InvalidAnalysis:
        raise
    except (OSError, ValueError):
        raise InvalidAnalysis("scanner_unavailable_or_invalid") from None
    current_hash = hashlib.sha256(
        (arguments.policy.resolve().parent / entry["config"]).read_bytes()).hexdigest()
    if current_hash != entry["config_sha256"]:
        raise InvalidAnalysis("configuration_changed_during_scan")
    return {
        "module": module, **identity, "policy_version": policy["version"],
        "config_sha256": current_hash,
        "scanner_exit_code": process.returncode, "report": report,
    }


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("scan", "evaluate"))
    parser.add_argument("--policy", type=Path, default=DEFAULT_POLICY)
    parser.add_argument("--exceptions", type=Path)
    parser.add_argument("--frontend", type=Path)
    parser.add_argument("--backend", type=Path)
    parser.add_argument("--repo-root", type=Path, default=ROOT)
    parser.add_argument("--semgrep", default="semgrep")
    parser.add_argument("--sha", required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--run-attempt", required=True)
    parser.add_argument("--now")
    return parser.parse_args()


def main() -> int:
    arguments = parse_arguments()
    try:
        attempt = int(arguments.run_attempt)
        if (attempt < 1 or str(attempt) != arguments.run_attempt
                or not re.fullmatch(r"[0-9a-f]{40}", arguments.sha)
                or not valid_token(arguments.run_id)):
            raise InvalidAnalysis("invalid_identity")
        identity = {"sha": arguments.sha, "run_id": arguments.run_id, "run_attempt": attempt}
        policy, catalog = load_policy(arguments.policy)
        now = timestamp(arguments.now) if arguments.now else datetime.now(timezone.utc)
        exceptions = load_exceptions(
            arguments.exceptions or arguments.policy.parent / "exceptions.json", policy, catalog, now)
        output = {
            **identity, "policy_version": policy["version"], "tool_version": policy["tool_version"],
            "owner_role": policy["owner_role"], "tool_image": policy["tool_image"],
            "exceptions": exceptions, "modules": {},
            "source_state": "working_tree" if arguments.mode == "scan" else "reported_execution",
        }
        for module in MODULES:
            try:
                if arguments.mode == "scan":
                    wrapper = scan_module(module, arguments, identity, policy)
                else:
                    report_path = getattr(arguments, module)
                    if report_path is None:
                        raise InvalidAnalysis("missing_module_report")
                    wrapper = read_json(report_path)
                output["modules"][module] = evaluate_module(
                    module, wrapper, identity, policy, catalog, exceptions)
            except FileNotFoundError:
                output["modules"][module] = {"status": "incomplete", "reason": "missing_module_report"}
            except (OSError, ValueError, TypeError, AttributeError, KeyError) as error:
                reason = str(error) if isinstance(error, InvalidAnalysis) else "invalid_module_report"
                output["modules"][module] = {"status": "incomplete", "reason": reason}
        states = [item["status"] for item in output["modules"].values()]
        if "incomplete" in states:
            output["status"], exit_code = "incomplete", 2
        elif "failed" in states:
            output["status"], exit_code = "failed", 1
        else:
            output["status"], exit_code = "passed", 0
    except (OSError, ValueError, TypeError, KeyError, AttributeError) as error:
        reason = str(error) if isinstance(error, InvalidAnalysis) else "invalid_input"
        output, exit_code = {"status": "incomplete", "reason": reason}, 2
    print(json.dumps(output, ensure_ascii=False, sort_keys=True))
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
