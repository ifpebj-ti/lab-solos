from __future__ import annotations

import re
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
WORKFLOW_PATH = REPOSITORY_ROOT / ".github" / "workflows" / "container-ci.yml"
MANUAL_VALIDATION_COMMAND = (
    "python .github/scripts/check_manual.py --source docs/manual"
)
PYTHON_CONTRACT_COMMAND = (
    'python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v'
)
FORBIDDEN_MANUAL_STEP_CONTENT = (
    "--external",
    "secrets.",
    "github.token",
    "gh release",
    "curl ",
    "wget ",
    "git push",
    "docker login",
    "|| true",
    "exit 0",
)


class ManualWorkflowTests(unittest.TestCase):
    def setUp(self) -> None:
        self.workflow = (
            WORKFLOW_PATH.read_text(encoding="utf-8") if WORKFLOW_PATH.exists() else ""
        )

    def workflow_job(self, name: str) -> str:
        match = re.search(
            rf"(?ms)^  {re.escape(name)}:\n(?P<body>.*?)(?=^  [a-z][a-z0-9_-]*:\n|\Z)",
            self.workflow,
        )
        self.assertIsNotNone(match, f"missing independent job: {name}")
        return match.group("body")

    def named_step(self, job: str, name: str) -> str:
        match = re.search(
            rf"(?ms)^      - name: {re.escape(name)}\n"
            r"(?P<body>.*?)(?=^      - name: |\Z)",
            job,
        )
        self.assertIsNotNone(match, f"missing workflow step: {name}")
        return match.group("body")

    def assert_step_excludes(self, step: str, forbidden: tuple[str, ...]) -> None:
        lowered = step.lower()
        for marker in forbidden:
            with self.subTest(forbidden=marker):
                self.assertNotIn(marker, lowered)

    def test_validates_the_real_manual_in_workflow_quality(self) -> None:
        job = self.workflow_job("workflow-quality")
        step = self.named_step(job, "Validate manual source")

        self.assertEqual(1, job.count(MANUAL_VALIDATION_COMMAND))
        self.assertRegex(
            step,
            rf"(?m)^        run: {re.escape(MANUAL_VALIDATION_COMMAND)}$",
        )

    def test_manual_validation_step_is_strict_and_local(self) -> None:
        job = self.workflow_job("workflow-quality")
        step = self.named_step(job, "Validate manual source")

        self.assertNotRegex(step, r"(?m)^\s+(?:if|continue-on-error):")
        self.assert_step_excludes(step, FORBIDDEN_MANUAL_STEP_CONTENT)

    def test_manual_check_runs_after_existing_python_contract_tests(self) -> None:
        job = self.workflow_job("workflow-quality")

        self.assertIn(PYTHON_CONTRACT_COMMAND, job)
        self.assertIn(MANUAL_VALIDATION_COMMAND, job)
        self.assertLess(
            job.index(PYTHON_CONTRACT_COMMAND), job.index(MANUAL_VALIDATION_COMMAND)
        )

    def test_remains_a_pre_merge_read_only_gate_for_develop_prs(self) -> None:
        trigger = self.workflow.split("permissions:", 1)[0]

        self.assertIn("pull_request:", trigger)
        self.assertIn("branches: [develop]", trigger)
        self.assertIn(
            "types: [opened, synchronize, reopened, edited, ready_for_review]", trigger
        )
        self.assertIn("merge_group:", trigger)
        self.assertIn("workflow_dispatch:", trigger)
        self.assertNotRegex(trigger, r"(?m)^\s+paths(?:-ignore)?:")
        self.assertRegex(self.workflow, r"(?m)^permissions:\n  contents: read$")

    def test_preserves_full_sha_pins_and_does_not_add_write_permissions(self) -> None:
        for reference in re.findall(r"(?m)^\s+uses:\s+([^\s#]+)", self.workflow):
            with self.subTest(reference=reference):
                self.assertRegex(reference, r"^[^@]+@[0-9a-f]{40}$")

        job = self.workflow_job("workflow-quality")
        self.assertNotIn("security-events: write", job)
        self.assertNotIn("actions: write", job)
        self.assertNotIn("contents: write", job)


if __name__ == "__main__":
    unittest.main()
