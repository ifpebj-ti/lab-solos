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

    def test_runs_as_a_stable_pre_merge_check_for_every_develop_pr(self) -> None:
        self.assertTrue(WORKFLOW_PATH.is_file(), "container CI workflow is missing")
        trigger = self.workflow.split("permissions:", 1)[0]
        self.assertIn("pull_request:", trigger)
        self.assertIn("branches: [develop]", trigger)
        self.assertIn(
            "types: [opened, synchronize, reopened, edited, ready_for_review]", trigger
        )
        self.assertIn("merge_group:", trigger)
        self.assertIn("workflow_dispatch:", trigger)
        self.assertNotRegex(
            trigger,
            r"(?m)^\s+paths(?:-ignore)?:",
            "a required workflow must start for every develop PR; event path filters "
            "leave required checks permanently pending when no path matches",
        )
        for forbidden in ("closed", "branches: [main]", "pull_request_target"):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, trigger)

    def test_cancels_obsolete_runs_and_uses_minimum_permissions(self) -> None:
        self.assertRegex(self.workflow, r"(?m)^permissions:\n  contents: read$")
        self.assertIn("concurrency:", self.workflow)
        self.assertIn("cancel-in-progress: true", self.workflow)

        for job_name in (
            "frontend-quality",
            "backend-quality",
            "workflow-quality",
            "quality-baseline",
            "quality-gate",
        ):
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
            "dotnet restore backend/backend.sln --locked-mode",
            "dotnet build backend/backend.sln --no-restore -c Release",
            "dotnet test backend/backend.sln --no-build --no-restore -c Release",
        ):
            self.assertIn(command, backend)
        self.assertIn('python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v', workflow)
        self.assertIn("bash .github/scripts/install_actionlint.sh .tmp/actionlint", workflow)
        self.assertIn(
            "        run: .tmp/actionlint/actionlint .github/workflows/container-ci.yml "
            ".github/workflows/container-release.yml",
            workflow.splitlines(),
        )

        quality = self.job("quality-baseline")
        for command in (
            "npm ci",
            "python -m pip install --requirement .github/quality/requirements.txt",
            "quality_baseline.py collect",
            "quality_baseline.py check",
            "quality_baseline.py render",
        ):
            self.assertIn(command, quality)
        self.assertIn("pull_request.base.sha", quality)

    def test_coverage_is_collected_per_module_and_checked_for_the_same_attempt(self) -> None:
        frontend = self.job("frontend-quality")
        backend = self.job("backend-quality")
        coverage_gate = self.job("coverage-gate")

        self.assertIn("npm run test -- --run --coverage", frontend)
        self.assertIn("collect_frontend_coverage.py", frontend)
        self.assertIn("GITHUB_SHA", frontend)
        self.assertIn("GITHUB_RUN_ID", frontend)
        self.assertIn("GITHUB_RUN_ATTEMPT", frontend)
        self.assertIn("actions/upload-artifact@", frontend)
        self.assertIn("retention-days: 30", frontend)

        self.assertIn('--collect:"XPlat Code Coverage"', backend)
        self.assertIn("collect_backend_coverage.py", backend)
        self.assertIn("GITHUB_SHA", backend)
        self.assertIn("GITHUB_RUN_ID", backend)
        self.assertIn("GITHUB_RUN_ATTEMPT", backend)
        self.assertIn("actions/upload-artifact@", backend)
        self.assertIn("retention-days: 30", backend)

        self.assertIn("if: always()", coverage_gate)
        self.assertIn("actions/download-artifact@", coverage_gate)
        self.assertIn("check_coverage.py", coverage_gate)
        self.assertIn("--metric lines", coverage_gate)
        self.assertIn("--sha", coverage_gate)
        self.assertIn("--run-id", coverage_gate)
        self.assertIn("--run-attempt", coverage_gate)
        self.assertIn("actions/upload-artifact@", coverage_gate)

    def test_semgrep_is_pinned_sanitized_and_required_by_the_gate(self) -> None:
        semgrep = self.job("semgrep")
        gate = self.job("quality-gate")
        policy = (REPOSITORY_ROOT / ".github/quality/semgrep/policy.json").read_text(
            encoding="utf-8"
        )

        self.assertIn("semgrep/semgrep:1.185.0@sha256:", semgrep)
        self.assertIn("--network none", semgrep)
        self.assertIn("--entrypoint python", semgrep)
        normalized_semgrep = re.sub(r"\s+", " ", re.sub(r"\\\s*", " ", semgrep))
        self.assertIn(
            '"$SEMGREP_IMAGE" .github/scripts/check_semgrep.py scan',
            normalized_semgrep,
        )
        self.assertIn("GITHUB_SHA", semgrep)
        self.assertIn("GITHUB_RUN_ID", semgrep)
        self.assertIn("GITHUB_RUN_ATTEMPT", semgrep)
        self.assertIn("if: always()", semgrep)
        self.assertIn("semgrep-summary.json", semgrep)
        self.assertIn("retention-days: 7", semgrep)
        self.assertIn("semgrep/semgrep:1.185.0@sha256:", policy)
        self.assertIn("- semgrep", gate)
        self.assertIn('SEMgrep_RESULT: ${{ needs.semgrep.result }}'.lower(), gate.lower())
        self.assertIn('"semgrep=$SEMgrep_RESULT"'.lower(), gate.lower())
        self.assertIn("coverage-gate", gate)

    def test_quality_gate_requires_every_upstream_job_to_succeed(self) -> None:
        gate = self.job("quality-gate")
        self.assertIn("if: always()", gate)
        self.assertIn("check_quality_gate.py", gate)
        for job_name in (
            "frontend-quality",
            "backend-quality",
            "coverage-gate",
            "semgrep",
            "auth-e2e",
            "browser-security",
            "workflow-quality",
            "quality-baseline",
            "container-scan",
        ):
            self.assertIn(f"- {job_name}", gate)
        self.assertIn("COVERAGE_RESULT: ${{ needs.coverage-gate.result }}", gate)
        self.assertIn("SEMGREP_RESULT: ${{ needs.semgrep.result }}", gate)
        self.assertIn("BROWSER_SECURITY_RESULT: ${{ needs.browser-security.result }}", gate)
        self.assertIn('"browser-security=$BROWSER_SECURITY_RESULT"', gate)
        self.assertIn('"coverage-gate=$COVERAGE_RESULT"', gate)
        self.assertIn('"semgrep=$SEMGREP_RESULT"', gate)

    def test_backend_quality_runs_postgresql_integration_and_migration_tests(self) -> None:
        backend = self.job("backend-quality")

        self.assertIn("docker info", backend)
        self.assertIn(
            "dotnet test backend/Tests/Tests.csproj --no-build --no-restore -c Release",
            backend,
        )
        self.assertIn("CredentialLifecycleMigrationTests", backend)
        self.assertIn("FullyQualifiedName~Integration", backend)
        self.assertNotIn("InMemory", backend)

    def test_auth_e2e_uses_a_disposable_synthetic_stack(self) -> None:
        e2e = self.job("auth-e2e")

        self.assertIn("timeout-minutes:", e2e)
        self.assertIn("npm ci", e2e)
        self.assertIn("npx --no-install playwright install --with-deps chromium", e2e)
        self.assertIn(
            "docker compose -f docker-compose-e2e.yml up -d --build --wait", e2e
        )
        self.assertIn("npm run test:e2e -- --project=real --project=ui", e2e)
        self.assertIn("if: always()", e2e)
        self.assertIn(
            "docker compose -f docker-compose-e2e.yml down --volumes --remove-orphans",
            e2e,
        )
        self.assertIn("if: failure()", e2e)
        self.assertIn("actions/upload-artifact@", e2e)
        self.assertIn("frontend/e2e/infra/artifacts", e2e)
        self.assertNotIn("secrets.", e2e.lower())

        self.assertLess(
            e2e.index("docker compose -f docker-compose-e2e.yml up -d --build --wait"),
            e2e.index("npm run test:e2e"),
        )
        self.assertLess(
            e2e.index("npm run test:e2e"),
            e2e.index("if: always()"),
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

    def test_scans_the_extracted_oci_layout_as_an_explicit_input(self) -> None:
        scan = self.job("container-scan")

        self.assertEqual(
            3,
            scan.count('--input "${RUNNER_TEMP}/oci-layout"'),
            "every Trivy invocation must treat the extracted OCI layout as --input",
        )

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
