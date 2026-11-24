import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "check_release_changelog.py"
FIXTURES = Path(__file__).with_name("fixtures") / "release_changelog"
VERSION = "2.7.5"
SHA = "0123456789abcdef0123456789abcdef01234567"
RELEASE_URL_PREFIX = "https://github.com/ifpebj-ti/lab-solos/releases/tag/"
RELEASE_URL = f"{RELEASE_URL_PREFIX}{VERSION}"
HEADING = f"## [{VERSION}]({RELEASE_URL}) — 2026-11-10"


class CheckReleaseChangelogTests(unittest.TestCase):
    def run_cli(self, changelog, version=VERSION):
        return subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--version",
                version,
                "--sha",
                SHA,
                "--changelog",
                str(changelog),
            ],
            check=False,
            capture_output=True,
            encoding="utf-8",
        )

    def run_content(self, content):
        with tempfile.TemporaryDirectory() as directory:
            changelog = Path(directory) / "CHANGELOG.md"
            changelog.write_text(content, encoding="utf-8")
            return self.run_cli(changelog)

    def assert_rejected(self, result, message, version=VERSION):
        self.assertEqual(1, result.returncode, result.stderr)
        self.assertIn(version, result.stderr)
        self.assertIn(SHA, result.stderr)
        self.assertIn(message, result.stderr)

    def test_approves_exact_release_heading(self):
        result = self.run_cli(FIXTURES / "valid.md")
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertIn(VERSION, result.stdout)
        self.assertIn(SHA, result.stdout)

    def test_rejects_heading_without_iso_format(self):
        result = self.run_cli(FIXTURES / "invalid_format.md")
        self.assert_rejected(result, "invalid release heading")

    def test_rejects_impossible_date_and_mismatched_release_url(self):
        for heading in (
            HEADING.replace("2026-11-10", "2026-02-30"),
            HEADING.replace(RELEASE_URL, f"{RELEASE_URL_PREFIX}2.7.4"),
            HEADING.replace(RELEASE_URL, RELEASE_URL.replace("/lab-solos/", "/other/")),
        ):
            with self.subTest(heading=heading):
                self.assert_rejected(self.run_content(heading), "invalid release heading")

    def test_rejects_duplicate_release_headings(self):
        result = self.run_cli(FIXTURES / "duplicate.md")
        self.assert_rejected(result, "multiple release headings")

    def test_rejects_valid_heading_accompanied_by_an_ambiguous_heading(self):
        for ambiguous in (
            f"## [{VERSION} / 2.7.6]",
            f"## [2.7.6 / {VERSION}]",
            f"## [2.7.6]({RELEASE_URL_PREFIX}2.7.6) / [{VERSION}]({RELEASE_URL})",
        ):
            with self.subTest(ambiguous=ambiguous):
                result = self.run_content(f"{HEADING}\n\n{ambiguous}\n")
                self.assert_rejected(result, "multiple release headings")

    def test_ignores_mentions_in_body_and_markdown_examples(self):
        result = self.run_cli(FIXTURES / "examples.md")
        self.assert_rejected(result, "no release heading")

    def test_ignores_similar_versions(self):
        result = self.run_cli(FIXTURES / "similar_versions.md")
        self.assert_rejected(result, "no release heading")

    def test_rejects_unreleased_section_only(self):
        result = self.run_cli(FIXTURES / "unreleased.md")
        self.assert_rejected(result, "no release heading")

    def test_rejects_noncanonical_requested_version(self):
        version = "v2.7.5"
        result = self.run_cli(FIXTURES / "valid.md", version)
        self.assert_rejected(result, "canonical SemVer", version)

    def test_reports_file_read_failure_with_release_context(self):
        result = self.run_cli(FIXTURES / "missing.md")
        self.assert_rejected(result, "could not read changelog")


if __name__ == "__main__":
    unittest.main()
