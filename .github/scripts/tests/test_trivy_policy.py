from __future__ import annotations

import unittest
from pathlib import Path

import yaml


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
POLICY_PATH = REPOSITORY_ROOT / ".trivy.yaml"


class TrivyPolicyTests(unittest.TestCase):
    def setUp(self) -> None:
        self.assertTrue(POLICY_PATH.is_file(), ".trivy.yaml must exist")
        self.raw_policy = POLICY_PATH.read_text(encoding="utf-8")
        self.policy = yaml.safe_load(self.raw_policy)

    def test_policy_enforces_the_blocking_vulnerability_contract(self) -> None:
        self.assertEqual(["vuln"], self.policy["scan"]["scanners"])
        self.assertEqual({"os", "library"}, set(self.policy["pkg"]["types"]))
        self.assertEqual({"HIGH", "CRITICAL"}, set(self.policy["severity"]))
        self.assertIs(True, self.policy["vulnerability"]["ignore-unfixed"])
        self.assertEqual(1, self.policy["exit-code"])

    def test_policy_does_not_use_ignored_legacy_top_level_keys(self) -> None:
        for ignored_key in ("scanners", "pkg-types", "ignore-unfixed"):
            with self.subTest(ignored_key=ignored_key):
                self.assertNotIn(ignored_key, self.policy)

    def test_policy_has_no_suppressions_or_credentials(self) -> None:
        serialized = self.raw_policy.lower()
        for forbidden in (
            "trivyignore",
            "ignore-policy",
            "ignorefile",
            "password",
            "username",
            "token",
            "http://",
            "https://",
        ):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, serialized)


if __name__ == "__main__":
    unittest.main()
