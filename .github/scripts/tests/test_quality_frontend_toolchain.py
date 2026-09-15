import json
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_ROOT = REPOSITORY_ROOT / "frontend"
TOOLCHAIN_PATH = REPOSITORY_ROOT / ".github" / "quality" / "toolchain.json"


class FrontendToolchainContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.toolchain = json.loads(TOOLCHAIN_PATH.read_text(encoding="utf-8"))
        cls.package = json.loads(
            (FRONTEND_ROOT / "package.json").read_text(encoding="utf-8")
        )
        cls.lockfile = json.loads(
            (FRONTEND_ROOT / "package-lock.json").read_text(encoding="utf-8")
        )

    def test_node_version_matches_the_pinned_toolchain(self):
        node_version_path = FRONTEND_ROOT / ".node-version"
        node_version = (
            node_version_path.read_text(encoding="utf-8").strip()
            if node_version_path.exists()
            else None
        )

        self.assertEqual(node_version, self.toolchain["tools"]["node"]["required"])
        self.assertIsNotNone(node_version)
        self.assertTrue(node_version.startswith("20."))

    def test_package_manager_matches_the_pinned_npm_tool(self):
        npm_version = self.toolchain["tools"]["npm"]["required"]

        self.assertEqual(self.package.get("packageManager"), f"npm@{npm_version}")

    def test_lockfile_is_present_and_uses_the_current_npm_lock_format(self):
        self.assertEqual(self.lockfile["lockfileVersion"], 3)
        self.assertIn("packages", self.lockfile)


if __name__ == "__main__":
    unittest.main()
