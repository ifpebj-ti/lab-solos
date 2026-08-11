import re
import unittest
from pathlib import Path


CONFIG = Path(__file__).resolve().parents[2] / "dependabot.yml"


class DependabotConfigurationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.config = CONFIG.read_text(encoding="utf-8")

    def test_groups_version_updates_for_develop(self) -> None:
        self.assertEqual(2, self.config.count('target-branch: "develop"'))
        self.assertEqual(2, self.config.count('applies-to: "version-updates"'))
        self.assertIn("npm-version-updates:", self.config)
        self.assertIn("nuget-version-updates:", self.config)

    def test_groups_security_updates_for_default_branch(self) -> None:
        self.assertEqual(2, self.config.count('applies-to: "security-updates"'))
        self.assertIn("npm-security-updates:", self.config)
        self.assertIn("nuget-security-updates:", self.config)

        security_entries = re.findall(
            r'- package-ecosystem: "(?:npm|nuget)"(?:(?!- package-ecosystem:).)*?'
            r'applies-to: "security-updates"(?:(?!- package-ecosystem:).)*',
            self.config,
            flags=re.DOTALL,
        )
        self.assertEqual(2, len(security_entries))
        for entry in security_entries:
            self.assertNotIn("target-branch:", entry)
            self.assertIn("open-pull-requests-limit: 0", entry)
            self.assertRegex(entry, r'patterns:\s+\- "\*"')


if __name__ == "__main__":
    unittest.main()
