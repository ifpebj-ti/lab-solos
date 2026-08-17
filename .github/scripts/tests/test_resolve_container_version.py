import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "resolve_container_version.py"


def load_module():
    spec = importlib.util.spec_from_file_location("resolve_container_version", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class ResolvePullRequestTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.module = load_module()

    def body(self, selected):
        options = ("novo-marco", "nova-feature-refactor", "bug-fix", "outros")
        return "\n".join(
            f"- [{'x' if option in selected else ' '}] {option}" for option in options
        )

    def test_first_release_starts_at_expected_version_for_each_change_type(self):
        expected = {
            "novo-marco": "1.0.0",
            "nova-feature-refactor": "0.1.0",
            "bug-fix": "0.0.1",
        }
        for change_type, version in expected.items():
            with self.subTest(change_type=change_type):
                self.assertEqual(
                    {
                        "release": "true",
                        "version": version,
                        "change_type": change_type,
                    },
                    self.module.resolve_pull_request(self.body({change_type}), None),
                )

        self.assertEqual(
            "0.0.1",
            self.module.resolve_pull_request(self.body({"bug-fix"}), "")["version"],
        )

    def test_increments_major_minor_and_patch(self):
        expected = {
            "novo-marco": "3.0.0",
            "nova-feature-refactor": "2.5.0",
            "bug-fix": "2.4.8",
        }
        for change_type, version in expected.items():
            with self.subTest(change_type=change_type):
                result = self.module.resolve_pull_request(
                    self.body({change_type}), "2.4.7"
                )
                self.assertEqual(version, result["version"])

    def test_outros_explicitly_skips_release(self):
        self.assertEqual(
            {"release": "false", "version": "", "change_type": "outros"},
            self.module.resolve_pull_request(self.body({"outros"}), "2.4.7"),
        )

    def test_rejects_invalid_latest_version(self):
        with self.assertRaisesRegex(ValueError, "latest version"):
            self.module.resolve_pull_request(self.body({"bug-fix"}), "v2.4.7")

    def test_requires_exactly_one_selected_option(self):
        for selected in (set(), {"novo-marco", "bug-fix"}):
            with self.subTest(selected=selected):
                with self.assertRaisesRegex(ValueError, "exactly one"):
                    self.module.resolve_pull_request(self.body(selected), "2.4.7")

    def test_ignores_unchecked_and_prose_mentions(self):
        body = "bug-fix in prose\n- [ ] bug-fix\n- [X] nova-feature-refactor"
        result = self.module.resolve_pull_request(body, "1.2.3")
        self.assertEqual("nova-feature-refactor", result["change_type"])


class ResolveDispatchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.module = load_module()

    def test_accepts_canonical_semver_on_main(self):
        self.assertEqual(
            {"release": "true", "version": "10.20.30", "change_type": "dispatch"},
            self.module.resolve_dispatch("10.20.30", "refs/heads/main"),
        )

    def test_rejects_noncanonical_versions(self):
        for version in ("v1.2.3", "01.2.3", "1.2", "1.2.3-alpha", "1.2.3\nunsafe"):
            with self.subTest(version=version):
                with self.assertRaisesRegex(ValueError, "canonical SemVer"):
                    self.module.resolve_dispatch(version, "refs/heads/main")

    def test_rejects_dispatch_outside_main(self):
        with self.assertRaisesRegex(ValueError, "main"):
            self.module.resolve_dispatch("1.2.3", "refs/heads/develop")


class CommandLineTests(unittest.TestCase):
    def run_cli(self, *arguments):
        return subprocess.run(
            [sys.executable, str(SCRIPT), *arguments],
            capture_output=True,
            text=True,
            check=False,
        )

    def test_writes_stable_github_output(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "output"
            arguments = (
                "--event",
                "workflow_dispatch",
                "--version",
                "1.2.3",
                "--ref",
                "refs/heads/main",
                "--github-output",
                str(output),
            )
            first = self.run_cli(*arguments)
            self.assertEqual(0, first.returncode, first.stderr)
            first_content = output.read_text(encoding="utf-8")
            output.unlink()
            second = self.run_cli(*arguments)
            self.assertEqual(0, second.returncode, second.stderr)
            self.assertEqual(first_content, output.read_text(encoding="utf-8"))
            self.assertEqual(
                "release=true\nversion=1.2.3\nchange_type=dispatch\n", first_content
            )

    def test_malformed_pr_body_is_not_echoed(self):
        secret_body = "sensitive payload that must not be logged"
        result = self.run_cli(
            "--event", "pull_request", "--pr-body", secret_body, "--latest-tag", "1.2.3"
        )
        self.assertNotEqual(0, result.returncode)
        self.assertNotIn(secret_body, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
