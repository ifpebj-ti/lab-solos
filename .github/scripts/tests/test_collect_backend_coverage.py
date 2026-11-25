from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "collect_backend_coverage.py"
SHA = "0123456789abcdef0123456789abcdef01234567"
RUN_ID = "123456789"
RUN_ATTEMPT = "2"


class CollectBackendCoverageTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = Path(self.enterContext(tempfile.TemporaryDirectory()))
        self.repository = self.temporary / "repo"
        self.server = self.repository / "backend" / "LabSolos-Server-DotNet8"
        self.visited = self.server / "Services" / "Branching.cs"
        self.duplicate = self.server / "Services" / "Duplicate.cs"
        self.unvisited = self.server / "Services" / "NeverCalled.cs"
        self.generated_migration = (
            self.server / "Data" / "Migrations" / "20260101_Initial.cs"
        )
        self.test_source = self.repository / "backend" / "Tests" / "Sample.cs"
        self.support_source = self.repository / "backend" / "TestSupport" / "E2ESeed" / "Seed.cs"
        for path in (
            self.visited,
            self.duplicate,
            self.unvisited,
            self.generated_migration,
            self.test_source,
            self.support_source,
        ):
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("// synthetic source\n", encoding="utf-8")
        self.results = self.temporary / "results" / RUN_ID / RUN_ATTEMPT
        self.results.mkdir(parents=True)
        self.coverage = (
            self.results
            / "6dcaa6be-89b0-4c9e-8d36-66cb8b45c414"
            / "coverage.cobertura.xml"
        )
        self.coverage.parent.mkdir()
        self.output = self.results / "normalized-backend.json"

    def run_collector(
        self, coverage: Path | None = None
    ) -> subprocess.CompletedProcess[str]:
        arguments = [
            sys.executable,
            str(SCRIPT),
            "--coverage-file",
            str(coverage or self.coverage),
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
        ]
        arguments.extend(["--results-directory", str(self.results)])
        return subprocess.run(
            arguments,
            check=False,
            capture_output=True,
            text=True,
        )

    def write_coverage(self, entries: dict[Path, list[tuple[int, int]]]) -> None:
        classes: list[str] = []
        for path, lines in entries.items():
            rendered_lines = "".join(
                f'<line number="{number}" hits="{hits}"/>' for number, hits in lines
            )
            classes.append(
                f'<class name="Synthetic" filename="{path.as_posix()}">'
                f"<lines>{rendered_lines}</lines></class>"
            )
        self.coverage.write_text(
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<coverage line-rate="0.5" branch-rate="0" version="1" timestamp="0">'
            '<sources></sources><packages><package name="Synthetic"><classes>'
            + "".join(classes)
            + "</classes></package></packages></coverage>",
            encoding="utf-8",
        )

    def write_branch_fixture(self) -> None:
        fixture = (
            Path(__file__).parent
            / "fixtures"
            / "backend-coverage"
            / "branch-counts.cobertura.xml"
        )
        self.coverage.write_bytes(fixture.read_bytes())

    def test_counts_eligible_server_lines_and_includes_unvisited_files(self) -> None:
        self.write_branch_fixture()

        result = self.run_collector()

        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        normalized = json.loads(self.output.read_text(encoding="utf-8"))
        self.assertEqual(normalized["module"], "backend")
        self.assertEqual(normalized["schemaVersion"], 2)
        self.assertEqual(normalized["metrics"]["lines"], {"covered": 2, "total": 3})
        self.assertEqual(
            normalized["metrics"]["branches"], {"covered": 3, "total": 4}
        )
        self.assertEqual(normalized["sha"], SHA)
        self.assertEqual(normalized["run_id"], RUN_ID)
        self.assertEqual(normalized["run_attempt"], 2)

    def test_rejects_branch_line_without_condition_metadata(self) -> None:
        self.coverage.write_text(
            '<?xml version="1.0"?><coverage><sources/><packages><package><classes>'
            f'<class filename="{self.visited.as_posix()}"><lines>'
            '<line number="10" hits="1" branch="true" condition-coverage="0% (0/1)"/>'
            '</lines></class></classes></package></packages></coverage>',
            encoding="utf-8",
        )

        result = self.run_collector()

        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertIn("condition", (result.stdout + result.stderr).lower())

    def test_rejects_invalid_branch_condition_coverage(self) -> None:
        self.coverage.write_text(
            '<?xml version="1.0"?><coverage><sources/><packages><package><classes>'
            f'<class filename="{self.visited.as_posix()}"><lines>'
            '<line number="10" hits="1" branch="true" condition-coverage="100% (1/1)">'
            '<conditions><condition number="0" type="jump" coverage="101%" />'
            '</conditions></line></lines></class></classes></package></packages></coverage>',
            encoding="utf-8",
        )

        result = self.run_collector()

        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertIn("between 0% and 100%", (result.stdout + result.stderr).lower())

    def test_rejects_report_without_any_eligible_branch_metadata(self) -> None:
        self.write_coverage({self.visited: [(1, 1), (2, 0)]})

        result = self.run_collector()

        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertIn("branch", (result.stdout + result.stderr).lower())

    def test_rejects_reports_outside_the_selected_full_run(self) -> None:
        older_run = self.temporary / "results" / "older" / "coverage.cobertura.xml"
        older_run.parent.mkdir(parents=True)
        older_run.write_text(
            "<coverage><sources/><packages><package><classes>"
            f'<class filename="{self.visited.as_posix()}"><lines><line number="1" hits="100"/></lines></class>'
            "</classes></package></packages></coverage>",
            encoding="utf-8",
        )

        result = self.run_collector(older_run)

        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertIn("outside", (result.stdout + result.stderr).lower())

    def test_rejects_nested_reports_from_a_separate_directed_selection(self) -> None:
        self.write_coverage({self.visited: [(1, 1)]})
        directed_report = (
            self.results
            / "directed"
            / "6dcaa6be-89b0-4c9e-8d36-66cb8b45c414"
            / "coverage.cobertura.xml"
        )
        directed_report.parent.mkdir(parents=True)
        directed_report.write_bytes(self.coverage.read_bytes())

        result = self.run_collector(directed_report)

        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertIn("full solution", (result.stdout + result.stderr).lower())

    def test_rejects_missing_invalid_or_inconsistent_coverage(self) -> None:
        missing_directory = self.results / "5fbb45ad-4b40-4abd-8f22-ea0d17a823fa"
        missing_directory.mkdir()
        missing = self.run_collector(missing_directory / "coverage.cobertura.xml")
        self.assertEqual(missing.returncode, 2, missing.stdout + missing.stderr)
        self.assertIn("missing", (missing.stdout + missing.stderr).lower())

        self.coverage.write_text("<coverage", encoding="utf-8")
        invalid = self.run_collector()
        self.assertEqual(invalid.returncode, 2, invalid.stdout + invalid.stderr)
        self.assertIn("invalid", (invalid.stdout + invalid.stderr).lower())

        self.write_coverage({self.visited: [(1, -1)]})
        inconsistent = self.run_collector()
        self.assertEqual(inconsistent.returncode, 2, inconsistent.stdout + inconsistent.stderr)
        self.assertIn("hits", (inconsistent.stdout + inconsistent.stderr).lower())


if __name__ == "__main__":
    unittest.main()
