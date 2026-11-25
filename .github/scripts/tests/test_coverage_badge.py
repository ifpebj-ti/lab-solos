from __future__ import annotations

import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
README = ROOT / "README.md"


class CoverageBadgeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.readme = README.read_text(encoding="utf-8")
        match = re.search(
            r"(?ms)^## Cobertura de testes\s*(?P<section>.*?)(?=^## |\Z)",
            self.readme,
        )
        self.assertIsNotNone(match, "missing the coverage documentation section")
        self.section = match.group("section")

    def test_each_badge_links_to_container_ci_runs_for_develop(self) -> None:
        for metric in ("lines", "branches"):
            with self.subTest(metric=metric):
                self.assertRegex(
                    self.readme,
                    rf"\[!\[coverage-{metric}\]\(https://raw\.githubusercontent\.com/ifpebj-ti/lab-solos/coverage/coverage-{metric}\.svg\)\]"
                    rf"\(https://github\.com/ifpebj-ti/lab-solos/actions/workflows/container-ci\.yml\?query=branch%3Adevelop\)",
                )

    def test_explains_the_branch_gate_and_line_report_scope(self) -> None:
        for expected in (
            "coverage-html",
            "frontend e backend",
            "70%",
            "branches",
            "linhas",
            "SHA",
            "run_id",
            "run_attempt",
            "30 dias",
            "testes",
            "código gerado",
            "migrações",
        ):
            with self.subTest(expected=expected):
                self.assertIn(expected.casefold(), self.section.casefold())

    def test_does_not_publish_stale_local_percentages(self) -> None:
        self.assertNotIn("84,51%", self.section)
        self.assertNotIn("86,00%", self.section)


if __name__ == "__main__":
    unittest.main()
