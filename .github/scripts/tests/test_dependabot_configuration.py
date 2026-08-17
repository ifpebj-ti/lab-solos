import re
import unittest
from pathlib import Path


CONFIG = Path(__file__).resolve().parents[2] / "dependabot.yml"
ENTRY_PATTERN = re.compile(
    r'^  - package-ecosystem: "(?P<ecosystem>[^"]+)"\n'
    r'(?P<body>.*?)(?=^  - package-ecosystem:|\Z)',
    flags=re.DOTALL | re.MULTILINE,
)


class DependabotConfigurationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.config = CONFIG.read_text(encoding="utf-8")
        cls.entries = [
            (match.group("ecosystem"), match.group(0))
            for match in ENTRY_PATTERN.finditer(cls.config)
        ]

    def entries_for(self, ecosystem: str, applies_to: str) -> list[str]:
        return [
            entry
            for entry_ecosystem, entry in self.entries
            if entry_ecosystem == ecosystem
            and f'applies-to: "{applies_to}"' in entry
        ]

    def test_groups_version_updates_for_develop(self) -> None:
        expected_entries = {
            "npm": ("/frontend", "npm-version-updates", "Frontend"),
            "nuget": ("/backend", "nuget-version-updates", "Backend"),
        }

        for ecosystem, (directory, group, area_label) in expected_entries.items():
            entries = self.entries_for(ecosystem, "version-updates")
            self.assertEqual(1, len(entries))
            entry = entries[0]
            self.assertIn(f'directory: "{directory}"', entry)
            self.assertRegex(entry, r'schedule:\s+interval: "weekly"')
            self.assertIn('target-branch: "develop"', entry)
            self.assertIn("open-pull-requests-limit: 5", entry)
            self.assertIn(f"{group}:", entry)
            self.assertRegex(entry, r'patterns:\s+\- "\*"')
            self.assertIn('- "DevSecOps"', entry)
            self.assertIn(f'- "{area_label}"', entry)

    def test_groups_security_updates_for_default_branch(self) -> None:
        expected_entries = {
            "npm": ("/frontend", "npm-security-updates", "Frontend"),
            "nuget": ("/backend", "nuget-security-updates", "Backend"),
        }

        for ecosystem, (directory, group, area_label) in expected_entries.items():
            entries = self.entries_for(ecosystem, "security-updates")
            self.assertEqual(1, len(entries))
            entry = entries[0]
            self.assertIn(f'directory: "{directory}"', entry)
            self.assertRegex(entry, r'schedule:\s+interval: "weekly"')
            self.assertNotIn("target-branch:", entry)
            self.assertIn("open-pull-requests-limit: 0", entry)
            self.assertIn(f"{group}:", entry)
            self.assertRegex(entry, r'patterns:\s+\- "\*"')
            self.assertIn('- "DevSecOps"', entry)
            self.assertIn(f'- "{area_label}"', entry)

    def test_updates_github_actions_weekly_on_develop(self) -> None:
        actions_entries = self.entries_for("github-actions", "version-updates")

        self.assertEqual(1, len(actions_entries))
        entry = actions_entries[0]
        self.assertIn('directory: "/"', entry)
        self.assertRegex(entry, r'schedule:\s+interval: "weekly"')
        self.assertIn('target-branch: "develop"', entry)
        self.assertRegex(entry, r"open-pull-requests-limit: [1-9]\d*")
        self.assertRegex(entry, r'patterns:\s+\- "\*"')
        self.assertIn('- "DevSecOps"', entry)
        self.assertNotRegex(entry, r"(?i)permission|secret|\$\{\{")


if __name__ == "__main__":
    unittest.main()
