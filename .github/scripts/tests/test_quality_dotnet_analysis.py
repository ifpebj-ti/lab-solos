"""Contract tests for the backend analyzer and per-project SARIF output."""

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[3]
BACKEND = ROOT / "backend"
FIXTURES = ROOT / ".github" / "scripts" / "tests" / "fixtures" / "quality" / "dotnet"


class DotnetAnalysisContracts(unittest.TestCase):
    def test_backend_configuration_fixes_recommended_analysis_and_preserves_project_override(self):
        props = ElementTree.parse(BACKEND / "Directory.Build.props").getroot()
        properties = {
            element.tag.rsplit("}", 1)[-1]: element.text
            for element in props.iter()
            if element.tag.rsplit("}", 1)[-1]
            in {"AnalysisLevel", "AnalysisMode", "EnableNETAnalyzers", "RunAnalyzersDuringBuild"}
        }

        self.assertEqual(properties.get("AnalysisLevel"), "8.0")
        self.assertEqual(properties.get("AnalysisMode"), "Recommended")
        self.assertEqual(properties.get("EnableNETAnalyzers"), "true")
        self.assertEqual(properties.get("RunAnalyzersDuringBuild"), "true")

        editorconfig = (BACKEND / ".editorconfig").read_text(encoding="utf-8")
        self.assertIn("dotnet_diagnostic.CA1502.severity = warning", editorconfig)

        project_editorconfig = (
            BACKEND / "LabSolos-Server-DotNet8" / ".editorconfig"
        ).read_text(encoding="utf-8")
        self.assertIn("dotnet_diagnostic.CS8618.severity = silent", project_editorconfig)

    def test_rebuild_emits_distinct_sarif_and_refreshes_complexity_diagnostic(self):
        with tempfile.TemporaryDirectory(prefix="quality-dotnet-") as temporary:
            workspace = Path(temporary)
            backend = workspace / "backend"
            backend.mkdir()

            for filename in ("Directory.Build.props", "Directory.Build.targets", ".editorconfig"):
                source = BACKEND / filename
                if source.exists():
                    shutil.copy2(source, backend / filename)

            app = backend / "quality-app"
            tests = backend / "quality-tests"
            shutil.copytree(FIXTURES / "app", app)
            shutil.copytree(FIXTURES / "tests", tests)
            shutil.copy2(
                BACKEND / "LabSolos-Server-DotNet8" / ".editorconfig",
                app / ".editorconfig",
            )

            solution = workspace / "QualityFixtures.sln"
            self._run("dotnet", "new", "sln", "--name", solution.stem, "--output", str(workspace))
            self._run(
                "dotnet",
                "sln",
                str(solution),
                "add",
                str(app / "QualityApp.csproj"),
                str(tests / "Quality.Tests.csproj"),
            )
            self._run("dotnet", "restore", str(solution), "--nologo")

            build = self._run(
                "dotnet",
                "build",
                str(solution),
                "--no-restore",
                "-t:Rebuild",
                "-c",
                "Release",
                "--nologo",
                "--disable-build-servers",
            )
            self.assertEqual(build.returncode, 0, build.stdout + build.stderr)

            reports = sorted(workspace.rglob("*.sarif"))
            self.assertEqual([report.stem for report in reports], ["QualityApp", "Quality.Tests"])
            self.assertNotEqual(reports[0].parent, reports[1].parent)

            report_by_name = {report.stem: self._read_sarif(report) for report in reports}
            self.assertEqual(report_by_name["QualityApp"]["version"], "2.1.0")
            self.assertEqual(report_by_name["Quality.Tests"]["version"], "2.1.0")
            self.assertTrue(
                self._has_rule(report_by_name["QualityApp"], "CA1502"),
                "the complexity fixture must produce CA1502",
            )
            self.assertFalse(self._has_rule(report_by_name["Quality.Tests"], "CA1502"))
            self.assertTrue(self._has_rule(report_by_name["QualityApp"], "CS8602"))
            self.assertFalse(self._has_rule(report_by_name["QualityApp"], "CS8618"))

            complexity_source = app / "ComplexityFixture.cs"
            complexity_source.write_text(
                "namespace QualityFixture;\n\npublic static class ComplexityFixture\n{\n"
                "    public static int Value(int input) => input;\n}\n",
                encoding="utf-8",
            )
            rebuild = self._run(
                "dotnet",
                "build",
                str(solution),
                "--no-restore",
                "-t:Rebuild",
                "-c",
                "Release",
                "--nologo",
                "--disable-build-servers",
            )
            self.assertEqual(rebuild.returncode, 0, rebuild.stdout + rebuild.stderr)
            refreshed = self._read_sarif(next(report for report in reports if report.stem == "QualityApp"))
            self.assertFalse(self._has_rule(refreshed, "CA1502"))

    @staticmethod
    def _run(*command: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            command,
            cwd=ROOT,
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
        )

    @staticmethod
    def _read_sarif(path: Path) -> dict:
        return json.loads(path.read_text(encoding="utf-8"))

    @staticmethod
    def _has_rule(report: dict, rule_id: str) -> bool:
        return any(
            result.get("ruleId") == rule_id
            for run in report.get("runs", [])
            for result in run.get("results", [])
        )


if __name__ == "__main__":
    unittest.main()
