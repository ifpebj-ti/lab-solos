from __future__ import annotations

import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
WORKFLOW_PATH = ROOT / ".github" / "workflows" / "container-ci.yml"


class BrowserSecurityWorkflowTests(unittest.TestCase):
    def setUp(self) -> None:
        self.workflow = WORKFLOW_PATH.read_text(encoding="utf-8")

    def job(self) -> str:
        match = re.search(
            r"(?ms)^  browser-security:\n(?P<body>.*?)(?=^  [a-z][a-z0-9_-]*:\n|\Z)",
            self.workflow,
        )
        self.assertIsNotNone(match, "missing required browser-security job")
        return match.group("body")

    def test_runs_the_fixed_security_stack_and_focused_browser_project(self) -> None:
        job = self.job()
        normalized_job = re.sub(r"\s+", " ", job)

        self.assertIn("runs-on: ubuntu-latest", job)
        self.assertIn('SECURITY_E2E_HTTPS_PORT: "18443"', job)
        self.assertIn(
            "docker compose --project-name lab-solos-ci-browser-security "
            "--file docker-compose-security-e2e.yml config --quiet",
            normalized_job,
        )
        self.assertIn(
            "docker compose --project-name lab-solos-ci-browser-security "
            "--file docker-compose-security-e2e.yml up --detach --build --wait",
            normalized_job,
        )
        self.assertIn("npm run test:e2e -- --project=security", job)
        self.assertNotIn("secrets.", job.lower())

    def test_uploads_only_sanitized_summary_and_report_even_after_failure(self) -> None:
        job = self.job()

        self.assertIn("steps.security-tests.outcome", job)
        self.assertIn('printf \'browser-security=%s\\n\' "$SECURITY_E2E_OUTCOME"', job)
        self.assertIn("if: always()", job)
        self.assertIn("actions/upload-artifact@", job)
        self.assertIn("${{ runner.temp }}/browser-security-summary.txt", job)
        self.assertIn("frontend/e2e/infra/artifacts/report", job)
        self.assertIn("retention-days: 7", job)
        self.assertNotIn("test-results", job)
        self.assertNotIn("docker compose logs", job)

        config = (ROOT / "frontend" / "playwright.config.ts").read_text(encoding="utf-8")
        security_project = config.split("name: 'security'", 1)[1]
        self.assertIn("trace: 'off'", security_project)
        self.assertIn("screenshot: 'off'", security_project)

    def test_always_cleans_only_the_named_disposable_security_project(self) -> None:
        job = self.job()
        cleanup_step = job.split("- name: Remove disposable security stack", 1)[1]
        normalized_cleanup = re.sub(r"\s+", " ", cleanup_step)
        self.assertIn("if: always()", cleanup_step)
        self.assertIn(
            "docker compose --project-name lab-solos-ci-browser-security "
            "--file docker-compose-security-e2e.yml down --volumes --remove-orphans",
            normalized_cleanup,
        )
        self.assertNotIn("docker compose -f docker-compose-e2e.yml down", job)

    def test_pre_merge_workflow_has_no_path_filter_and_requires_the_job(self) -> None:
        trigger = self.workflow.split("permissions:", 1)[0]
        self.assertIn("pull_request:", trigger)
        self.assertIn("branches: [develop]", trigger)
        self.assertIn("merge_group:", trigger)
        self.assertNotRegex(trigger, r"(?m)^\s+paths(?:-ignore)?:")
        self.assertLess(self.workflow.index("  browser-security:"), self.workflow.index("  quality-gate:"))


if __name__ == "__main__":
    unittest.main()
