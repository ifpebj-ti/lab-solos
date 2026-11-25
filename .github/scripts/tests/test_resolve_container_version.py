import importlib.util
import json
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


def run_cli(*arguments):
    return subprocess.run(
        [sys.executable, str(SCRIPT), *arguments],
        capture_output=True,
        text=True,
        check=False,
    )


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
            first = run_cli(*arguments)
            self.assertEqual(0, first.returncode, first.stderr)
            first_content = output.read_text(encoding="utf-8")
            output.unlink()
            second = run_cli(*arguments)
            self.assertEqual(0, second.returncode, second.stderr)
            self.assertEqual(first_content, output.read_text(encoding="utf-8"))
            self.assertEqual(
                "release=true\nversion=1.2.3\nchange_type=dispatch\n", first_content
            )

    def test_malformed_pr_body_is_not_echoed(self):
        secret_body = "sensitive payload that must not be logged"
        result = run_cli(
            "--event", "pull_request", "--pr-body", secret_body, "--latest-tag", "1.2.3"
        )
        self.assertNotEqual(0, result.returncode)
        self.assertNotIn(secret_body, result.stdout + result.stderr)


class ReleaseIntentTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.intent_file = Path(directory.name) / "intent.json"
        self.output_file = Path(directory.name) / "output.txt"
        self.sha = "a" * 40

    def run_intent(self, *, attempt="1", sha=None, arguments=None):
        if arguments is None:
            arguments = (
                "--event", "pull_request", "--pr-body", "- [x] bug-fix",
                "--latest-tag", "2.4.7",
            )
        return run_cli(
            *arguments,
            "--repository", "ifpebj-ti/lab-solos",
            "--run-id", "12345",
            "--run-attempt", attempt,
            "--sha", sha or self.sha,
            "--intent-file", str(self.intent_file),
            "--github-output", str(self.output_file),
        )

    def test_rerun_reuses_version_and_commit_after_later_release(self):
        first = self.run_intent()
        self.assertEqual(0, first.returncode, first.stderr)
        first_output = self.output_file.read_text(encoding="utf-8")
        manifest = self.intent_file.read_bytes()
        self.assertEqual(
            [
                {
                    "repository": "ifpebj-ti/lab-solos",
                    "run_id": "12345",
                    "event": "pull_request",
                    "sha": self.sha,
                    "release": "true",
                    "version": "2.4.8",
                    "change_type": "bug-fix",
                }
            ],
            json.loads(manifest),
        )
        self.output_file.unlink()
        retry = self.run_intent(
            attempt="2",
            arguments=(
                "--event", "pull_request", "--pr-body", "- [x] bug-fix",
                "--latest-tag", "3.0.0",
            ),
        )
        self.assertEqual(0, retry.returncode, retry.stderr)
        self.assertEqual(
            f"release=true\nversion=2.4.8\nchange_type=bug-fix\nsha={self.sha}\n",
            first_output,
        )
        self.assertEqual(first_output, self.output_file.read_text(encoding="utf-8"))
        self.assertEqual(manifest, self.intent_file.read_bytes())

    def test_sha_conflict_preserves_record_and_does_not_publish_output(self):
        first = self.run_intent()
        self.assertEqual(0, first.returncode, first.stderr)
        manifest = self.intent_file.read_bytes()
        self.output_file.unlink()
        retry = self.run_intent(attempt="2", sha="b" * 40)
        self.assertNotEqual(0, retry.returncode)
        self.assertIn("SHA", retry.stderr)
        self.assertFalse(self.output_file.exists())
        self.assertEqual(manifest, self.intent_file.read_bytes())

    def test_ambiguous_manifest_rejects_even_identical_matches(self):
        first = self.run_intent()
        self.assertEqual(0, first.returncode, first.stderr)
        records = json.loads(self.intent_file.read_bytes())
        self.intent_file.write_text(json.dumps(records * 2), encoding="utf-8")
        self.output_file.unlink()
        retry = self.run_intent(attempt="2")
        self.assertNotEqual(0, retry.returncode)
        self.assertIn("multiple", retry.stderr)
        self.assertFalse(self.output_file.exists())

    def test_retry_with_no_proof_blocks_without_selecting_new_version(self):
        retry = self.run_intent(attempt="2")
        self.assertNotEqual(0, retry.returncode)
        self.assertIn("no persisted release intent", retry.stderr)
        self.assertFalse(self.intent_file.exists())
        self.assertFalse(self.output_file.exists())

    def test_manual_dispatch_keeps_selected_version_and_rejects_conflict(self):
        def dispatch_arguments(version):
            return (
                "--event", "workflow_dispatch", "--version", version,
                "--ref", "refs/heads/main",
            )

        first = self.run_intent(arguments=dispatch_arguments("1.2.3"))
        self.assertEqual(0, first.returncode, first.stderr)
        self.output_file.unlink()
        retry = self.run_intent(attempt="2", arguments=dispatch_arguments("1.2.3"))
        self.assertEqual(0, retry.returncode, retry.stderr)
        self.assertIn("version=1.2.3\n", self.output_file.read_text(encoding="utf-8"))

        self.output_file.unlink()
        conflict = self.run_intent(attempt="2", arguments=dispatch_arguments("1.2.4"))
        self.assertNotEqual(0, conflict.returncode)
        self.assertIn("version", conflict.stderr)
        self.assertFalse(self.output_file.exists())

    def test_outros_remains_skipped_in_a_retry(self):
        arguments = (
            "--event", "pull_request", "--pr-body", "- [x] outros",
            "--latest-tag", "2.4.7",
        )
        first = self.run_intent(arguments=arguments)
        self.assertEqual(0, first.returncode, first.stderr)
        self.output_file.unlink()
        retry = self.run_intent(attempt="2", arguments=arguments)
        self.assertEqual(0, retry.returncode, retry.stderr)
        self.assertIn(
            "release=false\nversion=\nchange_type=outros\n",
            self.output_file.read_text(encoding="utf-8"),
        )


if __name__ == "__main__":
    unittest.main()
