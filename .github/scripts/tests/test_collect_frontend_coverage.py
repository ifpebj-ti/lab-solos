from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "collect_frontend_coverage.py"
SHA = "0123456789abcdef0123456789abcdef01234567"
RUN_ID = "123456789"
RUN_ATTEMPT = "2"


class CollectFrontendCoverageTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = Path(self.enterContext(tempfile.TemporaryDirectory()))
        self.repository = self.temporary / "repo"
        self.source = self.repository / "frontend" / "src"
        self.source.mkdir(parents=True)
        self.visited = self.source / "Visited.ts"
        self.unvisited = self.source / "NeverImported.ts"
        self.test_file = self.source / "Visited.test.ts"
        self.setup_file = self.source / "test" / "setup.ts"
        self.generated = self.source / "generated" / "client.ts"
        for path in (self.visited, self.unvisited, self.test_file, self.setup_file, self.generated):
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("export {};\n", encoding="utf-8")

        self.summary = self.temporary / "coverage-summary.json"
        self.output = self.temporary / "normalized-frontend.json"

    def run_collector(self, summary: Path | None = None) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--summary",
                str(summary or self.summary),
                "--output",
                str(self.output),
                "--repository-root",
                str(self.repository),
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

    @staticmethod
    def file_coverage(total: int, covered: int) -> dict[str, object]:
        return {
            "lines": {
                "total": total,
                "covered": covered,
                "skipped": 0,
                "pct": (covered / total * 100) if total else 0,
            }
        }

    def write_summary(self, entries: dict[Path, dict[str, object]]) -> None:
        report: dict[str, object] = {"total": self.file_coverage(1, 1)}
        report.update({str(path): coverage for path, coverage in entries.items()})
        self.summary.write_text(json.dumps(report), encoding="utf-8")

    def test_counts_unvisited_source_and_excludes_tests_and_generated_files(self) -> None:
        self.write_summary(
            {
                self.visited: self.file_coverage(2, 1),
                self.unvisited: self.file_coverage(3, 0),
                self.test_file: self.file_coverage(10, 10),
                self.setup_file: self.file_coverage(20, 20),
                self.generated: self.file_coverage(30, 30),
            }
        )

        result = self.run_collector()

        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        normalized = json.loads(self.output.read_text(encoding="utf-8"))
        self.assertEqual(normalized["module"], "frontend")
        self.assertEqual(normalized["metric"], "lines")
        self.assertEqual(normalized["numerator"], 1)
        self.assertEqual(normalized["denominator"], 5)
        self.assertEqual(normalized["sha"], SHA)
        self.assertEqual(normalized["run_id"], RUN_ID)
        self.assertEqual(normalized["run_attempt"], 2)

    def test_rejects_a_missing_or_invalid_summary(self) -> None:
        missing = self.run_collector(self.temporary / "missing.json")
        self.assertEqual(missing.returncode, 2, missing.stdout + missing.stderr)
        self.assertIn("missing", missing.stderr.lower() + missing.stdout.lower())

        self.summary.write_text("{not-json", encoding="utf-8")
        invalid = self.run_collector()
        self.assertEqual(invalid.returncode, 2, invalid.stdout + invalid.stderr)
        self.assertIn("invalid", invalid.stderr.lower() + invalid.stdout.lower())

    def test_rejects_inconsistent_line_counts_and_an_empty_eligible_set(self) -> None:
        self.write_summary({self.visited: self.file_coverage(2, 3)})
        inconsistent = self.run_collector()
        self.assertEqual(inconsistent.returncode, 2, inconsistent.stdout + inconsistent.stderr)
        self.assertIn("covered", inconsistent.stderr.lower() + inconsistent.stdout.lower())

        self.write_summary({self.test_file: self.file_coverage(1, 1)})
        empty = self.run_collector()
        self.assertEqual(empty.returncode, 2, empty.stdout + empty.stderr)
        self.assertIn("eligible", empty.stderr.lower() + empty.stdout.lower())


if __name__ == "__main__":
    unittest.main()
