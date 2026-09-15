import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPTS_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = SCRIPTS_ROOT.parents[1]
sys.path.insert(0, str(SCRIPTS_ROOT))

from check_quality_toolchain import (  # noqa: E402
    ToolchainError,
    check_toolchain,
    load_toolchain,
    parse_version,
    resolve_command,
)


CONFIG_PATH = REPOSITORY_ROOT / ".github" / "quality" / "toolchain.json"


def completed(command, stdout="", returncode=0, stderr=""):
    return subprocess.CompletedProcess(
        command,
        returncode=returncode,
        stdout=stdout,
        stderr=stderr,
    )


class ToolchainVersionTests(unittest.TestCase):
    def test_resolve_command_supports_cmd_wrappers_without_a_shell(self):
        def lookup(executable):
            return "C:/tools/npm.cmd" if executable == "npm.cmd" else None

        self.assertEqual(
            resolve_command(["npm", "--version"], lookup=lookup),
            ["C:/tools/npm.cmd", "--version"],
        )

    def test_parse_version_accepts_prefixes_and_suffixes(self):
        cases = {
            ("node", "v20.20.2\n"): "20.20.2",
            ("npm", "10.8.2\n"): "10.8.2",
            ("dotnet", "8.0.419\n"): "8.0.419",
            ("python", "Python 3.12.14\n"): "3.12.14",
            ("docker", "Docker version 29.7.2, build 1234567\n"): "29.7.2",
            ("docker-compose", "Docker Compose version v5.3.1\n"): "5.3.1",
        }

        for (tool, output), expected in cases.items():
            with self.subTest(tool=tool):
                self.assertEqual(parse_version(tool, output), expected)

    def test_parse_version_rejects_missing_or_non_semver_output(self):
        for tool, output in (("node", "v20\n"), ("python", "Python unknown\n")):
            with self.subTest(tool=tool):
                with self.assertRaisesRegex(ToolchainError, tool):
                    parse_version(tool, output)

    def test_load_toolchain_rejects_incomplete_json(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "toolchain.json"
            path.write_text(json.dumps({"schemaVersion": 1}), encoding="utf-8")

            with self.assertRaisesRegex(ToolchainError, "tools"):
                load_toolchain(path)


class ToolchainCheckTests(unittest.TestCase):
    def setUp(self):
        self.outputs = {
            "node": "v20.20.2\n",
            "npm": "10.8.2\n",
            "dotnet": "8.0.419\n",
            "python": "Python 3.12.14\n",
            "docker": "29.7.2\n",
            "docker-compose": "5.3.1\n",
        }
        self.commands = []

    def runner(self, command):
        self.commands.append(command)
        tool = command[0]
        if tool == "docker" and command[1:3] == ["compose", "version"]:
            tool = "docker-compose"
        return completed(command, self.outputs[tool])

    def test_matching_versions_return_success_and_use_argument_lists(self):
        result = check_toolchain(CONFIG_PATH, runner=self.runner)

        self.assertEqual(result.exit_code, 0)
        self.assertEqual(result.errors, [])
        self.assertTrue(all(isinstance(command, list) for command in self.commands))

    def test_mismatch_returns_actionable_quality_failure(self):
        self.outputs["node"] = "v24.14.0\n"

        result = check_toolchain(CONFIG_PATH, runner=self.runner)

        self.assertEqual(result.exit_code, 1)
        self.assertTrue(any("node" in error and "20.20.2" in error for error in result.errors))
        self.assertTrue(any("24.14.0" in error for error in result.errors))

    def test_missing_tool_returns_operational_failure_without_raw_output(self):
        def missing_runner(command):
            raise FileNotFoundError("C:/private/secret/tool-not-installed")

        result = check_toolchain(CONFIG_PATH, runner=missing_runner)

        self.assertEqual(result.exit_code, 2)
        self.assertTrue(any("não encontrado" in error for error in result.errors))
        self.assertNotIn("secret", " ".join(result.errors))

    def test_nonzero_tool_result_does_not_expose_credentials(self):
        def failing_runner(command):
            return completed(
                command,
                returncode=1,
                stderr="token=super-secret-value",
            )

        result = check_toolchain(CONFIG_PATH, runner=failing_runner)

        self.assertEqual(result.exit_code, 2)
        self.assertNotIn("super-secret-value", " ".join(result.errors))

    def test_invalid_configuration_returns_operational_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "toolchain.json"
            path.write_text(
                json.dumps(
                    {
                        "schemaVersion": 1,
                        "tools": {
                            "node": {
                                "required": "latest",
                                "command": ["node", "--version"],
                            }
                        },
                    }
                ),
                encoding="utf-8",
            )

            result = check_toolchain(path, runner=self.runner)

        self.assertEqual(result.exit_code, 2)
        self.assertTrue(any("concreta" in error for error in result.errors))


class ToolchainContractTests(unittest.TestCase):
    def test_repository_contract_records_runner_and_playwright_browser(self):
        data = load_toolchain(CONFIG_PATH)

        self.assertEqual(data["schemaVersion"], 1)
        self.assertEqual(data["runner"]["required"]["image"], "ubuntu-24.04")
        self.assertRegex(data["runner"]["observed"]["revision"], r"^202\d{4,}\.\d+\.\d+$")
        self.assertEqual(data["playwright"]["package"], "1.62.1")
        self.assertEqual(data["playwright"]["chromium"]["revision"], "1234")
        self.assertRegex(
            data["playwright"]["chromium"]["version"],
            r"^\d+\.\d+\.\d+\.\d+$",
        )

    def test_repository_versions_are_concrete_patches(self):
        data = load_toolchain(CONFIG_PATH)

        for tool, specification in data["tools"].items():
            with self.subTest(tool=tool):
                self.assertRegex(specification["required"], r"^\d+\.\d+\.\d+$")
                self.assertNotIn("latest", specification["required"].lower())
                self.assertNotIn("x", specification["required"].lower())


if __name__ == "__main__":
    unittest.main()
