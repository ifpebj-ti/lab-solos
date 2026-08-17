from __future__ import annotations

import re
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
WORKFLOW_PATH = REPOSITORY_ROOT / ".github" / "workflows" / "container-ci.yml"


class ContainerCiWorkflowTests(unittest.TestCase):
    def setUp(self) -> None:
        self.workflow = (
            WORKFLOW_PATH.read_text(encoding="utf-8") if WORKFLOW_PATH.exists() else ""
        )

    def job(self, name: str) -> str:
        match = re.search(
            rf"(?ms)^  {re.escape(name)}:\n(?P<body>.*?)(?=^  [a-z][a-z0-9_-]*:\n|\Z)",
            self.workflow,
        )
        self.assertIsNotNone(match, f"missing independent job: {name}")
        return match.group("body")

    def test_runs_only_as_pre_merge_ci_for_relevant_develop_changes(self) -> None:
        self.assertTrue(WORKFLOW_PATH.is_file(), "container CI workflow is missing")
        trigger = self.workflow.split("permissions:", 1)[0]
        self.assertIn("pull_request:", trigger)
        self.assertIn("branches: [develop]", trigger)
        self.assertIn("types: [opened, synchronize, reopened]", trigger)
        self.assertIn("workflow_dispatch:", trigger)
        for path in (
            '"frontend/**"',
            '"backend/**"',
            '".trivy.yaml"',
            '".github/scripts/**"',
            '".github/workflows/container-ci.yml"',
            '".github/workflows/container-release.yml"',
        ):
            with self.subTest(path=path):
                self.assertIn(path, trigger)
        for forbidden in ("closed", "branches: [main]", "pull_request_target"):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, trigger)

    def test_cancels_obsolete_runs_and_uses_minimum_permissions(self) -> None:
        self.assertRegex(self.workflow, r"(?m)^permissions:\n  contents: read$")
        self.assertIn("concurrency:", self.workflow)
        self.assertIn("cancel-in-progress: true", self.workflow)

        for job_name in ("frontend-quality", "backend-quality", "workflow-quality"):
            job = self.job(job_name)
            self.assertIn("timeout-minutes:", job)
            self.assertNotIn("security-events: write", job)
            self.assertNotIn("actions: read", job)

        scan = self.job("container-scan")
        self.assertRegex(
            scan,
            r"(?m)^    permissions:\n      contents: read\n      actions: read\n"
            r"      security-events: write$",
        )
        self.assertIn("timeout-minutes:", scan)

    def test_quality_jobs_reproduce_the_repository_gates(self) -> None:
        frontend = self.job("frontend-quality")
        backend = self.job("backend-quality")
        workflow = self.job("workflow-quality")

        for command in ("npm ci", "npm run test -- --run", "npm run lint", "npm run build"):
            self.assertIn(command, frontend)
        for command in (
            "dotnet restore backend/backend.sln",
            "dotnet build backend/backend.sln --no-restore -c Release",
            "dotnet test backend/backend.sln --no-build --no-restore -c Release",
        ):
            self.assertIn(command, backend)
        self.assertIn('python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v', workflow)
        self.assertIn("bash .github/scripts/install_actionlint.sh .tmp/actionlint", workflow)
        self.assertIn(
            ".tmp/actionlint/actionlint .github/workflows/container-ci.yml", workflow
        )

    def test_build_matrix_is_exactly_two_components_by_two_platforms(self) -> None:
        scan = self.job("container-scan")
        self.assertRegex(scan, r"(?ms)matrix:.*?component:\s*\[frontend, backend\]")
        self.assertRegex(scan, r"(?ms)matrix:.*?platform:\s*\[linux/amd64, linux/arm64\]")
        self.assertIn("docker/setup-qemu-action@", scan)
        self.assertIn("docker/setup-buildx-action@", scan)
        self.assertIn("docker/build-push-action@", scan)
        self.assertIn("push: false", scan)
        self.assertIn("outputs: type=oci,dest=", scan)
        self.assertNotIn("fail-fast: true", scan)

    def test_extracts_oci_layout_and_publishes_reports_before_the_gate(self) -> None:
        scan = self.job("container-scan")
        extract = scan.index("tar --extract --file")
        table = scan.index("--format table")
        sarif = scan.index("--format sarif")
        artifact = scan.index("actions/upload-artifact@")
        code_scanning = scan.index("github/codeql-action/upload-sarif@")
        gate = scan.index("name: Enforce Trivy policy")

        self.assertLess(extract, table)
        self.assertLess(table, sarif)
        self.assertLess(sarif, artifact)
        self.assertLess(artifact, code_scanning)
        self.assertLess(code_scanning, gate)
        self.assertEqual(3, scan.count("trivy image"))
        self.assertEqual(2, scan.count("--exit-code 0"))
        self.assertIn("retention-days: 30", scan)
        self.assertIn("category: container-${{ matrix.component }}-${{ matrix.platform }}", scan)
        self.assertRegex(scan, r"github\.event\.pull_request\.head\.repo\.full_name == github\.repository")
        self.assertIn("github.actor != 'dependabot[bot]'", scan)

    def test_never_authenticates_pushes_releases_or_deploys(self) -> None:
        lowered = self.workflow.lower()
        for forbidden in (
            "docker/login-action",
            "docker login",
            "packages: write",
            "push: true",
            "gh release",
            "azure/",
            "container-apps-deploy",
            "docker scout",
            "scout-cli",
            "dockerhub_",
            "secrets.",
        ):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, lowered)

    def test_every_third_party_action_is_pinned_to_a_full_sha(self) -> None:
        action_references = re.findall(r"(?m)^\s+uses:\s+([^\s#]+)", self.workflow)
        self.assertGreater(len(action_references), 0)
        for reference in action_references:
            with self.subTest(reference=reference):
                self.assertRegex(reference, r"^[^@]+@[0-9a-f]{40}$")


if __name__ == "__main__":
    unittest.main()
