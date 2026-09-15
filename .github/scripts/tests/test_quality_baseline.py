import json
import hashlib
import subprocess
import sys
import unittest
from copy import deepcopy
from collections import Counter
from pathlib import Path
from unittest.mock import patch


SCRIPTS_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = SCRIPTS_ROOT.parents[1]
FIXTURES_ROOT = SCRIPTS_ROOT / "tests" / "fixtures" / "quality" / "normalization"
COLLECTION_FIXTURES_ROOT = SCRIPTS_ROOT / "tests" / "fixtures" / "quality" / "collection"
POLICY_PATH = REPOSITORY_ROOT / ".github" / "quality" / "policy.json"
sys.path.insert(0, str(SCRIPTS_ROOT))

from quality_baseline import (  # noqa: E402
    FINGERPRINT_ALGORITHM,
    FINGERPRINT_VERSION,
    MalformedReportError,
    ModuleClassificationError,
    UnknownQualityRuleError,
    build_current,
    fingerprint_for,
    load_policy,
    module_for_path,
    normalize_eslint_report,
    normalize_sarif_report,
    resolve_command,
    _overlay_bootstrap_quality_files,
    _prepare_bootstrap_frontend,
)


def read_fixture(name):
    return json.loads((FIXTURES_ROOT / name).read_text(encoding="utf-8"))


class QualityPolicyTests(unittest.TestCase):
    def test_policy_declares_versioned_fingerprint_rules_and_modules(self):
        policy = load_policy(POLICY_PATH)

        self.assertEqual(policy["schemaVersion"], 1)
        self.assertEqual(
            policy["fingerprint"],
            {"algorithm": FINGERPRINT_ALGORITHM, "version": FINGERPRINT_VERSION},
        )
        self.assertIn("eslint/no-unused-vars", policy["rules"])
        self.assertEqual(
            policy["rules"]["CA1859"],
            {"category": "manutenibilidade", "severity": "media"},
        )
        self.assertEqual(
            policy["rules"]["SYSLIB1045"],
            {"category": "manutenibilidade", "severity": "media"},
        )
        self.assertTrue(policy["modules"])
        self.assertEqual(
            module_for_path(".github/scripts/quality_baseline.py", policy),
            "automacao",
        )


class QualityNormalizationTests(unittest.TestCase):
    def setUp(self):
        self.policy = load_policy(POLICY_PATH)
        self.repository_root = "C:/repo"

    def test_eslint_normalizes_windows_and_linux_paths_and_ignores_line_shift(self):
        linux = normalize_eslint_report(
            read_fixture("eslint-linux.json"),
            self.policy,
            repository_root="/repo",
        )
        windows = normalize_eslint_report(
            read_fixture("eslint-windows.json"),
            self.policy,
            repository_root=self.repository_root,
        )

        self.assertEqual(linux[0]["path"], "frontend/src/auth/login.ts")
        self.assertEqual(linux[0]["line"], 10)
        self.assertEqual(windows[0]["line"], 42)
        self.assertEqual(linux[0]["fingerprint"], windows[0]["fingerprint"])
        self.assertEqual(linux[0]["id"], windows[0]["id"])

    def test_duplicate_occurrences_are_not_deduplicated(self):
        findings = normalize_eslint_report(
            read_fixture("eslint-duplicates.json"),
            self.policy,
            repository_root=self.repository_root,
        )

        self.assertEqual(len(findings), 2)
        self.assertEqual(Counter(item["fingerprint"] for item in findings).most_common(1)[0][1], 2)

    def test_context_distinguishes_colliding_rule_and_path(self):
        first = normalize_eslint_report(
            read_fixture("eslint-context-first.json"),
            self.policy,
            repository_root=self.repository_root,
        )[0]
        second = normalize_eslint_report(
            read_fixture("eslint-context-second.json"),
            self.policy,
            repository_root=self.repository_root,
        )[0]

        self.assertEqual(first["ruleId"], second["ruleId"])
        self.assertEqual(first["path"], second["path"])
        self.assertNotEqual(first["fingerprint"], second["fingerprint"])

    def test_removed_occurrence_and_new_context_have_independent_identity(self):
        base = normalize_eslint_report(
            read_fixture("eslint-duplicates.json"),
            self.policy,
            repository_root=self.repository_root,
        )
        revised = normalize_eslint_report(
            read_fixture("eslint-context-second.json"),
            self.policy,
            repository_root=self.repository_root,
        )

        base_counts = Counter(item["fingerprint"] for item in base)
        revised_counts = Counter(item["fingerprint"] for item in revised)
        self.assertNotEqual(base_counts, revised_counts)
        self.assertEqual(sum((base_counts - revised_counts).values()), 2)
        self.assertEqual(sum((revised_counts - base_counts).values()), 1)

    def test_sarif_adapter_extracts_rule_level_path_line_and_context(self):
        findings = normalize_sarif_report(
            read_fixture("sarif.json"),
            self.policy,
            repository_root=self.repository_root,
            tool_name="roslyn",
        )

        self.assertEqual(len(findings), 1)
        finding = findings[0]
        self.assertEqual(finding["tool"], "roslyn")
        self.assertEqual(finding["ruleId"], "CA1502")
        self.assertEqual(finding["originalSeverity"], "warning")
        self.assertEqual(finding["path"], "backend/src/Loans/LoanService.cs")
        self.assertEqual(finding["line"], 17)
        self.assertEqual(finding["evidence"]["source"], "sarif")

    def test_sarif_occurrence_is_stable_when_result_position_changes(self):
        original = read_fixture("sarif.json")
        shifted = deepcopy(original)
        shifted["runs"][0]["results"].insert(
            0,
            {
                **deepcopy(original["runs"][0]["results"][0]),
                "locations": [
                    {
                        "physicalLocation": {
                            "artifactLocation": {"uri": "backend/src/Loans/OtherService.cs"},
                            "region": {
                                "startLine": 3,
                                "snippet": {"text": "public void Other()"},
                            },
                        }
                    }
                ],
            },
        )

        first = normalize_sarif_report(
            original, self.policy, repository_root=self.repository_root, tool_name="roslyn"
        )[0]
        second = normalize_sarif_report(
            shifted, self.policy, repository_root=self.repository_root, tool_name="roslyn"
        )[1]

        self.assertEqual(first["fingerprint"], second["fingerprint"])
        self.assertEqual(first["evidence"], second["evidence"])

    def test_unknown_rule_is_rejected_instead_of_silently_categorized(self):
        with self.assertRaises(UnknownQualityRuleError):
            normalize_eslint_report(
                read_fixture("eslint-unknown-rule.json"),
                self.policy,
                repository_root=self.repository_root,
            )

    def test_path_without_a_policy_module_is_rejected(self):
        with self.assertRaises(ModuleClassificationError):
            normalize_eslint_report(
                read_fixture("eslint-outside-module.json"),
                self.policy,
                repository_root=self.repository_root,
            )

    def test_malformed_eslint_report_is_rejected(self):
        with self.assertRaises(MalformedReportError):
            normalize_eslint_report(
                read_fixture("eslint-malformed.json"),
                self.policy,
                repository_root=self.repository_root,
            )

    def test_original_priority_evidence_and_state_are_preserved(self):
        finding = normalize_eslint_report(
            read_fixture("eslint-preserved-fields.json"),
            self.policy,
            repository_root=self.repository_root,
        )[0]

        self.assertEqual(finding["originalSeverity"], "error")
        self.assertEqual(finding["evidence"], {"ticket": "QC-TEST", "source": "fixture"})
        self.assertEqual(finding["status"], "corrigido")
        self.assertEqual(finding["backlogId"], "BL-001")
        self.assertEqual(finding["owner"], "equipe de qualidade")


class QualityModelTests(unittest.TestCase):
    def test_fingerprint_excludes_line_source_sha_date_and_absolute_path(self):
        first = fingerprint_for(
            tool="eslint",
            rule_id="no-unused-vars",
            path="C:/repo/frontend/src/auth/login.ts",
            context="if ( token ) {\n  return token;\n}",
            repository_root="C:/repo",
            line=10,
            source_sha="sha-before",
            generated_at="2026-09-14T10:00:00Z",
        )
        second = fingerprint_for(
            tool="eslint",
            rule_id="no-unused-vars",
            path="/tmp/repo/frontend/src/auth/login.ts",
            context="if (token) { return token; }",
            repository_root="/tmp/repo",
            line=200,
            source_sha="sha-after",
            generated_at="2026-09-14T11:00:00Z",
        )

        self.assertEqual(first, second)

    def test_current_model_contains_required_metadata_and_fingerprint_schema(self):
        current = build_current(
            source_sha="abc123",
            dirty=True,
            toolchain={"python": "3.12.14"},
            policy_hash="policy-sha",
            generated_at="2026-09-14T12:00:00Z",
            producers=[{"name": "eslint", "status": "success"}],
            findings=[],
        )

        self.assertEqual(current["schemaVersion"], 1)
        self.assertEqual(current["sourceSha"], "abc123")
        self.assertTrue(current["dirty"])
        self.assertEqual(current["fingerprint"], {"algorithm": "sha256", "version": 1})
        self.assertEqual(
            set(current),
            {
                "schemaVersion",
                "sourceSha",
                "dirty",
                "toolchain",
                "policyHash",
                "generatedAt",
                "fingerprint",
                "producers",
                "findings",
            },
        )


class QualityCollectionTests(unittest.TestCase):
    def setUp(self):
        self.policy = load_policy(POLICY_PATH)

    def _write_functional_findings(self, directory):
        path = Path(directory) / "functional-findings.json"
        path.write_text(
            json.dumps(
                {
                    "schemaVersion": 1,
                    "findings": [
                        {
                            "id": "QC-TEST",
                            "fingerprint": "QC-TEST",
                            "module": "backend-emprestimos-estoque",
                            "category": "confiabilidade",
                            "severity": "media",
                            "originalSeverity": "candidata",
                            "tool": "functional",
                            "ruleId": "QC-TEST",
                            "path": "backend/src/Loans/LoansController.cs",
                            "line": 12,
                            "message": "Cenário funcional pendente de triagem.",
                            "evidence": {"test": "fixture", "status": "candidate"},
                            "status": "aberto",
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )
        return path

    @staticmethod
    def _completed(command, *, stdout="", stderr="", returncode=0):
        return subprocess.CompletedProcess(
            command,
            returncode=returncode,
            stdout=stdout,
            stderr=stderr,
        )

    def test_collection_never_reuses_stale_report_after_producer_failure(self):
        from quality_baseline import collect_quality

        with self.subTest("failed producer"):
            with __import__("tempfile").TemporaryDirectory() as directory:
                root = Path(directory)
                output = root / "current.json"
                output.write_text('{"stale": true}\n', encoding="utf-8")
                functional = self._write_functional_findings(root)
                calls = []

                def runner(command, cwd):
                    calls.append((command, cwd))
                    if command[0] == "node":
                        return self._completed(command, stdout="v20.20.2\n")
                    if command[0] == "npm":
                        return self._completed(command, stdout="10.8.2\n")
                    if command[0] == "dotnet" and command[1] == "--version":
                        return self._completed(command, stdout="8.0.419\n")
                    if command[0] == "python":
                        return self._completed(command, stdout="Python 3.12.14\n")
                    if command[0] == "docker" and command[1:3] == ["version", "--format"]:
                        return self._completed(command, stdout="29.7.2\n")
                    if command[0] == "docker" and command[1:3] == ["compose", "version"]:
                        return self._completed(command, stdout="Docker Compose version v5.3.1\n")
                    return self._completed(
                        command,
                        returncode=1,
                        stderr="producer failed after the stale report was created",
                    )

                result = collect_quality(
                    output,
                    repository_root=root,
                    policy_path=POLICY_PATH,
                    functional_findings_path=functional,
                    toolchain_path=REPOSITORY_ROOT / ".github" / "quality" / "toolchain.json",
                    runner=runner,
                )

                self.assertEqual(result.exit_code, 2)
                self.assertTrue(any("ESLint" in error for error in result.errors))
                self.assertEqual(output.read_text(encoding="utf-8"), '{"stale": true}\n')
                self.assertIsNotNone(result.attempt_directory)
                self.assertTrue(result.attempt_directory.exists())
                self.assertGreaterEqual(len(calls), 7)

    def test_collection_rejects_partial_json_and_missing_project_sarif(self):
        from quality_baseline import collect_quality

        for scenario in ("partial-json", "missing-sarif"):
            with self.subTest(scenario=scenario):
                with __import__("tempfile").TemporaryDirectory() as directory:
                    root = Path(directory)
                    output = root / "current.json"
                    functional = self._write_functional_findings(root)

                    def runner(command, cwd):
                        if command[0] == "node":
                            return self._completed(command, stdout="v20.20.2\n")
                        if command[0] == "npm":
                            return self._completed(command, stdout="10.8.2\n")
                        if command[0] == "dotnet" and command[1] == "--version":
                            return self._completed(command, stdout="8.0.419\n")
                        if command[0] == "python":
                            return self._completed(command, stdout="Python 3.12.14\n")
                        if command[0] == "docker" and command[1:3] == ["version", "--format"]:
                            return self._completed(command, stdout="29.7.2\n")
                        if command[0] == "docker" and command[1:3] == ["compose", "version"]:
                            return self._completed(command, stdout="Docker Compose version v5.3.1\n")
                        if command[0] == "npx":
                            report_path = Path(command[command.index("--output-file") + 1])
                            report_path.parent.mkdir(parents=True, exist_ok=True)
                            report_path.write_text(
                                "[{" if scenario == "partial-json" else "[]",
                                encoding="utf-8",
                            )
                            return self._completed(command)
                        if command[0] == "dotnet" and "sln" in command:
                            return self._completed(
                                command,
                                stdout=(
                                    "Projects\n--------\n"
                                    "QualityApp/QualityApp.csproj\n"
                                    "Quality.Tests/Quality.Tests.csproj\n"
                                ),
                            )
                        return self._completed(command)

                    result = collect_quality(
                        output,
                        repository_root=root,
                        policy_path=POLICY_PATH,
                        functional_findings_path=functional,
                        toolchain_path=REPOSITORY_ROOT / ".github" / "quality" / "toolchain.json",
                        solution_path=root / "backend.sln",
                        runner=runner,
                    )

                    self.assertEqual(result.exit_code, 2)
                    expected = "JSON" if scenario == "partial-json" else "SARIF"
                    self.assertTrue(any(expected in error for error in result.errors))
                    self.assertFalse(output.exists())

    def test_collection_rejects_toolchain_divergence_as_operational_failure(self):
        from quality_baseline import collect_quality

        with __import__("tempfile").TemporaryDirectory() as directory:
            root = Path(directory)
            functional = self._write_functional_findings(root)

            def runner(command, cwd):
                if command[0] == "node":
                    return self._completed(command, stdout="v24.14.0\n")
                if command[0] == "npm":
                    return self._completed(command, stdout="10.8.2\n")
                if command[0] == "dotnet" and command[1] == "--version":
                    return self._completed(command, stdout="8.0.419\n")
                if command[0] == "python":
                    return self._completed(command, stdout="Python 3.12.14\n")
                if command[0] == "docker" and command[1:3] == ["version", "--format"]:
                    return self._completed(command, stdout="29.7.2\n")
                if command[0] == "docker" and command[1:3] == ["compose", "version"]:
                    return self._completed(command, stdout="Docker Compose version v5.3.1\n")
                raise AssertionError(f"producer must not run after a version mismatch: {command}")

            result = collect_quality(
                root / "current.json",
                repository_root=root,
                policy_path=POLICY_PATH,
                functional_findings_path=functional,
                toolchain_path=REPOSITORY_ROOT / ".github" / "quality" / "toolchain.json",
                runner=runner,
            )

            self.assertEqual(result.exit_code, 2)
            diagnostics = " ".join(result.errors)
            self.assertIn("node", diagnostics)
            self.assertIn("20.20.2", diagnostics)
            self.assertIn("24.14.0", diagnostics)

    def test_valid_collection_discovers_every_solution_project_and_preserves_findings(self):
        from quality_baseline import collect_quality

        with __import__("tempfile").TemporaryDirectory() as directory:
            root = Path(directory)
            output = root / "current.json"
            functional = self._write_functional_findings(root)
            calls = []

            def runner(command, cwd):
                calls.append((command, cwd))
                if command[0] == "node":
                    return self._completed(command, stdout="v20.20.2\n")
                if command[0] == "npm":
                    return self._completed(command, stdout="10.8.2\n")
                if command[0] == "dotnet" and command[1] == "--version":
                    return self._completed(command, stdout="8.0.419\n")
                if command[0] == "python":
                    return self._completed(command, stdout="Python 3.12.14\n")
                if command[0] == "docker" and command[1:3] == ["version", "--format"]:
                    return self._completed(command, stdout="29.7.2\n")
                if command[0] == "docker" and command[1:3] == ["compose", "version"]:
                    return self._completed(command, stdout="Docker Compose version v5.3.1\n")
                if command[0] == "npx":
                    report_path = Path(command[command.index("--output-file") + 1])
                    report_path.parent.mkdir(parents=True, exist_ok=True)
                    report_path.write_text(
                        (COLLECTION_FIXTURES_ROOT / "eslint-valid.json").read_text(encoding="utf-8"),
                        encoding="utf-8",
                    )
                    return self._completed(command)
                if command[0] == "dotnet" and "sln" in command:
                    return self._completed(
                        command,
                        stdout=(
                            "Projects\n--------\n"
                            "QualityApp/QualityApp.csproj\n"
                            "Quality.Tests/Quality.Tests.csproj\n"
                        ),
                    )
                if command[0] == "dotnet" and command[1] == "restore":
                    return self._completed(command, stdout="Restore succeeded.\n")
                if command[0] == "dotnet" and "build" in command:
                    artifact_root = Path(command[command.index("--artifacts-path") + 1])
                    for filename in ("QualityApp.sarif", "Quality.Tests.sarif"):
                        report_path = artifact_root / filename
                        report_path.parent.mkdir(parents=True, exist_ok=True)
                        report_path.write_text(
                            (COLLECTION_FIXTURES_ROOT / "sarif-valid.json").read_text(encoding="utf-8"),
                            encoding="utf-8",
                        )
                    return self._completed(command, stdout="Build succeeded.\n")
                raise AssertionError(f"unexpected command: {command}")

            result = collect_quality(
                output,
                repository_root=root,
                policy_path=POLICY_PATH,
                functional_findings_path=functional,
                toolchain_path=REPOSITORY_ROOT / ".github" / "quality" / "toolchain.json",
                solution_path=root / "backend.sln",
                runner=runner,
            )

            self.assertEqual(result.exit_code, 0, result.errors)
            current = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(current["schemaVersion"], 1)
            self.assertTrue(current["findings"])
            self.assertTrue(any(item["tool"] == "functional" for item in current["findings"]))
            project_producers = [
                item for item in current["producers"] if item["name"].startswith("dotnet:")
            ]
            self.assertEqual(
                {item["project"] for item in project_producers},
                {"QualityApp", "Quality.Tests"},
            )
            dotnet_commands = [command for command, _ in calls if command[0] == "dotnet"]
            restore_index = next(
                index for index, command in enumerate(dotnet_commands) if command[1] == "restore"
            )
            build_index = next(
                index for index, command in enumerate(dotnet_commands) if command[1] == "build"
            )
            self.assertLess(restore_index, build_index)
            self.assertIn("--locked-mode", dotnet_commands[restore_index])

    def test_render_is_deterministic_and_does_not_mutate_baseline(self):
        from quality_baseline import render_inventory

        with __import__("tempfile").TemporaryDirectory() as directory:
            root = Path(directory)
            current = root / "current.json"
            baseline = root / "baseline.json"
            rendered = root / "inventario.md"
            current.write_text(
                json.dumps(
                    {
                        "schemaVersion": 1,
                        "sourceSha": "abc",
                        "dirty": False,
                        "toolchain": {"node": "20.20.2"},
                        "policyHash": "policy",
                        "generatedAt": "2026-09-14T12:00:00Z",
                        "fingerprint": {"algorithm": "sha256", "version": 1},
                        "producers": [
                            {"name": "eslint", "status": "success", "findings": 1}
                        ],
                        "findings": [
                            {
                                "id": "b",
                                "fingerprint": "b",
                                "module": "frontend-autenticacao",
                                "category": "manutenibilidade",
                                "severity": "media",
                                "originalSeverity": "warning",
                                "tool": "eslint",
                                "ruleId": "complexity",
                                "path": "frontend/src/Login.tsx",
                                "line": 8,
                                "message": "complexidade acima do limite",
                                "evidence": {"source": "fixture"},
                                "status": "aberto",
                            }
                        ],
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )
            baseline.write_text('{"baseline": true}\n', encoding="utf-8")

            first = render_inventory(current, rendered)
            first_text = rendered.read_text(encoding="utf-8")
            second = render_inventory(current, rendered)

            self.assertEqual(first, second)
            self.assertEqual(first_text, rendered.read_text(encoding="utf-8"))
            self.assertIn("frontend-autenticacao", first_text)
            self.assertIn("complexidade acima do limite", first_text)
            self.assertEqual(baseline.read_text(encoding="utf-8"), '{"baseline": true}\n')


class QualityComparisonTests(unittest.TestCase):
    """Executable contracts for the trusted-base quality gate."""

    def setUp(self):
        self.policy = load_policy(POLICY_PATH)
        self.comparison_fixtures = SCRIPTS_ROOT / "tests" / "fixtures" / "quality" / "comparison"

    @staticmethod
    def _finding(
        fingerprint,
        *,
        severity="media",
        status="aberto",
        context="return value;",
        backlog_id="BL-001",
        owner="quality-team",
    ):
        finding = {
            "id": fingerprint,
            "fingerprint": fingerprint,
            "module": "frontend-autenticacao",
            "category": "manutenibilidade",
            "severity": severity,
            "originalSeverity": "warning",
            "tool": "eslint",
            "ruleId": "complexity",
            "path": "frontend/src/pages/Login.tsx",
            "line": 10,
            "message": "complexidade acima do limite",
            "evidence": {"source": "fixture", "context": context},
            "status": status,
        }
        if backlog_id is not None:
            finding["backlogId"] = backlog_id
        if owner is not None:
            finding["owner"] = owner
        return finding

    @staticmethod
    def _git(root, *arguments):
        result = subprocess.run(
            ["git", *arguments],
            cwd=root,
            check=False,
            capture_output=True,
            text=True,
        )
        if result.returncode:
            raise AssertionError(result.stderr)
        return result.stdout.strip()

    def _repository(self, *, baseline_findings=None):
        directory = __import__("tempfile").TemporaryDirectory()
        root = Path(directory.name)
        policy_path = root / ".github" / "quality" / "policy.json"
        policy_path.parent.mkdir(parents=True)
        policy_path.write_text(POLICY_PATH.read_text(encoding="utf-8"), encoding="utf-8")
        (root / "README.md").write_text("base\n", encoding="utf-8")
        if baseline_findings is not None:
            baseline = {
                "schemaVersion": 1,
                "sourceSha": "pending",
                "policyHash": hashlib.sha256(policy_path.read_bytes()).hexdigest(),
                "fingerprint": {"algorithm": "sha256", "version": 1},
                "findings": baseline_findings,
            }
            (root / ".github" / "quality" / "baseline.json").write_text(
                json.dumps(baseline, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
        self._git(root, "init", "-q")
        self._git(root, "config", "user.email", "quality@example.invalid")
        self._git(root, "config", "user.name", "Quality Tests")
        self._git(root, "add", ".")
        self._git(root, "commit", "-qm", "trusted base")
        base_sha = self._git(root, "rev-parse", "HEAD")
        if baseline_findings is not None:
            baseline_path = root / ".github" / "quality" / "baseline.json"
            baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
            baseline["sourceSha"] = base_sha
            baseline_path.write_text(
                json.dumps(baseline, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
            self._git(root, "add", ".github/quality/baseline.json")
            self._git(root, "commit", "-qm", "baseline")
            base_sha = self._git(root, "rev-parse", "HEAD")
        return directory, root, base_sha

    @staticmethod
    def _current(findings, *, policy_hash=None, fingerprint=None, producers=None):
        from quality_baseline import build_current

        return build_current(
            source_sha="candidate-sha",
            dirty=False,
            toolchain={"python": "3.12.14"},
            policy_hash=policy_hash or "unused-in-fixture",
            generated_at="2026-09-15T12:00:00Z",
            producers=producers or [{"name": "fixture", "status": "success", "exitCode": 0, "findings": len(findings)}],
            findings=findings,
        )

    @staticmethod
    def _write_current(root, payload):
        path = root / ".tmp" / "quality" / "current.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return path

    def test_compare_preserves_duplicate_occurrences_and_rejects_replacement(self):
        from quality_baseline import compare_findings

        historical = self._finding("same")
        replacement = self._finding("different", context="return changed;")
        comparison = compare_findings([historical, historical, replacement], [historical, historical])

        self.assertEqual(comparison.exit_code, 1)
        self.assertEqual(comparison.new_occurrences, {"different": 1})
        self.assertIn("novo", " ".join(comparison.violations).lower())

    def test_check_uses_baseline_from_trusted_base_not_worktree_edit(self):
        from quality_baseline import check_quality

        finding = self._finding("historical")
        directory, root, base_sha = self._repository(baseline_findings=[finding])
        try:
            candidate_baseline = root / ".github" / "quality" / "baseline.json"
            candidate_baseline.write_text(
                json.dumps({"schemaVersion": 1, "findings": []}) + "\n", encoding="utf-8"
            )
            policy_hash = hashlib.sha256(
                (root / ".github" / "quality" / "policy.json").read_bytes()
            ).hexdigest()
            current = self._current([finding], policy_hash=policy_hash)
            result = check_quality(
                self._write_current(root, current),
                base_ref=base_sha,
                repository_root=root,
            )
            self.assertEqual(result.exit_code, 0, result.errors + result.violations)
        finally:
            directory.cleanup()

    def test_check_returns_two_for_missing_reference_or_incomplete_collection(self):
        from quality_baseline import check_quality

        finding = self._finding("historical")
        directory, root, base_sha = self._repository(baseline_findings=[finding])
        try:
            policy_hash = hashlib.sha256(
                (root / ".github" / "quality" / "policy.json").read_bytes()
            ).hexdigest()
            current_path = self._write_current(
                root,
                self._current(
                    [finding],
                    policy_hash=policy_hash,
                    producers=[{"name": "fixture", "status": "failed", "exitCode": 1, "findings": 0}],
                ),
            )
            incomplete = check_quality(current_path, base_ref=base_sha, repository_root=root)
            self.assertEqual(incomplete.exit_code, 2)
            self.assertIn("incompleta", " ".join(incomplete.errors).lower())

            missing = check_quality(current_path, base_ref="does-not-exist", repository_root=root)
            self.assertEqual(missing.exit_code, 2)
            self.assertIn("refer", " ".join(missing.errors).lower())
        finally:
            directory.cleanup()

    def test_check_rejects_high_baseline_and_untracked_historical_finding(self):
        from quality_baseline import check_quality

        high = self._finding("high", severity="alta")
        directory, root, base_sha = self._repository(baseline_findings=[high])
        try:
            policy_hash = hashlib.sha256(
                (root / ".github" / "quality" / "policy.json").read_bytes()
            ).hexdigest()
            result = check_quality(
                self._write_current(root, self._current([], policy_hash=policy_hash)),
                base_ref=base_sha,
                repository_root=root,
            )
            self.assertEqual(result.exit_code, 2)
            self.assertIn("alta", " ".join(result.errors).lower())
        finally:
            directory.cleanup()

    def test_check_rejects_generic_false_positive_and_missing_backlog_owner(self):
        from quality_baseline import check_quality

        historical = self._finding("historical", backlog_id=None, owner=None)
        directory, root, base_sha = self._repository(baseline_findings=[historical])
        try:
            policy_hash = hashlib.sha256(
                (root / ".github" / "quality" / "policy.json").read_bytes()
            ).hexdigest()
            result = check_quality(
                self._write_current(root, self._current([historical], policy_hash=policy_hash)),
                base_ref=base_sha,
                repository_root=root,
            )
            self.assertEqual(result.exit_code, 2)
            self.assertIn("backlog", " ".join(result.errors).lower())

            valid = self._finding("valid")
            generic = self._finding("generic", status="falso-positivo")
            directory2, root2, base_sha2 = self._repository(baseline_findings=[valid])
            try:
                policy_hash2 = hashlib.sha256(
                    (root2 / ".github" / "quality" / "policy.json").read_bytes()
                ).hexdigest()
                false_positive = check_quality(
                    self._write_current(root2, self._current([valid, generic], policy_hash=policy_hash2)),
                    base_ref=base_sha2,
                    repository_root=root2,
                )
                self.assertEqual(false_positive.exit_code, 1)
                self.assertIn("falso", " ".join(false_positive.violations).lower())
            finally:
                directory2.cleanup()
        finally:
            directory.cleanup()

    def test_check_bootstraps_base_when_baseline_is_absent(self):
        from quality_baseline import CollectionResult, check_quality

        finding = self._finding("historical")
        directory, root, base_sha = self._repository(baseline_findings=None)
        try:
            policy_hash = hashlib.sha256(
                (root / ".github" / "quality" / "policy.json").read_bytes()
            ).hexdigest()
            base_current = self._current([finding], policy_hash=policy_hash)
            with patch(
                "quality_baseline.collect_quality",
                return_value=CollectionResult(0, [], base_current),
            ) as collect:
                result = check_quality(
                    self._write_current(root, self._current([finding], policy_hash=policy_hash)),
                    base_ref=base_sha,
                    repository_root=root,
                )
            self.assertEqual(result.exit_code, 0, result.errors + result.violations)
            self.assertTrue(collect.called)
        finally:
            directory.cleanup()

    def test_initial_bootstrap_uses_candidate_baseline_for_functional_findings(self):
        from quality_baseline import CollectionResult, check_quality

        finding = self._finding("functional:historical")
        finding["tool"] = "functional"
        directory, root, base_sha = self._repository(baseline_findings=None)
        try:
            policy_hash = hashlib.sha256(
                (root / ".github" / "quality" / "policy.json").read_bytes()
            ).hexdigest()
            baseline = {
                "schemaVersion": 1,
                "sourceSha": "candidate-sha",
                "policyHash": policy_hash,
                "fingerprint": {"algorithm": "sha256", "version": 1},
                "findings": [finding],
            }
            baseline_path = root / ".github" / "quality" / "baseline.json"
            baseline_path.parent.mkdir(parents=True, exist_ok=True)
            baseline_path.write_text(
                json.dumps(baseline, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
            base_current = self._current([], policy_hash=policy_hash)
            with patch(
                "quality_baseline.collect_quality",
                return_value=CollectionResult(0, [], base_current),
            ):
                result = check_quality(
                    self._write_current(root, self._current([finding], policy_hash=policy_hash)),
                    base_ref=base_sha,
                    repository_root=root,
                )
            self.assertEqual(result.exit_code, 0, result.errors + result.violations)
        finally:
            directory.cleanup()

    def test_check_rejects_open_high_current_finding(self):
        from quality_baseline import check_quality

        high = self._finding("high-current", severity="alta")
        directory, root, base_sha = self._repository(baseline_findings=[])
        try:
            policy_hash = hashlib.sha256(
                (root / ".github" / "quality" / "policy.json").read_bytes()
            ).hexdigest()
            result = check_quality(
                self._write_current(root, self._current([high], policy_hash=policy_hash)),
                base_ref=base_sha,
                repository_root=root,
            )
            self.assertEqual(result.exit_code, 1)
            self.assertIn("alto aberto", " ".join(result.violations))
        finally:
            directory.cleanup()

    @patch("quality_baseline.subprocess.run")
    def test_bootstrap_prepares_base_frontend_dependencies(self, run):
        from tempfile import TemporaryDirectory

        with TemporaryDirectory() as directory:
            worktree = Path(directory)
            frontend = worktree / "frontend"
            frontend.mkdir()
            (frontend / "package-lock.json").write_text("{}\n", encoding="utf-8")
            run.return_value = subprocess.CompletedProcess(
                ["npm", "ci"], returncode=0, stdout="", stderr=""
            )

            _prepare_bootstrap_frontend(worktree)

        run.assert_called_once_with(
            resolve_command(["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"]),
            cwd=frontend,
            capture_output=True,
            check=False,
            text=True,
        )

    def test_bootstrap_overlays_only_candidate_quality_configuration(self):
        from tempfile import TemporaryDirectory

        with TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "candidate"
            worktree = root / "base"
            (source / "frontend").mkdir(parents=True)
            (source / "backend").mkdir(parents=True)
            (source / "backend" / "LabSolos-Server-DotNet8").mkdir(parents=True)
            (worktree / "frontend").mkdir(parents=True)
            (worktree / "backend" / "LabSolos-Server-DotNet8").mkdir(parents=True)
            (source / "frontend" / "eslint.quality.config.js").write_text("candidate\n", encoding="utf-8")
            (source / "backend" / "Directory.Build.targets").write_text("candidate\n", encoding="utf-8")
            (worktree / "frontend" / "eslint.quality.config.js").write_text("base\n", encoding="utf-8")

            _overlay_bootstrap_quality_files(source, worktree)

            self.assertEqual(
                (worktree / "frontend" / "eslint.quality.config.js").read_text(encoding="utf-8"),
                "candidate\n",
            )
            self.assertEqual(
                (worktree / "backend" / "Directory.Build.targets").read_text(encoding="utf-8"),
                "candidate\n",
            )

    def test_check_rejects_fingerprint_mismatch_as_operational_failure(self):
        from quality_baseline import check_quality

        finding = self._finding("historical")
        directory, root, base_sha = self._repository(baseline_findings=[finding])
        try:
            policy_hash = hashlib.sha256(
                (root / ".github" / "quality" / "policy.json").read_bytes()
            ).hexdigest()
            current = self._current([finding], policy_hash=policy_hash)
            current["fingerprint"]["version"] = 99
            result = check_quality(
                self._write_current(root, current),
                base_ref=base_sha,
                repository_root=root,
            )
            self.assertEqual(result.exit_code, 2)
            self.assertIn("fingerprint", " ".join(result.errors).lower())
        finally:
            directory.cleanup()


if __name__ == "__main__":
    unittest.main()
