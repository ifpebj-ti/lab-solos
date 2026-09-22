from __future__ import annotations

import re
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
WORKFLOW_PATH = REPOSITORY_ROOT / ".github" / "workflows" / "documentation-quality.yml"


class DocumentationWorkflowTests(unittest.TestCase):
    def _workflow(self) -> str:
        self.assertTrue(WORKFLOW_PATH.is_file(), "documentation workflow is missing")
        return WORKFLOW_PATH.read_text(encoding="utf-8")

    def _job(self, workflow: str) -> str:
        match = re.search(
            r"(?ms)^  documentation-quality:\n(?P<body>.*?)(?=^  [a-z][a-z0-9_-]*:\n|\Z)",
            workflow,
        )
        self.assertIsNotNone(match, "missing documentation quality job")
        return match.group("body")

    def test_declares_the_required_pre_merge_triggers(self) -> None:
        workflow = self._workflow()
        trigger = workflow.split("permissions:", 1)[0]

        self.assertRegex(
            trigger,
            r"(?m)^  pull_request:\n"
            r"    branches: \[develop\]\n"
            r"    types: \[opened, synchronize, reopened, ready_for_review\]$",
        )
        self.assertIn("  merge_group:", trigger)
        self.assertIn("  workflow_dispatch:", trigger)

    def test_is_a_read_only_gate_with_pinned_actions(self) -> None:
        workflow = self._workflow()

        self.assertRegex(workflow, r"(?m)^permissions:\n  contents: read$")
        self.assertNotRegex(workflow, r"(?mi)^\s+[A-Za-z0-9_-]+:\s+write\s*$")
        references = re.findall(r"(?m)^\s+uses:\s+([^\s#]+)", workflow)
        self.assertGreater(len(references), 0)
        for reference in references:
            with self.subTest(reference=reference):
                self.assertRegex(reference, r"^[^@]+@[0-9a-f]{40}$")

        self.assertIn("concurrency:", workflow)
        self.assertIn("cancel-in-progress: true", workflow)

    def test_reads_and_checks_out_the_manifest_wiki_sha_exactly(self) -> None:
        workflow = self._workflow()
        job = self._job(workflow)

        self.assertIn("referenciaWiki", job)
        self.assertIn('re.fullmatch(r"[0-9a-f]{40}", reference)', job)
        self.assertIn("GITHUB_OUTPUT", job)
        self.assertIn("repository: ifpebj-ti/lab-solos.wiki", job)
        self.assertIn("ref: ${{ steps.manifest.outputs.wiki_sha }}", job)
        self.assertIn("path: .tmp/lab-solos.wiki", job)
        self.assertIn("fetch-depth: 1", job)
        self.assertIn("persist-credentials: false", job)
        self.assertIn("git -C .tmp/lab-solos.wiki rev-parse HEAD", job)
        self.assertIn('test "$(git -C .tmp/lab-solos.wiki rev-parse HEAD)" = "$WIKI_SHA"', job)

        wiki_checkout = job.split("Checkout fixed Wiki candidate", 1)[1].split(
            "- name:", 1
        )[0]
        self.assertNotRegex(wiki_checkout, r"(?m)^\s+ref:\s+(?:main|master|develop)\s*$")

    def test_runs_focused_checks_both_modes_and_the_negative_case(self) -> None:
        workflow = self._workflow()
        job = self._job(workflow)
        normalised_job = " ".join(job.split())
        manifest = ".codex/docs/specs/documentacao-primeira-entrega/documentacao.json"
        base = (
            "python .github/scripts/check_delivery_docs.py --repository . "
            "--wiki .tmp/lab-solos.wiki --manifest " + manifest
        )

        self.assertIn(
            'python -m unittest discover -s .github/scripts/tests -p "test_delivery_docs*.py" -v',
            job,
        )
        self.assertIn(base + " --mode editorial", normalised_job)
        self.assertIn(base + " --mode compose", normalised_job)
        self.assertIn("LABON_IMAGE_VERSION", job)
        self.assertIn("docker-compose-prod.yml", job)
        self.assertRegex(job, r"returncode\s*!=\s*1")

    def test_does_not_publish_or_execute_wiki_content(self) -> None:
        workflow = self._workflow().casefold()
        for forbidden in (
            "git push",
            "git commit",
            "gh ",
            "pull_request_target:",
            "docker compose up",
            "docker compose down",
            "working-directory: .tmp/lab-solos.wiki",
        ):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, workflow)


if __name__ == "__main__":
    unittest.main()
