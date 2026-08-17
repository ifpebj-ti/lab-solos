import unittest
from pathlib import Path
import re


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
INSTALLER = REPOSITORY_ROOT / ".github" / "scripts" / "install_actionlint.sh"


class ActionlintInstallerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.script = INSTALLER.read_text(encoding="utf-8")

    def test_installer_pins_official_release_and_verifies_attestation(self) -> None:
        self.assertIn('ACTIONLINT_VERSION="1.7.12"', self.script)
        self.assertIn('ACTIONLINT_REPOSITORY="rhysd/actionlint"', self.script)
        self.assertIn('ACTIONLINT_ARCHIVE="actionlint_1.7.12_linux_amd64.tar.gz"', self.script)
        self.assertIn('gh release download "v$ACTIONLINT_VERSION"', self.script)
        self.assertIn('gh attestation verify "$archive_path" --repo "$ACTIONLINT_REPOSITORY"', self.script)

    def test_verification_precedes_extraction_and_installation(self) -> None:
        verification = self.script.index("gh attestation verify")
        extraction = self.script.index("tar -xzf")
        installation = self.script.index("install -m 0755")

        self.assertLess(verification, extraction)
        self.assertLess(extraction, installation)

    def test_errors_propagate_and_temporary_files_are_removed(self) -> None:
        self.assertIn("set -euo pipefail", self.script)
        self.assertIn("temporary_directory=$(mktemp -d)", self.script)
        self.assertIn("trap 'rm -rf -- \"$temporary_directory\"' EXIT", self.script)
        self.assertNotRegex(self.script, r"gh (?:release download|attestation verify)[^\n]*(?:\|\||&&|;) true")

    def test_installs_only_in_requested_directory_and_checks_version(self) -> None:
        self.assertIn('readonly destination=$1', self.script)
        self.assertIn('install -m 0755 "$temporary_directory/actionlint" "$destination/actionlint"', self.script)
        self.assertIn('version_output=$("$destination/actionlint" -version)', self.script)
        self.assertIn("installed_version=${version_output%%$'\\n'*}", self.script)
        self.assertIn('[[ "$installed_version" != "$ACTIONLINT_VERSION" ]]', self.script)

    def test_avoids_mutable_or_sensitive_download_patterns(self) -> None:
        lowered = self.script.lower()
        self.assertNotIn("latest", lowered)
        self.assertNotIn("curl", lowered)
        self.assertNotIn("github_token", lowered)
        self.assertNotIn("gh api", lowered)
        self.assertNotIn("--json", lowered)
        self.assertIsNone(re.search(r"gh attestation verify[^\n]*>", self.script))


if __name__ == "__main__":
    unittest.main()
