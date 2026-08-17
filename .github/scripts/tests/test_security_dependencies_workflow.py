from __future__ import annotations

from pathlib import Path
import re
import unittest


ROOT = Path(__file__).parents[3]
WORKFLOW = ROOT / ".github" / "workflows" / "security-dependencies.yml"


class SecurityDependenciesWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.text = WORKFLOW.read_text(encoding="utf-8") if WORKFLOW.exists() else ""

    def assert_has(self, snippet: str):
        self.assertIn(snippet, self.text, f"workflow must contain: {snippet}")

    def job(self, name: str) -> str:
        match = re.search(
            rf"(?ms)^  {re.escape(name)}:\n(?P<body>.*?)(?=^  [a-z][a-z0-9_-]*:\n|\Z)",
            self.text,
        )
        self.assertIsNotNone(match, f"missing independent job: {name}")
        return match.group("body")

    def test_runs_before_merge_for_develop_and_relevant_paths(self):
        self.assertTrue(WORKFLOW.exists(), "security dependency workflow is missing")
        self.assert_has("pull_request:")
        self.assert_has("workflow_dispatch:")
        self.assert_has("branches: [develop]")
        for path in (
            '"frontend/package.json"',
            '"frontend/package-lock.json"',
            '"backend/**/*.csproj"',
            '"backend/backend.sln"',
            '".github/scripts/audit_dependencies.py"',
            '".github/workflows/security-dependencies.yml"',
        ):
            self.assert_has(path)
        self.assertNotIn("types: [closed]", self.text)
        self.assertNotIn("pull_request_target:", self.text)

    def test_uses_minimum_permissions_and_cancels_obsolete_runs(self):
        self.assertRegex(self.text, r"(?m)^permissions:\n  contents: read$")
        self.assert_has("concurrency:")
        self.assert_has("cancel-in-progress: true")
        self.assertNotIn("secrets.", self.text)
        self.assertNotRegex(self.text, r"(?m)^\s+[a-z-]+: write$")
        self.assertNotIn("security-events: write", self.text)
        self.assertNotRegex(self.text, r"(?i)\b(deploy|docker push|azure/login)\b")

    def test_npm_and_dotnet_jobs_reproduce_local_gates(self):
        npm = self.job("npm")
        dotnet = self.job("dotnet")

        for block in (npm, dotnet):
            self.assertIn("timeout-minutes:", block)
            self.assertNotIn("needs:", block)
            self.assertRegex(block, r"(?m)^    runs-on: ubuntu-latest$")

        for command in (
            "npm ci",
            "npm audit --audit-level=high --json > npm-audit.json",
            "npm run test -- --run",
            "npm run lint",
            "npm run build",
        ):
            self.assertIn(command, npm)
        self.assertIn("cache: npm", npm)
        self.assertIn("cache-dependency-path: frontend/package-lock.json", npm)
        self.assertIn(
            'python -m unittest discover -s ../.github/scripts/tests -p "test_audit_dependencies.py" -v',
            npm,
        )

        portable_restore = (
            "dotnet restore backend/backend.sln -p:NuGetAudit=true "
            "-p:NuGetAuditMode=all -p:NuGetAuditLevel=high "
            "-p:WarningsAsErrors=NU1903%3BNU1904"
        )
        self.assertIn(portable_restore, dotnet)
        self.assertNotIn('-p:WarningsAsErrors="NU1903;NU1904"', dotnet)

        for command in (
            "dotnet list backend/backend.sln package --vulnerable --include-transitive --format json > nuget-audit.json",
            "dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers",
            "dotnet test backend/backend.sln --no-build -c Release --nologo --disable-build-servers",
        ):
            self.assertIn(command, dotnet)
        self.assertIn("path: ~/.nuget/packages", dotnet)

    def test_publishes_summaries_and_retains_json_for_thirty_days(self):
        self.assertGreaterEqual(self.text.count("GITHUB_STEP_SUMMARY"), 2)
        upload_steps = re.findall(
            r"(?m)^\s+uses:\s+actions/upload-artifact@[^\s#]+(?:\s+#.*)?$",
            self.text,
        )
        self.assertGreaterEqual(len(upload_steps), 2)
        self.assertEqual(2, self.text.count("retention-days: 30"))
        self.assertIn("npm-audit.json", self.text)
        self.assertIn("nuget-audit.json", self.text)
        self.assertIn("if: always()", self.text)
        self.assertRegex(self.text, r"(?i)critical.*high|high.*critical")


if __name__ == "__main__":
    unittest.main()
