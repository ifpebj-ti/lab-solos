import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_ROOT = REPOSITORY_ROOT / "frontend"
FIXTURES_ROOT = (
    REPOSITORY_ROOT
    / ".github"
    / "scripts"
    / "tests"
    / "fixtures"
    / "quality"
    / "eslint"
)
QUALITY_CONFIG = FRONTEND_ROOT / "eslint.quality.config.js"
NPMX = "npx.cmd" if os.name == "nt" else "npx"


def run_eslint(*paths, print_config=False):
    args = [NPMX, "--no-install", "eslint"]
    if print_config:
        args.extend(["--print-config", str(paths[0])])
    else:
        args.extend([*(str(path) for path in paths), "--format", "json"])
    args.extend(["--config", str(QUALITY_CONFIG)])
    return subprocess.run(
        args,
        cwd=FRONTEND_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )


def prepare_fixture(name):
    temporary_directory = tempfile.TemporaryDirectory(
        dir=FRONTEND_ROOT, prefix=".eslint-quality-"
    )
    destination = Path(temporary_directory.name) / name
    source = FIXTURES_ROOT / name
    if source.is_dir():
        shutil.copytree(source, destination)
    else:
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
    return temporary_directory, destination


def parse_eslint_json(result):
    if result.returncode != 0:
        raise AssertionError(
            f"ESLint falhou com código {result.returncode}:\n"
            f"stdout={result.stdout}\nstderr={result.stderr}"
        )
    if not result.stdout.strip():
        raise AssertionError(
            f"ESLint não produziu JSON:\nstdout={result.stdout}\nstderr={result.stderr}"
        )
    return json.loads(result.stdout)


class QualityEslintAnalysisTests(unittest.TestCase):
    def test_above_limits_produces_expected_warning_ids_and_json(self):
        temporary_directory, fixture = prepare_fixture("above-limits.ts")
        self.addCleanup(temporary_directory.cleanup)
        result = run_eslint(fixture)
        report = parse_eslint_json(result)
        messages = report[0]["messages"]

        quality_messages = {
            message["ruleId"]: message
            for message in messages
            if message["ruleId"] in {"complexity", "max-depth"}
        }

        self.assertEqual(set(quality_messages), {"complexity", "max-depth"})
        self.assertTrue(
            all(message["severity"] == 1 for message in quality_messages.values())
        )

    def test_below_limits_does_not_produce_complexity_or_depth_warnings(self):
        temporary_directory, fixture = prepare_fixture("below-limits.ts")
        self.addCleanup(temporary_directory.cleanup)
        result = run_eslint(fixture)
        report = parse_eslint_json(result)
        quality_messages = [
            message
            for message in report[0]["messages"]
            if message["ruleId"] in {"complexity", "max-depth"}
        ]

        self.assertEqual(quality_messages, [])

    def test_owned_targets_are_linted_and_generated_outputs_are_ignored(self):
        temporary_directory, scope_root = prepare_fixture("scope")
        self.addCleanup(temporary_directory.cleanup)
        result = run_eslint(scope_root)
        report = parse_eslint_json(result)
        paths = {Path(item["filePath"]).resolve() for item in report}

        expected = {
            (scope_root / "src" / "browser.ts").resolve(),
            (scope_root / "e2e" / "node.ts").resolve(),
            (scope_root / "vite.config.ts").resolve(),
            (scope_root / "playwright.config.ts").resolve(),
        }
        self.assertTrue(expected.issubset(paths), paths)
        self.assertNotIn((scope_root / "node_modules" / "dependency.ts").resolve(), paths)
        self.assertNotIn((scope_root / "reports" / "generated.ts").resolve(), paths)

    def test_browser_and_node_targets_receive_their_environment_globals(self):
        temporary_directory, scope_root = prepare_fixture("scope")
        self.addCleanup(temporary_directory.cleanup)
        browser_result = run_eslint(
            scope_root / "src" / "browser.ts", print_config=True
        )
        node_result = run_eslint(
            scope_root / "e2e" / "node.ts", print_config=True
        )

        browser_config = parse_eslint_json(browser_result)
        node_config = parse_eslint_json(node_result)

        self.assertEqual(browser_config["rules"]["complexity"], [1, {"max": 20}])
        self.assertEqual(node_config["rules"]["max-depth"], [1, 4])
        self.assertIn("window", browser_config["languageOptions"]["globals"])
        self.assertIn("process", node_config["languageOptions"]["globals"])


if __name__ == "__main__":
    unittest.main()
