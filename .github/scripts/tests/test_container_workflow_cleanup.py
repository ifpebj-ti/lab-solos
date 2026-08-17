from __future__ import annotations

import re
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
WORKFLOWS_DIRECTORY = REPOSITORY_ROOT / ".github" / "workflows"
DEPENDABOT_PATH = REPOSITORY_ROOT / ".github" / "dependabot.yml"
README_PATH = REPOSITORY_ROOT / "README.md"

LEGACY_WORKFLOWS = (
    WORKFLOWS_DIRECTORY / "pipeline-front.yml",
    WORKFLOWS_DIRECTORY / "pipeline-back.yml",
)
CURRENT_WORKFLOWS = (
    WORKFLOWS_DIRECTORY / "container-ci.yml",
    WORKFLOWS_DIRECTORY / "container-release.yml",
)
FORBIDDEN_PATTERNS = {
    "Azure login action": re.compile(r"azure/login", re.IGNORECASE),
    "Azure Container Apps deployment": re.compile(
        r"container-apps-deploy", re.IGNORECASE
    ),
    "Docker Scout command": re.compile(r"docker\s+scout", re.IGNORECASE),
    "Docker Scout installer": re.compile(r"scout-cli", re.IGNORECASE),
    "Docker Hub credential": re.compile(r"DOCKERHUB_", re.IGNORECASE),
    "Azure credential": re.compile(r"AZURE_CREDENTIALS", re.IGNORECASE),
    "legacy frontend workflow": re.compile(r"pipeline-front\.yml", re.IGNORECASE),
    "legacy backend workflow": re.compile(r"pipeline-back\.yml", re.IGNORECASE),
}


def operational_files() -> tuple[Path, ...]:
    workflow_files = sorted(
        path
        for pattern in ("*.yml", "*.yaml")
        for path in WORKFLOWS_DIRECTORY.glob(pattern)
    )
    return tuple(workflow_files) + (DEPENDABOT_PATH, README_PATH)


class ContainerWorkflowCleanupTests(unittest.TestCase):
    maxDiff = None

    def test_legacy_workflows_are_removed(self) -> None:
        for path in LEGACY_WORKFLOWS:
            with self.subTest(path=path.relative_to(REPOSITORY_ROOT)):
                self.assertFalse(path.exists(), f"legacy workflow still exists: {path}")

    def test_readme_badges_reference_existing_current_workflows(self) -> None:
        readme = README_PATH.read_text(encoding="utf-8")
        for workflow in CURRENT_WORKFLOWS:
            with self.subTest(workflow=workflow.name):
                self.assertTrue(workflow.is_file(), f"current workflow is missing: {workflow}")
                badge_path = f"actions/workflows/{workflow.name}/badge.svg"
                self.assertIn(badge_path, readme)

    def test_operational_files_do_not_reference_retired_integrations(self) -> None:
        findings: list[str] = []
        for path in operational_files():
            self.assertTrue(path.is_file(), f"operational file is missing: {path}")
            content = path.read_text(encoding="utf-8")
            for description, pattern in FORBIDDEN_PATTERNS.items():
                for match in pattern.finditer(content):
                    line = content.count("\n", 0, match.start()) + 1
                    findings.append(
                        f"{path.relative_to(REPOSITORY_ROOT)}:{line}: {description}"
                    )

        self.assertEqual([], findings, "retired operational references:\n" + "\n".join(findings))


if __name__ == "__main__":
    unittest.main()
