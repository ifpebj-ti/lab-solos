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
RUN_ATTEMPT = 2


def report(
    module: str,
    *,
    lines: tuple[int, int] = (6, 10),
    branches: tuple[int, int] = (7, 10),
) -> dict[str, object]:
    return {
        "schemaVersion": 2,
        "module": module,
        "sha": SHA,
        "run_id": RUN_ID,
        "run_attempt": RUN_ATTEMPT,
        "metrics": {
            "lines": {"covered": lines[0], "total": lines[1]},
            "branches": {"covered": branches[0], "total": branches[1]},
        },
    }


class CheckCoverageTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = Path(self.enterContext(tempfile.TemporaryDirectory()))
        self.frontend = FRONTEND
        self.backend = BACKEND

    def write_report(self, value: object, filename: str = "coverage.json") -> Path:
        path = self.temporary / filename
        if isinstance(value, str):
            path.write_text(value, encoding="utf-8")
        else:
            path.write_text(json.dumps(value), encoding="utf-8")
        return path

    def run_check(
        self,
        frontend: Path | None = None,
        backend: Path | None = None,
    ) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--frontend",
                str(frontend or self.frontend),
                "--backend",
                str(backend or self.backend),
                "--sha",
                SHA,
                "--run-id",
                RUN_ID,
                "--run-attempt",
                str(RUN_ATTEMPT),
            ],
            check=False,
            capture_output=True,
            text=True,
        )

    def test_both_modules_pass_at_exact_branch_threshold_and_lines_are_informational(self) -> None:
        result = self.run_check()

        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn(f"sha={SHA}", result.stdout)
        self.assertIn(f"run_id={RUN_ID}", result.stdout)
        self.assertIn(f"run_attempt={RUN_ATTEMPT}", result.stdout)
        self.assertIn("minimum branches=70%", result.stdout)
        self.assertIn("frontend: passed", result.stdout)
        self.assertIn("lines 6/10, 60.00%", result.stdout)
        self.assertIn("branches 7/10, 70.00%", result.stdout)
        self.assertIn("backend: passed", result.stdout)
        self.assertIn("branches 14/20, 70.00%", result.stdout)

    def test_one_module_below_branch_threshold_fails_without_averaging(self) -> None:
        low_frontend = self.write_report(
            report("frontend", lines=(20, 20), branches=(6, 10)), "low-frontend.json"
        )
        high_backend = self.write_report(
            report("backend", lines=(1, 20), branches=(20, 20)), "high-backend.json"
        )

        result = self.run_check(low_frontend, high_backend)

        self.assertEqual(result.returncode, 1, result.stderr + result.stdout)
        self.assertIn("frontend: below threshold", result.stdout)
        self.assertIn("branches 6/10, 60.00%", result.stdout)
        self.assertIn("minimum 70%", result.stdout)
        self.assertIn("backend: passed", result.stdout)
        self.assertIn("lines 1/20, 5.00%", result.stdout)

    def test_unrounded_branch_ratio_below_threshold_fails(self) -> None:
        low = self.write_report(
            report("frontend", branches=(6999, 10000)), "rounded-low.json"
        )

        result = self.run_check(low)

        self.assertEqual(result.returncode, 1, result.stderr + result.stdout)
        self.assertIn("frontend: below threshold", result.stdout)
        self.assertIn("branches 6999/10000, 69.99%", result.stdout)

    def test_missing_empty_unreadable_and_malformed_reports_are_invalid(self) -> None:
        empty = self.write_report(" \n", "empty.json")
        invalid_encoding = self.temporary / "invalid-encoding.json"
        invalid_encoding.write_bytes(b"\xff")
        duplicate_key = self.write_report(
            '{"schemaVersion": 2, "schemaVersion": 2}', "duplicate-key.json"
        )
        nonobject = self.write_report("[]", "nonobject.json")
        for path, reason in (
            (self.temporary / "missing.json", "report file is missing"),
            (empty, "report is empty"),
            (self.temporary, "cannot read report"),
            (invalid_encoding, "cannot read report"),
            (duplicate_key, "duplicate JSON field"),
            (nonobject, "JSON object"),
            (FIXTURES / "malformed.json", "invalid JSON"),
        ):
            with self.subTest(path=path):
                result = self.run_check(self.frontend, path)
                self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
                self.assertIn("frontend: passed", result.stdout)
                self.assertIn("backend: invalid measurement", result.stdout)
                self.assertIn(reason, result.stdout)

    def test_missing_metric_or_zero_denominator_is_invalid(self) -> None:
        cases = []
        for metric in ("lines", "branches"):
            malformed_metrics = report("frontend")
            del malformed_metrics["metrics"][metric]
            cases.append((malformed_metrics, metric))
            cases.append((report("frontend", **{metric: (0, 0)}), "total must be positive"))
        for value, reason in cases:
            with self.subTest(reason=reason, value=value):
                result = self.run_check(self.write_report(value), self.backend)
                self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
                self.assertIn("frontend: invalid measurement", result.stdout)
                self.assertIn(reason, result.stdout)

    def test_rejects_invalid_integer_counts_for_each_metric(self) -> None:
        cases = (
            ("lines", "covered", True, "covered must be an integer"),
            ("lines", "covered", -1, "covered must be nonnegative"),
            ("lines", "covered", 11, "covered exceeds total"),
            ("lines", "total", 10.0, "total must be an integer"),
            ("branches", "covered", "7", "covered must be an integer"),
            ("branches", "total", 0, "total must be positive"),
        )
        for metric, field, value, reason in cases:
            with self.subTest(metric=metric, field=field, value=value):
                invalid = report("frontend")
                invalid["metrics"][metric][field] = value
                result = self.run_check(self.write_report(invalid), self.backend)
                self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
                self.assertIn("frontend: invalid measurement", result.stdout)
                self.assertIn(reason, result.stdout)

    def test_rejects_wrong_schema_and_module(self) -> None:
        for value, reason in (
            ({**report("frontend"), "schemaVersion": 1}, "schemaVersion"),
            (report("backend"), "expected module frontend"),
        ):
            with self.subTest(reason=reason):
                result = self.run_check(self.write_report(value), self.backend)
                self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
                self.assertIn("frontend: invalid measurement", result.stdout)
                self.assertIn(reason, result.stdout)

    def test_rejects_mismatched_identity(self) -> None:
        cases = (
            ("sha", "1" * 40),
            ("run_id", "123456788"),
            ("run_attempt", 1),
            ("run_attempt", 2.0),
        )
        for field, value in cases:
            with self.subTest(field=field, value=value):
                invalid = report("backend")
                invalid[field] = value
                result = self.run_check(self.frontend, self.write_report(invalid))
                self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
                self.assertIn("frontend: passed", result.stdout)
                self.assertIn("backend: invalid measurement", result.stdout)
                self.assertIn(f"{field} mismatch", result.stdout)


if __name__ == "__main__":
    unittest.main()
