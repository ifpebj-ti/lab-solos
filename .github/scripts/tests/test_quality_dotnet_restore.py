import json
import shutil
import subprocess
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
TOOLCHAIN_PATH = REPOSITORY_ROOT / ".github" / "quality" / "toolchain.json"
GLOBAL_JSON_PATH = REPOSITORY_ROOT / "global.json"
PROPS_PATH = REPOSITORY_ROOT / "backend" / "Directory.Build.props"
SOLUTION_PATH = REPOSITORY_ROOT / "backend" / "backend.sln"
PROJECT_LOCKS = (
    REPOSITORY_ROOT / "backend" / "Tests" / "packages.lock.json",
    REPOSITORY_ROOT
    / "backend"
    / "LabSolos-Server-DotNet8"
    / "packages.lock.json",
)


class DotnetRestoreContractTests(unittest.TestCase):
    def test_sdk_is_pinned_to_toolchain_without_roll_forward(self):
        self.assertTrue(GLOBAL_JSON_PATH.is_file(), "global.json deve existir")
        global_config = json.loads(GLOBAL_JSON_PATH.read_text(encoding="utf-8"))
        toolchain = json.loads(TOOLCHAIN_PATH.read_text(encoding="utf-8"))

        sdk = global_config["sdk"]
        self.assertEqual(sdk["version"], toolchain["tools"]["dotnet"]["required"])
        self.assertEqual(sdk["rollForward"], "disable")
        self.assertFalse(sdk["allowPrerelease"])

    def test_common_props_enable_lock_file_generation_and_ci_locking(self):
        self.assertTrue(PROPS_PATH.is_file(), "Directory.Build.props deve existir")
        root = ET.fromstring(PROPS_PATH.read_text(encoding="utf-8"))
        values = {
            element.tag.rsplit("}", 1)[-1]: (element.text or "").strip().lower()
            for element in root.iter()
        }

        self.assertEqual(values.get("RestorePackagesWithLockFile"), "true")
        self.assertEqual(values.get("RestoreLockedMode"), "true")

    def test_both_projects_have_lock_files(self):
        for lock_path in PROJECT_LOCKS:
            with self.subTest(lock_path=lock_path):
                self.assertTrue(lock_path.is_file(), f"lock ausente: {lock_path}")
                lock = json.loads(lock_path.read_text(encoding="utf-8"))
                self.assertEqual(lock["version"], 1)
                self.assertIn("dependencies", lock)
                self.assertIn("net8.0", lock["dependencies"])

    def test_solution_keeps_the_tests_project(self):
        solution = SOLUTION_PATH.read_text(encoding="utf-8")
        self.assertIn('"Tests", "Tests\\Tests.csproj"', solution)

    def test_locked_restore_rejects_divergent_manifest_in_isolated_fixture(self):
        source_project = REPOSITORY_ROOT / "backend" / "Tests" / "Tests.csproj"
        source_lock = REPOSITORY_ROOT / "backend" / "Tests" / "packages.lock.json"
        self.assertTrue(source_project.is_file())
        self.assertTrue(source_lock.is_file())

        with tempfile.TemporaryDirectory(dir=REPOSITORY_ROOT / ".tmp") as directory:
            fixture_root = Path(directory)
            project_dir = fixture_root / "Tests"
            application_dir = fixture_root / "LabSolos-Server-DotNet8"
            project_dir.mkdir()
            application_dir.mkdir()

            project_text = source_project.read_text(encoding="utf-8").replace(
                'Version="18.9.0"', 'Version="18.9.1"'
            )
            (project_dir / "Tests.csproj").write_text(project_text, encoding="utf-8")
            shutil.copyfile(source_lock, project_dir / "packages.lock.json")
            (application_dir / "LabSolos-Server-DotNet8.csproj").write_text(
                """<Project Sdk=\"Microsoft.NET.Sdk.Web\">
  <PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup>
</Project>
""",
                encoding="utf-8",
            )

            result = subprocess.run(
                [
                    "dotnet",
                    "restore",
                    str(project_dir / "Tests.csproj"),
                    "--locked-mode",
                    "--ignore-failed-sources",
                    "--nologo",
                ],
                cwd=REPOSITORY_ROOT,
                capture_output=True,
                text=True,
                check=False,
            )

        output = f"{result.stdout}\n{result.stderr}"
        self.assertNotEqual(result.returncode, 0, output)
        self.assertRegex(output, r"NU1004|lock file", output)


if __name__ == "__main__":
    unittest.main()
