from __future__ import annotations

import hashlib
import io
import os
import shutil
import subprocess
import tarfile
import tempfile
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
INSTALLER_PATH = REPOSITORY_ROOT / ".github" / "scripts" / "install_trivy.sh"
BASH = shutil.which("bash")
if os.name == "nt":
    git_bash = Path(r"C:\Program Files\Git\bin\bash.exe")
    if git_bash.is_file():
        BASH = str(git_bash)


def _portable(path: Path) -> str:
    portable = path.resolve().as_posix()
    if os.name == "nt" and len(portable) >= 3 and portable[1:3] == ":/":
        return f"/{portable[0].lower()}{portable[2:]}"
    return portable


class TrivyInstallerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.assertTrue(INSTALLER_PATH.is_file(), "install_trivy.sh must exist")

    def _fixture(self, root: Path, valid_checksum: bool) -> tuple[Path, Path]:
        fixture_dir = root / "fixtures"
        fake_bin = root / "bin"
        fixture_dir.mkdir()
        fake_bin.mkdir()

        archive = fixture_dir / "trivy_0.72.0_Linux-64bit.tar.gz"
        payload = b"#!/usr/bin/env sh\necho 'Version: 0.72.0'\n"
        info = tarfile.TarInfo("trivy")
        info.size = len(payload)
        info.mode = 0o755
        with tarfile.open(archive, "w:gz") as bundle:
            bundle.addfile(info, io.BytesIO(payload))

        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        if not valid_checksum:
            digest = "0" * 64
        (fixture_dir / "trivy_0.72.0_checksums.txt").write_text(
            f"{digest}  {archive.name}\n", encoding="utf-8"
        )

        (fake_bin / "uname").write_text(
            "#!/usr/bin/env sh\n[ \"${1:-}\" = '-m' ] && echo x86_64 || echo Linux\n",
            encoding="utf-8",
        )
        (fake_bin / "curl").write_text(
            "#!/usr/bin/env sh\n"
            "set -eu\n"
            "output=''\n"
            "url=''\n"
            "while [ \"$#\" -gt 0 ]; do\n"
            "  case \"$1\" in\n"
            "    -o|--output) output=$2; shift 2 ;;\n"
            "    -*) shift ;;\n"
            "    *) url=$1; shift ;;\n"
            "  esac\n"
            "done\n"
            "cp \"$TRIVY_FIXTURES/${url##*/}\" \"$output\"\n",
            encoding="utf-8",
        )
        os.chmod(fake_bin / "uname", 0o755)
        os.chmod(fake_bin / "curl", 0o755)
        return fixture_dir, fake_bin

    def _run_installer(self, valid_checksum: bool) -> tuple[subprocess.CompletedProcess[str], Path]:
        if not BASH:
            self.skipTest("bash is required to exercise the installer")
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        fixture_dir, fake_bin = self._fixture(root, valid_checksum)
        destination = root / "destination"
        environment = os.environ.copy()
        environment["TRIVY_FIXTURES"] = _portable(fixture_dir)
        completed = subprocess.run(
            [
                BASH,
                "-c",
                'export PATH="$1:$PATH"; exec /usr/bin/bash "$2" "$3"',
                "installer-test",
                _portable(fake_bin),
                _portable(INSTALLER_PATH),
                _portable(destination),
            ],
            cwd=REPOSITORY_ROOT,
            env=environment,
            text=True,
            capture_output=True,
            check=False,
        )
        return completed, destination

    def test_installs_fixed_version_in_requested_directory(self) -> None:
        completed, destination = self._run_installer(valid_checksum=True)
        self.assertEqual(0, completed.returncode, completed.stderr)
        self.assertTrue((destination / "trivy").is_file())
        self.assertIn("0.72.0", completed.stdout)

    def test_rejects_a_divergent_published_checksum(self) -> None:
        completed, destination = self._run_installer(valid_checksum=False)
        self.assertNotEqual(0, completed.returncode)
        self.assertFalse((destination / "trivy").exists())
        self.assertIn("checksum", (completed.stdout + completed.stderr).lower())

    def test_source_uses_immutable_official_release_and_checksum(self) -> None:
        source = INSTALLER_PATH.read_text(encoding="utf-8")
        self.assertIn('TRIVY_VERSION="0.72.0"', source)
        self.assertIn('TRIVY_REPOSITORY="aquasecurity/trivy"', source)
        self.assertIn("/releases/download/", source)
        self.assertIn("checksums.txt", source)
        self.assertIn("sha256sum", source)
        self.assertNotIn("latest", source.lower())


if __name__ == "__main__":
    unittest.main()
