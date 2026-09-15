from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "check_quality_gate.py"
sys.path.insert(0, str(ROOT / "scripts"))

from check_quality_gate import evaluate_gate  # noqa: E402


class QualityGateTests(unittest.TestCase):
    def test_requires_every_job_to_be_successful(self):
        result, errors = evaluate_gate(
            ["frontend", "backend", "e2e"],
            {"frontend": "success", "backend": "success", "e2e": "success"},
        )
        self.assertEqual(result, 0)
        self.assertEqual(errors, [])

    def test_rejects_failure_cancelled_skipped_and_missing(self):
        result, errors = evaluate_gate(
            ["failure", "cancelled", "skipped", "missing"],
            {"failure": "failure", "cancelled": "cancelled", "skipped": "skipped"},
        )
        self.assertEqual(result, 1)
        self.assertEqual(len(errors), 4)
        self.assertIn("missing", " ".join(errors))

    def test_json_input_supports_job_result_objects(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "results.json"
            path.write_text(
                json.dumps({"jobs": {"frontend": {"result": "success"}}}),
                encoding="utf-8",
            )
            completed = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "--required",
                    "frontend",
                    "--results",
                    str(path),
                ],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(completed.returncode, 0, completed.stderr)

    def test_invalid_result_is_operational_error(self):
        completed = subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--required",
                "frontend",
                "--job",
                "frontend=unknown",
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        self.assertEqual(completed.returncode, 2)
        self.assertIn("invalid result", completed.stderr)


if __name__ == "__main__":
    unittest.main()
