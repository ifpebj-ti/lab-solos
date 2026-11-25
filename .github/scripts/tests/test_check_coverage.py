from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "check_coverage.py"
FIXTURES = Path(__file__).resolve().parent / "fixtures" / "coverage"
FRONTEND = FIXTURES / "frontend.json"
BACKEND = FIXTURES / "backend.json"
SHA = "0123456789abcdef0123456789abcdef01234567"
RUN_ID = "123456789"
RUN_ATTEMPT = "2"


class CheckCoverageTests(unittest.TestCase):
    def setUp(self) -> None:
        self.frontend = json.loads(FRONTEND.read_text(encoding="utf-8"))
        self.backend = json.loads(BACKEND.read_text(encoding="utf-8"))
        self.temporary = Path(self.enterContext(tempfile.TemporaryDirectory()))

    def run_check(
        self,
        frontend: Path = FRONTEND,
        backend: Path = BACKEND,
        *,
        metric: str = "lines",
    ) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--frontend",
                str(frontend),
                "--backend",
                str(backend),
                "--metric",
                metric,
                "--sha",
                SHA,
                "--run-id",
                RUN_ID,
                "--run-attempt",
                RUN_ATTEMPT,
            ],
            check=False,
            capture_output=True,
            text=True,
        )

    def write_report(self, report: dict[str, object], filename: str = "coverage.json") -> Path:
        path = self.temporary / filename
        path.write_text(json.dumps(report), encoding="utf-8")
        return path

    def test_two_modules_pass_at_the_exact_threshold(self) -> None:
        result = self.run_check()

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("metric=lines", result.stdout)
        self.assertIn(f"sha={SHA}", result.stdout)
        self.assertIn(f"run_id={RUN_ID}", result.stdout)
        self.assertIn(f"run_attempt={RUN_ATTEMPT}", result.stdout)
        self.assertIn("frontend: passed (7/10, 70.00%)", result.stdout)
        self.assertIn("backend: passed (14/20, 70.00%)", result.stdout)

    def test_one_module_below_threshold_fails_without_averaging(self) -> None:
        high_frontend = self.write_report(dict(self.frontend, numerator=10), "high-frontend.json")
        high_backend = self.write_report(dict(self.backend, numerator=20), "high-backend.json")
        cases = (
            (FIXTURES / "frontend-below.json", high_backend, "frontend", "6/10, 60.00%", "backend"),
            (high_frontend, FIXTURES / "backend-below.json", "backend", "6999/10000, 69.99%", "frontend"),
        )
        for frontend, backend, failing_module, values, passing_module in cases:
            with self.subTest(failing_module=failing_module):
                result = self.run_check(frontend, backend)
                self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                self.assertIn(f"{failing_module}: below threshold", result.stdout)
                self.assertIn(values, result.stdout)
                self.assertIn(f"{passing_module}: passed", result.stdout)

    def test_values_rounded_to_seventy_for_display_still_fail_when_below(self) -> None:
        frontend = self.write_report(dict(self.frontend, numerator=69999, denominator=100000))

        result = self.run_check(frontend, BACKEND)

        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("frontend: below threshold", result.stdout)
        self.assertIn("69999/100000, 70.00%", result.stdout)

    def test_metric_is_declared_by_the_caller(self) -> None:
        frontend = self.write_report(dict(self.frontend, metric="branches"), "frontend.json")
        backend = self.write_report(dict(self.backend, metric="branches", numerator=19), "backend.json")

        result = self.run_check(frontend, backend, metric="branches")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("metric=branches", result.stdout)
        self.assertIn("backend: passed (19/20, 95.00%)", result.stdout)

    def test_duplicate_module_invalidates_both_report_slots(self) -> None:
        duplicate = self.write_report(self.frontend)

        for frontend, backend in ((FRONTEND, FRONTEND), (FRONTEND, duplicate), (BACKEND, BACKEND)):
            with self.subTest(frontend=frontend, backend=backend):
                result = self.run_check(frontend, backend)
                self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
                self.assertIn("frontend: invalid measurement", result.stdout)
                self.assertIn("backend: invalid measurement", result.stdout)
                self.assertIn("duplicate module", result.stdout)

    def test_unexpected_module_invalidates_only_its_report(self) -> None:
        unexpected = self.write_report(dict(self.frontend, module="other"))

        result = self.run_check(unexpected, BACKEND)

        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertIn("frontend: invalid measurement", result.stdout)
        self.assertIn("expected module frontend", result.stdout)
        self.assertIn("backend: passed", result.stdout)

    def test_rejects_missing_empty_unreadable_and_invalid_json_reports(self) -> None:
        empty = self.temporary / "empty.json"
        empty.write_text(" \n", encoding="utf-8")
        unreadable = self.temporary / "invalid-encoding.json"
        unreadable.write_bytes(b"\xff")
        duplicate_key = self.temporary / "duplicate-key.json"
        duplicate_key.write_text('{"module": "other", "module": "backend"}', encoding="utf-8")
        nonobject = self.temporary / "nonobject.json"
        nonobject.write_text("[]", encoding="utf-8")
        nonstandard_json = self.write_report(dict(self.backend, percent=float("nan")), "nan.json")
        cases = (
            (self.temporary / "missing.json", "report file is missing"),
            (empty, "report is empty"),
            (self.temporary, "cannot read report"),
            (unreadable, "cannot read report"),
            (FIXTURES / "malformed.json", "invalid JSON"),
            (duplicate_key, "duplicate JSON field"),
            (nonobject, "JSON object"),
            (nonstandard_json, "invalid JSON"),
        )
        for filename, reason in cases:
            with self.subTest(filename=filename):
                result = self.run_check(FRONTEND, filename)
                self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
                self.assertIn("frontend: passed", result.stdout)
                self.assertIn("backend: invalid measurement", result.stdout)
                self.assertIn(reason, result.stdout)

    def test_rejects_denominators_and_inconsistent_counts(self) -> None:
        missing_denominator = self.frontend.copy()
        del missing_denominator["denominator"]
        cases = (
            (dict(self.frontend, numerator=0, denominator=0), "denominator must be positive"),
            (dict(self.frontend, denominator=-1), "denominator must be positive"),
            (dict(self.frontend, numerator=-1), "numerator must be nonnegative"),
            (dict(self.frontend, numerator=11), "numerator exceeds denominator"),
            (dict(self.frontend, numerator=True), "numerator must be an integer"),
            (dict(self.frontend, denominator=10.0), "denominator must be an integer"),
            (dict(self.frontend, numerator="7"), "numerator must be an integer"),
            (dict(self.frontend, denominator=None), "denominator must be an integer"),
            (missing_denominator, "denominator must be an integer"),
        )
        for report, reason in cases:
            with self.subTest(report=report):
                result = self.run_check(self.write_report(report), BACKEND)
                self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
                self.assertIn("frontend: invalid measurement", result.stdout)
                self.assertIn(reason, result.stdout)
                self.assertIn(f"numerator={report['numerator']!r}", result.stdout)
                self.assertIn(f"denominator={report.get('denominator')!r}", result.stdout)

    def test_rejects_mismatched_metric_sha_run_and_attempt(self) -> None:
        cases = (
            ("metric", "branches"),
            ("sha", "1" * 40),
            ("run_id", "123456788"),
            ("run_attempt", 1),
            ("run_attempt", 2.0),
        )
        for field, value in cases:
            with self.subTest(field=field, value=value):
                report = self.write_report(dict(self.backend, **{field: value}))
                result = self.run_check(FIXTURES / "frontend-below.json", report)
                self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
                self.assertIn("frontend: below threshold", result.stdout)
                self.assertIn("backend: invalid measurement", result.stdout)
                self.assertIn(f"{field} mismatch", result.stdout)


if __name__ == "__main__":
    unittest.main()
