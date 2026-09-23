from __future__ import annotations

import re
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
WORKFLOW_PATH = REPOSITORY_ROOT / ".github" / "workflows" / "container-ci.yml"
PLAYWRIGHT_CONFIG_PATH = REPOSITORY_ROOT / "frontend" / "playwright.config.ts"
DESIGN_VALIDATION_STEPS = (
    (
        "Run design validator tests",
        "python -m unittest discover -s scripts/tests -p 'test_check_design_coverage.py' -v",
    ),
    (
        "Validate design coverage inventory",
        "python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design --final",
    ),
)


class DesignQualityWorkflowTests(unittest.TestCase):
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

    def step(self, job: str, name: str) -> str:
        match = re.search(
            rf"(?ms)^      - name: {re.escape(name)}\n(?P<body>.*?)(?=^      - name:|\Z)",
            job,
        )
        self.assertIsNotNone(match, f"missing step: {name}")
        return match.group("body")

    def test_design_validator_runs_from_repository_root_in_frontend_quality(self) -> None:
        frontend = self.job("frontend-quality")

        self.assertRegex(
            frontend,
            r"(?m)^      - name: Set up Python\n        uses: actions/setup-python@[0-9a-f]{40}(?:\s+#.*)?$",
        )

        for step_name, command in DESIGN_VALIDATION_STEPS:
            with self.subTest(step=step_name):
                step = self.step(frontend, step_name)
                self.assertIn("working-directory: ${{ github.workspace }}", step)
                self.assertIn(command, step)
                self.assertNotIn("continue-on-error:", step)

    def test_design_quality_remains_a_pre_merge_required_gate(self) -> None:
        trigger = self.workflow.split("permissions:", 1)[0]
        self.assertIn("pull_request:", trigger)
        self.assertIn("merge_group:", trigger)

        gate = self.job("quality-gate")
        self.assertIn("if: always()", gate)
        self.assertIn("check_quality_gate.py", gate)
        for required_job in ("frontend-quality", "auth-e2e"):
            with self.subTest(job=required_job):
                self.assertIn(f"- {required_job}", gate)
                self.assertIn(f'--job "{required_job}=', gate)

    def test_auth_e2e_keeps_ui_and_real_projects(self) -> None:
        auth_e2e = self.job("auth-e2e")
        self.assertIn("npm run test:e2e", auth_e2e)

        playwright_config = PLAYWRIGHT_CONFIG_PATH.read_text(encoding="utf-8")
        for project_name in ("name: 'real'", "name: 'ui'"):
            with self.subTest(project=project_name):
                self.assertIn(project_name, playwright_config)


if __name__ == "__main__":
    unittest.main()
