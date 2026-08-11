from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


SCRIPT = Path(__file__).parents[1] / "audit_dependencies.py"
FIXTURES = Path(__file__).parent / "fixtures" / "dependencies"


def load_module():
    spec = importlib.util.spec_from_file_location("audit_dependencies", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class NormalizationTests(unittest.TestCase):
    def setUp(self):
        self.audit = load_module()
        self.metadata = {
            "collected_at": "2026-08-10T12:00:00Z",
            "branch": "develop",
            "commit": "abc123",
        }

    def test_normalizes_and_deduplicates_advisory_across_sources(self):
        npm = json.loads((FIXTURES / "npm-critical.json").read_text(encoding="utf-8"))
        dependabot = json.loads((FIXTURES / "dependabot.json").read_text(encoding="utf-8"))

        records = self.audit.normalize_sources(
            {"npm": npm, "dependabot": dependabot}, self.metadata
        )

        duplicate = next(item for item in records if item.id == "GHSA-aaaa-bbbb-cccc")
        self.assertEqual(("dependabot", "npm-audit"), duplicate.sources)
        self.assertEqual("alpha", duplicate.dependency_root)
        self.assertEqual("direct", duplicate.relationship)
        self.assertEqual("critical", duplicate.severity)
        self.assertEqual("2.0.0", duplicate.fixed_version)
        self.assertEqual(2, len(records))

    def test_normalizes_high_transitive_nuget_with_root_and_fix(self):
        nuget = json.loads((FIXTURES / "nuget-transitive.json").read_text(encoding="utf-8"))

        records = self.audit.normalize_sources({"nuget": nuget}, self.metadata)

        self.assertEqual(1, len(records))
        record = records[0]
        self.assertEqual("GHSA-dddd-eeee-ffff", record.id)
        self.assertEqual("Root.Package", record.dependency_root)
        self.assertEqual("transitive", record.relationship)
        self.assertEqual("3.0.0", record.fixed_version)
        self.assertEqual("high", record.severity)

    def test_enriches_realistic_nuget_output_from_advisory_catalog(self):
        nuget = json.loads(
            (FIXTURES / "nuget-without-fixed-version.json").read_text(encoding="utf-8")
        )
        advisories = json.loads(
            (FIXTURES / "github-advisories-nuget.json").read_text(encoding="utf-8")
        )

        records = self.audit.normalize_sources(
            {"nuget": nuget}, self.metadata, advisory_catalog=advisories
        )

        by_id = {record.id: record for record in records}
        self.assertEqual("15.0.1", by_id["GHSA-6654-xx9j-4c5x"].fixed_version)
        self.assertEqual(">= 14.0.0, < 15.0.1", by_id["GHSA-6654-xx9j-4c5x"].vulnerable_range)
        self.assertEqual("4.7.2", by_id["GHSA-ghhp-997w-qr28"].fixed_version)
        self.assertEqual("Microsoft.AspNetCore.Identity", by_id["GHSA-ghhp-997w-qr28"].dependency_root)

    def test_unknown_nuget_fix_is_not_misreported_as_confirmed_unavailable(self):
        nuget = json.loads(
            (FIXTURES / "nuget-without-fixed-version.json").read_text(encoding="utf-8")
        )

        records = self.audit.normalize_sources({"nuget": nuget}, self.metadata)

        self.assertTrue(records)
        self.assertTrue(all(record.fixed_version == self.audit.UNKNOWN for record in records))
        states = {"nuget": self.audit.SourceState("collected-incomplete", "advisory metadata missing")}
        self.assertEqual(2, self.audit.policy_exit_code(records, states, True))
        self.assertEqual(
            2,
            self.audit.policy_exit_code(
                records, {"nuget": self.audit.SourceState("collected", None)}, True
            ),
        )

    def test_enriches_npm_boolean_fix_without_claiming_no_fix(self):
        npm = json.loads((FIXTURES / "npm-fix-boolean.json").read_text(encoding="utf-8"))
        advisories = json.loads(
            (FIXTURES / "github-advisories-npm.json").read_text(encoding="utf-8")
        )

        enriched = self.audit.normalize_sources(
            {"npm": npm}, self.metadata, advisory_catalog=advisories
        )
        confirmed = self.audit.normalize_sources({"npm": npm}, self.metadata)

        self.assertEqual("3.1.0", enriched[0].fixed_version)
        self.assertEqual("root-tool", enriched[0].dependency_root)
        self.assertEqual(self.audit.FIX_AVAILABLE, confirmed[0].fixed_version)
        self.assertEqual(
            1,
            self.audit.policy_exit_code(
                confirmed, {"npm": self.audit.SourceState("collected", None)}, True
            ),
        )

    def test_accepts_real_advisory_schema_with_string_patched_version(self):
        npm = json.loads(
            (FIXTURES / "npm-string-fixed-version.json").read_text(encoding="utf-8")
        )
        advisory = json.loads(
            (FIXTURES / "github-advisory-string-fixed-version.json").read_text(
                encoding="utf-8"
            )
        )

        records = self.audit.normalize_sources(
            {"npm": npm}, self.metadata, advisory_catalog=advisory
        )

        self.assertEqual(1, len(records))
        self.assertEqual("GHSA-356w-63v5-8wf4", records[0].id)
        self.assertEqual("6.2.6", records[0].fixed_version)
        self.assertEqual(
            1,
            self.audit.policy_exit_code(
                records, {"npm": self.audit.SourceState("collected", None)}, True
            ),
        )

    def test_collected_empty_source_is_not_missing(self):
        empty = json.loads((FIXTURES / "npm-empty.json").read_text(encoding="utf-8"))
        states = {"npm": self.audit.SourceState("collected", None)}

        records = self.audit.normalize_sources({"npm": empty}, self.metadata)

        self.assertEqual([], records)
        self.assertEqual(0, self.audit.policy_exit_code(records, states, True))

    def test_accepts_clean_nuget_projects_without_frameworks_as_zero_findings(self):
        clean = json.loads(
            (FIXTURES / "nuget-empty-projects-without-frameworks.json").read_text(
                encoding="utf-8"
            )
        )
        states = {"nuget": self.audit.SourceState("collected", None)}

        records = self.audit.normalize_sources({"nuget": clean}, self.metadata)

        self.assertEqual([], records)
        self.assertEqual(0, self.audit.policy_exit_code(records, states, True))

    def test_rejects_nuget_project_without_valid_path_or_framework_shape(self):
        invalid_projects = (
            {},
            {"path": 42},
            {"path": "backend/App/App.csproj", "frameworks": {}},
        )

        for project in invalid_projects:
            with self.subTest(project=project):
                with self.assertRaises(self.audit.AuditError):
                    self.audit.normalize_sources(
                        {"nuget": {"projects": [project]}}, self.metadata
                    )

    def test_missing_or_invalid_source_returns_two(self):
        states = {"npm": self.audit.SourceState("not-collected", "collection failed")}
        self.assertEqual(2, self.audit.policy_exit_code([], states, True))
        self.assertEqual(2, self.audit.policy_exit_code([], {}, False))

    def test_open_fixable_critical_or_high_returns_one(self):
        npm = json.loads((FIXTURES / "npm-critical.json").read_text(encoding="utf-8"))
        records = self.audit.normalize_sources({"npm": npm}, self.metadata)
        states = {"npm": self.audit.SourceState("collected", None)}

        self.assertEqual(1, self.audit.policy_exit_code(records, states, True))

    def test_inventory_rendering_is_deterministic(self):
        npm = json.loads((FIXTURES / "npm-critical.json").read_text(encoding="utf-8"))
        nuget = json.loads((FIXTURES / "nuget-transitive.json").read_text(encoding="utf-8"))
        first = self.audit.normalize_sources({"npm": npm, "nuget": nuget}, self.metadata)
        second = self.audit.normalize_sources({"nuget": nuget, "npm": npm}, self.metadata)
        states = {
            "npm": self.audit.SourceState("collected", None),
            "nuget": self.audit.SourceState("collected", None),
        }

        self.assertEqual(
            self.audit.render_inventory(first, self.metadata, states),
            self.audit.render_inventory(second, self.metadata, states),
        )


class PendingValidationTests(unittest.TestCase):
    def setUp(self):
        self.audit = load_module()

    def test_rejects_incomplete_pending_or_exception_record(self):
        incomplete = """# Pendencias\n\n| id | estado | justificativa | mitigacao | risco_residual | responsavel | revisar_em |\n|---|---|---|---|---|---|---|\n| GHSA-1 | pendente | sem versao | | medio | equipe | 2026-12-01 |\n+"""
        self.assertFalse(self.audit.validate_pending_text(incomplete).valid)

    def test_accepts_complete_pending_record(self):
        complete = """# Pendencias\n\n| id | estado | justificativa | mitigacao | risco_residual | responsavel | revisar_em |\n|---|---|---|---|---|---|---|\n| GHSA-1 | excecao | sem versao | restringir uso | medio | equipe-seguranca | 2026-12-01 |\n+"""
        self.assertTrue(self.audit.validate_pending_text(complete).valid)


class CliTests(unittest.TestCase):
    def test_collect_clean_nuget_projects_without_frameworks_returns_zero(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            inventory = Path(temp_dir) / "inventory.md"
            pending = Path(temp_dir) / "pending.md"
            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "collect",
                    "--sources",
                    "nuget",
                    "--repository",
                    str(Path(__file__).parents[3]),
                    "--inventory",
                    str(inventory),
                    "--pending",
                    str(pending),
                    "--nuget-json",
                    str(FIXTURES / "nuget-empty-projects-without-frameworks.json"),
                    "--advisories-json",
                    str(FIXTURES / "dependabot-empty.json"),
                ],
                capture_output=True,
                text=True,
                check=False,
                timeout=15,
            )

            self.assertEqual(0, result.returncode, result.stderr + result.stdout)
            self.assertIn("nuget=collected", inventory.read_text(encoding="utf-8"))
            self.assertIn("nenhum", pending.read_text(encoding="utf-8"))

    def test_confirmed_npm_fix_without_exact_version_is_open_policy_one(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            inventory = Path(temp_dir) / "inventory.md"
            pending = Path(temp_dir) / "pending.md"
            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "collect",
                    "--sources",
                    "npm",
                    "--repository",
                    str(Path(__file__).parents[3]),
                    "--inventory",
                    str(inventory),
                    "--pending",
                    str(pending),
                    "--npm-json",
                    str(FIXTURES / "npm-confirmed-fix-without-version.json"),
                    "--advisories-json",
                    str(FIXTURES / "dependabot-empty.json"),
                ],
                capture_output=True,
                text=True,
                check=False,
                timeout=15,
            )

            self.assertEqual(1, result.returncode, result.stderr + result.stdout)
            inventory_text = inventory.read_text(encoding="utf-8")
            self.assertIn("LOCAL-86444", inventory_text)
            self.assertIn("react-router-dom", inventory_text)
            self.assertIn("| aberto | remediar |", inventory_text)
            self.assertIn("disponível (versão não resolvida)", inventory_text)
            row = next(line for line in inventory_text.splitlines() if "LOCAL-86444" in line)
            self.assertTrue(row.split("|")[11].strip())
            self.assertNotIn("LOCAL-86444", pending.read_text(encoding="utf-8"))

    def test_collect_with_fixable_critical_returns_one_and_writes_outputs(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            inventory = Path(temp_dir) / "inventory.md"
            pending = Path(temp_dir) / "pending.md"
            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "collect",
                    "--sources",
                    "npm",
                    "--repository",
                    str(Path(__file__).parents[3]),
                    "--inventory",
                    str(inventory),
                    "--pending",
                    str(pending),
                    "--npm-json",
                    str(FIXTURES / "npm-critical.json"),
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(1, result.returncode, result.stderr)
            self.assertIn("GHSA-aaaa-bbbb-cccc", inventory.read_text(encoding="utf-8"))
            self.assertTrue(pending.exists())

    def test_malformed_input_returns_two_without_echoing_sensitive_content(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "collect",
                    "--sources",
                    "npm",
                    "--repository",
                    str(Path(__file__).parents[3]),
                    "--inventory",
                    str(Path(temp_dir) / "inventory.md"),
                    "--pending",
                    str(Path(temp_dir) / "pending.md"),
                    "--npm-json",
                    str(FIXTURES / "malformed.json"),
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(2, result.returncode)
            self.assertNotIn("SECRET_SENTINEL", result.stderr + result.stdout)

    def test_missing_source_file_returns_two_and_is_not_reported_as_zero(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "collect",
                    "--sources",
                    "npm",
                    "--repository",
                    str(Path(__file__).parents[3]),
                    "--inventory",
                    str(Path(temp_dir) / "inventory.md"),
                    "--pending",
                    str(Path(temp_dir) / "pending.md"),
                    "--npm-json",
                    str(Path(temp_dir) / "missing.json"),
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(2, result.returncode)
            self.assertIn("not-collected", (Path(temp_dir) / "inventory.md").read_text(encoding="utf-8"))

    def test_new_collection_appends_snapshot_without_erasing_history(self):
        audit = load_module()
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "inventory.md"
            audit.append_snapshot(output, "Inventario", "## Fotografia one\n")
            audit.append_snapshot(output, "Inventario", "## Fotografia two\n")

            contents = output.read_text(encoding="utf-8")
            self.assertIn("## Fotografia one", contents)
            self.assertIn("## Fotografia two", contents)
            self.assertLess(contents.index("one"), contents.index("two"))

    def test_nuget_advisory_catalog_yields_policy_one_instead_of_invalid_pending(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            inventory = Path(temp_dir) / "inventory.md"
            pending = Path(temp_dir) / "pending.md"
            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "collect",
                    "--sources",
                    "npm,nuget,dependabot",
                    "--repository",
                    str(Path(__file__).parents[3]),
                    "--inventory",
                    str(inventory),
                    "--pending",
                    str(pending),
                    "--npm-json",
                    str(FIXTURES / "npm-empty.json"),
                    "--nuget-json",
                    str(FIXTURES / "nuget-without-fixed-version.json"),
                    "--dependabot-json",
                    str(FIXTURES / "dependabot-empty.json"),
                    "--advisories-json",
                    str(FIXTURES / "github-advisories-nuget.json"),
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(1, result.returncode, result.stderr + result.stdout)
            self.assertIn("15.0.1", inventory.read_text(encoding="utf-8"))
            self.assertIn("4.7.2", inventory.read_text(encoding="utf-8"))
            self.assertIn("nenhum", pending.read_text(encoding="utf-8"))

    def test_priority_without_direct_patch_stays_open_until_t004_classifies_it(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            inventory = Path(temp_dir) / "inventory.md"
            pending = Path(temp_dir) / "pending.md"
            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "collect",
                    "--sources",
                    "nuget",
                    "--repository",
                    str(Path(__file__).parents[3]),
                    "--inventory",
                    str(inventory),
                    "--pending",
                    str(pending),
                    "--nuget-json",
                    str(FIXTURES / "nuget-priority-without-patch.json"),
                    "--advisories-json",
                    str(FIXTURES / "github-advisory-null-patch.json"),
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(1, result.returncode, result.stderr + result.stdout)
            inventory_text = inventory.read_text(encoding="utf-8")
            pending_text = pending.read_text(encoding="utf-8")
            self.assertIn("GHSA-2m69-gcr7-jv3q", inventory_text)
            self.assertIn("indisponível", inventory_text)
            self.assertIn("| aberto | investigar |", inventory_text)
            self.assertNotIn("GHSA-2m69-gcr7-jv3q", pending_text)

            generated_validation = subprocess.run(
                [sys.executable, str(SCRIPT), "validate-pending", str(pending)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(0, generated_validation.returncode, generated_validation.stderr)

            incomplete = Path(temp_dir) / "incomplete.md"
            incomplete.write_text(
                "# Pendencias\n\n"
                "| id | estado | justificativa | mitigacao | risco_residual | responsavel | revisar_em |\n"
                "|---|---|---|---|---|---|---|\n"
                "| GHSA-2m69-gcr7-jv3q | pendente | | | | | |\n",
                encoding="utf-8",
            )
            incomplete_validation = subprocess.run(
                [sys.executable, str(SCRIPT), "validate-pending", str(incomplete)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(2, incomplete_validation.returncode)

    def test_subprocess_uses_argument_list_without_shell(self):
        audit = load_module()
        with mock.patch("shutil.which", return_value=None), mock.patch.object(
            audit.subprocess, "run"
        ) as run:
            run.return_value = mock.Mock(returncode=0, stdout="{}", stderr="")
            audit.run_json_command(["npm", "audit", "--json"], Path("."), "npm")

        run.assert_called_once()
        args, kwargs = run.call_args
        self.assertEqual(["npm", "audit", "--json"], args[0])
        self.assertIs(False, kwargs["shell"])

    def test_subprocess_resolves_windows_command_shim_without_shell(self):
        audit = load_module()
        npm_cmd = r"C:\Program Files\nodejs\npm.CMD"
        with mock.patch("shutil.which", return_value=npm_cmd), mock.patch.object(
            audit.subprocess, "run"
        ) as run:
            run.return_value = mock.Mock(returncode=0, stdout="{}", stderr="")
            audit.run_json_command(["npm", "audit", "--json"], Path("."), "npm")

        args, kwargs = run.call_args
        self.assertEqual(npm_cmd, args[0][0])
        self.assertEqual(["audit", "--json"], args[0][1:])
        self.assertIs(False, kwargs["shell"])


if __name__ == "__main__":
    unittest.main()
