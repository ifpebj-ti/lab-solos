from __future__ import annotations

import json
import hashlib
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[3]
SCRIPT = ROOT / ".github/scripts/check_semgrep.py"
POLICY = ROOT / ".github/quality/semgrep/policy.json"
SHA = "0123456789abcdef0123456789abcdef01234567"
NOW = "2026-11-17T12:00:00Z"


class CheckSemgrepTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = Path(self.enterContext(tempfile.TemporaryDirectory()))
        self.frontend = self.report("frontend", "frontend/src/sample.ts")
        self.backend = self.report("backend", "backend/LabSolos-Server-DotNet8/Sample.cs")
        self.exceptions = {"version": "1", "exceptions": []}

    def report(self, module: str, path: str) -> dict:
        return {
            "module": module, "sha": SHA, "run_id": "local-123", "run_attempt": 1,
            "policy_version": "1", "scanner_exit_code": 0,
            "config_sha256": hashlib.sha256(
                (POLICY.parent / f"{module}.rules.json").read_bytes()).hexdigest(),
            "report": {
                "version": "1.185.0", "results": [], "errors": [],
                "paths": {"scanned": [path]},
            },
        }

    def write(self, name: str, value: object) -> Path:
        path = self.temp / name
        path.write_text(json.dumps(value), encoding="utf-8")
        return path

    def run_check(self, policy: Path = POLICY, backend_path: Path | None = None) -> subprocess.CompletedProcess:
        return subprocess.run([
            sys.executable, str(SCRIPT), "evaluate",
            "--frontend", str(self.write("frontend.json", self.frontend)),
            "--backend", str(backend_path or self.write("backend.json", self.backend)),
            "--policy", str(policy),
            "--exceptions", str(self.write("exceptions.json", self.exceptions)),
            "--sha", SHA, "--run-id", "local-123", "--run-attempt", "1", "--now", NOW,
        ], capture_output=True, text=True, check=False)

    def finding(self) -> dict:
        return {
            "check_id": "labon.frontend.dynamic-code",
            "path": "frontend/src/sample.ts", "start": {"line": 3},
            "extra": {
                "severity": "ERROR", "message": "SENTINEL_SECRET_MESSAGE",
                "lines": "SENTINEL_SECRET_SOURCE", "metavars": {"$X": "SENTINEL_TOKEN"},
                "metadata": {"security-severity": "LOW"},
            },
        }

    def add_exception(self, **changes) -> None:
        exception = {
            "id": "synthetic-exception-1", "rule": "labon.frontend.dynamic-code",
            "path": "frontend/src/sample.ts", "justification": "Synthetic review",
            "approver": "synthetic-reviewer", "created_at": "2026-11-16T00:00:00Z",
            "expires_at": "2026-11-20T00:00:00Z",
        }
        exception.update(changes)
        self.exceptions["exceptions"].append(exception)

    def test_two_clean_modules_pass_and_identify_execution(self) -> None:
        result = self.run_check()
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report["status"], "passed")
        self.assertEqual(report["sha"], SHA)
        self.assertEqual(report["run_attempt"], 1)
        self.assertEqual(set(report["modules"]), {"frontend", "backend"})

    def test_blocking_rule_uses_repository_policy_and_sanitizes_output(self) -> None:
        self.frontend["report"]["results"] = [self.finding()]
        result = self.run_check()
        self.assertEqual(result.returncode, 1, result.stderr)
        report = json.loads(result.stdout)
        finding = report["modules"]["frontend"]["findings"][0]
        self.assertEqual(finding["severity"], "HIGH")
        self.assertEqual(finding["status"], "blocking")
        self.assertEqual(finding["line"], 3)
        self.assertNotIn("SENTINEL", result.stdout + result.stderr)

    def test_valid_exception_is_auditable_and_allows_the_exact_finding(self) -> None:
        self.frontend["report"]["results"] = [self.finding()]
        self.add_exception()
        result = self.run_check()
        self.assertEqual(result.returncode, 0, result.stderr)
        finding = json.loads(result.stdout)["modules"]["frontend"]["findings"][0]
        self.assertEqual(finding["status"], "excepted")
        self.assertEqual(finding["exception_id"], "synthetic-exception-1")
        self.assertNotIn("Synthetic review", result.stdout)

    def test_expired_exception_blocks_at_the_expiry_instant(self) -> None:
        self.frontend["report"]["results"] = [self.finding()]
        self.add_exception(expires_at=NOW)
        result = self.run_check()
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertEqual(json.loads(result.stdout)["exceptions"][0]["status"], "expired")

    def test_exception_never_matches_another_path(self) -> None:
        self.frontend["report"]["results"] = [self.finding()]
        self.add_exception(path="frontend/src/another.ts")
        self.assertEqual(self.run_check().returncode, 1)

    def test_invalid_exception_or_lifetime_is_incomplete(self) -> None:
        for changes in (
            {"approver": ""}, {"justification": ""}, {"path": "../escape.ts"},
            {"expires_at": "2027-01-01T00:00:00Z"},
        ):
            with self.subTest(changes=changes):
                self.exceptions["exceptions"] = []
                self.add_exception(**changes)
                result = self.run_check()
                self.assertEqual(result.returncode, 2, result.stderr)
                self.assertEqual(json.loads(result.stdout)["status"], "incomplete")

    def test_missing_interrupted_or_empty_module_is_incomplete(self) -> None:
        for field, value in (("scanner_exit_code", 130), ("report", {}),
                             ("policy_version", "older"), ("sha", "different"),
                             ("config_sha256", "older-config")):
            with self.subTest(field=field):
                original = self.backend[field]
                self.backend[field] = value
                self.assertEqual(self.run_check().returncode, 2)
                self.backend[field] = original

    def test_missing_report_is_incomplete(self) -> None:
        result = self.run_check(backend_path=self.temp / "absent.json")
        self.assertEqual(result.returncode, 2)
        report = json.loads(result.stdout)
        self.assertEqual(report["modules"]["frontend"]["status"], "passed")
        self.assertEqual(report["modules"]["backend"]["status"], "incomplete")

    def test_scanner_errors_empty_scan_and_wrong_version_are_incomplete(self) -> None:
        for field, value in (("errors", [{"message": "SENTINEL_PARSER"}]),
                             ("paths", {"scanned": []}), ("version", "1.0.0")):
            with self.subTest(field=field):
                original = self.backend["report"][field]
                self.backend["report"][field] = value
                result = self.run_check()
                self.assertEqual(result.returncode, 2)
                self.assertNotIn("SENTINEL", result.stdout + result.stderr)
                self.backend["report"][field] = original

    def test_unknown_rule_or_escaped_path_is_incomplete(self) -> None:
        for changes in ({"check_id": "unknown-secret-rule"}, {"path": "../../SENTINEL_SECRET"},
                        {"start": {"line": 0}}):
            with self.subTest(changes=changes):
                finding = self.finding()
                finding.update(changes)
                self.frontend["report"]["results"] = [finding]
                result = self.run_check()
                self.assertEqual(result.returncode, 2)
                self.assertNotIn("SENTINEL", result.stdout + result.stderr)

    def test_invalid_policy_is_incomplete(self) -> None:
        policy = self.write("invalid-policy.json", {"version": "1", "modules": {}})
        result = self.run_check(policy)
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertEqual(json.loads(result.stdout)["reason"], "invalid_policy")

    def test_missing_scanner_is_incomplete_without_echoing_command_or_environment(self) -> None:
        result = subprocess.run([
            sys.executable, str(SCRIPT), "scan",
            "--semgrep", str(self.temp / "SENTINEL_MISSING_SCANNER"),
            "--sha", SHA, "--run-id", "local-123", "--run-attempt", "1",
        ], capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 2)
        self.assertNotIn("SENTINEL", result.stdout + result.stderr)
        self.assertTrue(all(
            value["status"] == "incomplete"
            for value in json.loads(result.stdout)["modules"].values()
        ))


if __name__ == "__main__":
    unittest.main()
