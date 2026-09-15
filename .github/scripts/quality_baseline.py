"""Collect, normalize, and render the repository quality baseline.

The adapters at the top of this module consume native ESLint and SARIF
reports.  The collection entry point deliberately creates a fresh workspace
for every attempt and only replaces the requested output after every producer
has completed successfully.
"""

from __future__ import annotations

import hashlib
import json
import posixpath
import re
import subprocess
import sys
import tempfile
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterable, Mapping, Sequence
from urllib.parse import unquote

from check_quality_toolchain import (
    load_toolchain,
    parse_version,
    resolve_command,
)


SCHEMA_VERSION = 1
FINGERPRINT_ALGORITHM = "sha256"
FINGERPRINT_VERSION = 1
ALLOWED_CATEGORIES = {"manutenibilidade", "confiabilidade", "seguranca"}
ALLOWED_SEVERITIES = {"alta", "media", "baixa"}
ALLOWED_STATES = {"aberto", "corrigido", "falso-positivo"}
REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_POLICY_PATH = REPOSITORY_ROOT / ".github" / "quality" / "policy.json"
DEFAULT_FUNCTIONAL_FINDINGS_PATH = (
    REPOSITORY_ROOT / ".github" / "quality" / "functional-findings.json"
)
DEFAULT_TOOLCHAIN_PATH = REPOSITORY_ROOT / ".github" / "quality" / "toolchain.json"
DEFAULT_SOLUTION_PATH = REPOSITORY_ROOT / "backend" / "backend.sln"


class QualityBaselineError(ValueError):
    """Base error for invalid policy or producer data."""


class MalformedReportError(QualityBaselineError):
    """Raised when a producer report cannot be interpreted safely."""


class UnknownQualityRuleError(QualityBaselineError):
    """Raised when a report contains a rule absent from the policy."""


class ModuleClassificationError(QualityBaselineError):
    """Raised when a source path does not map to exactly one policy module."""


class CollectionError(QualityBaselineError):
    """Raised when a quality producer cannot provide a complete report."""


@dataclass(frozen=True)
class CollectionResult:
    """Outcome of one isolated collection attempt."""

    exit_code: int
    errors: list[str]
    current: dict[str, Any] | None = None
    attempt_directory: Path | None = None


@dataclass(frozen=True)
class ComparisonResult:
    """Comparison between the candidate and the trusted historical findings."""

    exit_code: int
    errors: list[str]
    violations: list[str]
    new_occurrences: dict[str, int]


CommandRunner = Callable[
    [list[str], Path], subprocess.CompletedProcess[str]
]


def _mapping(value: Any, description: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise QualityBaselineError(f"{description} deve ser um objeto JSON")
    return value


def _non_empty_string(value: Any, description: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise QualityBaselineError(f"{description} deve ser uma string não vazia")
    return value.strip()


def _validate_policy(policy: Mapping[str, Any]) -> dict[str, Any]:
    if policy.get("schemaVersion") != SCHEMA_VERSION:
        raise QualityBaselineError("schemaVersion da política deve ser 1")

    fingerprint = _mapping(policy.get("fingerprint"), "fingerprint")
    if fingerprint.get("algorithm") != FINGERPRINT_ALGORITHM:
        raise QualityBaselineError("algoritmo de fingerprint não suportado")
    if fingerprint.get("version") != FINGERPRINT_VERSION:
        raise QualityBaselineError("versão de fingerprint não suportada")

    rules = _mapping(policy.get("rules"), "rules")
    if not rules:
        raise QualityBaselineError("rules não pode ser vazio")
    for rule_id, configuration in rules.items():
        _non_empty_string(rule_id, "ID de regra")
        configuration = _mapping(configuration, f"rules.{rule_id}")
        if configuration.get("category") not in ALLOWED_CATEGORIES:
            raise QualityBaselineError(f"categoria inválida para a regra {rule_id}")
        if configuration.get("severity") not in ALLOWED_SEVERITIES:
            raise QualityBaselineError(f"severidade inválida para a regra {rule_id}")

    modules = policy.get("modules")
    if not isinstance(modules, list) or not modules:
        raise QualityBaselineError("modules deve ser uma lista não vazia")
    for index, module in enumerate(modules):
        module = _mapping(module, f"modules[{index}]")
        _non_empty_string(module.get("name"), f"modules[{index}].name")
        prefixes = module.get("prefixes")
        if not isinstance(prefixes, list) or not prefixes:
            raise QualityBaselineError(f"modules[{index}].prefixes deve ser uma lista não vazia")
        for prefix in prefixes:
            _non_empty_string(prefix, f"modules[{index}].prefixes")

    return dict(policy)


def load_policy(path: str | Path) -> dict[str, Any]:
    """Load and validate the versioned policy without applying defaults."""

    try:
        payload = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise QualityBaselineError(f"política inválida: {Path(path)}") from error
    return _validate_policy(_mapping(payload, "política"))


def _slash_path(value: str) -> str:
    value = unquote(value.strip()).replace("\\", "/")
    if value.lower().startswith("file://"):
        value = value[7:]
    if re.match(r"^/[A-Za-z]:/", value):
        value = value[1:]
    return value


def normalize_path(path: str | Path, repository_root: str | Path | None = None) -> str:
    """Return a repository-relative path with platform separators removed."""

    normalized = _slash_path(str(path))
    if not normalized:
        raise MalformedReportError("relatório contém caminho vazio")

    if repository_root is not None:
        root = _slash_path(str(repository_root)).rstrip("/")
        path_key = normalized.casefold()
        root_key = root.casefold()
        if path_key == root_key:
            normalized = ""
        elif path_key.startswith(root_key + "/"):
            normalized = normalized[len(root) + 1 :]

    normalized = posixpath.normpath(normalized)
    if normalized in {"", "."}:
        raise MalformedReportError("relatório contém caminho sem arquivo")
    if re.match(r"^[A-Za-z]:/", normalized):
        normalized = normalized[3:]
    normalized = normalized.lstrip("/")
    if normalized.startswith("../") or normalized == "..":
        raise MalformedReportError("caminho do relatório sai da raiz do repositório")
    return normalized


def _normalized_prefix(prefix: str) -> str:
    normalized = _slash_path(prefix).rstrip("/")
    while normalized.startswith("./"):
        normalized = normalized[2:]
    return normalized


def module_for_path(
    path: str | Path,
    policy: Mapping[str, Any],
    repository_root: str | Path | None = None,
) -> str:
    """Classify a path; the longest matching prefix wins."""

    normalized = normalize_path(path, repository_root)
    matches: list[tuple[int, str]] = []
    for module in policy["modules"]:
        for prefix in module["prefixes"]:
            candidate = _normalized_prefix(prefix)
            if normalized == candidate or normalized.startswith(candidate + "/"):
                matches.append((len(candidate), module["name"]))

    if not matches:
        raise ModuleClassificationError(f"nenhum módulo configurado para {normalized}")
    longest = max(length for length, _ in matches)
    names = {name for length, name in matches if length == longest}
    if len(names) != 1:
        joined = ", ".join(sorted(names))
        raise ModuleClassificationError(f"módulos ambíguos para {normalized}: {joined}")
    return next(iter(names))


def _rule_configuration(
    tool: str,
    rule_id: str,
    policy: Mapping[str, Any],
) -> Mapping[str, str]:
    rules = policy["rules"]
    candidates = (f"{tool}/{rule_id}", f"{tool}:{rule_id}", rule_id)
    for candidate in candidates:
        if candidate in rules:
            return rules[candidate]
    raise UnknownQualityRuleError(f"regra não classificada: {tool}/{rule_id}")


def normalize_context(context: Any) -> str:
    """Normalize source context for identity while retaining original message."""

    if context is None:
        return ""
    compact = " ".join(str(context).split())
    compact = re.sub(r"\s*([{}()\[\],;])\s*", r"\1", compact)
    compact = re.sub(r"\s*=\s*", "=", compact)
    return compact


def fingerprint_for(
    *,
    tool: str,
    rule_id: str,
    path: str | Path,
    context: Any,
    repository_root: str | Path | None = None,
    **_: Any,
) -> str:
    """Create the stable occurrence identity.

    Line, date, source SHA and machine-specific absolute prefixes are not part
    of this payload.  Repeated equal payloads deliberately receive the same
    identity; callers must retain every returned finding to preserve count.
    """

    identity = {
        "algorithm": FINGERPRINT_ALGORITHM,
        "version": FINGERPRINT_VERSION,
        "tool": _non_empty_string(tool, "tool"),
        "ruleId": _non_empty_string(rule_id, "ruleId"),
        "path": normalize_path(path, repository_root),
        "context": normalize_context(context),
    }
    encoded = json.dumps(identity, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def _original_eslint_severity(value: Any) -> str:
    if value == 1:
        return "warning"
    if value == 2:
        return "error"
    raise MalformedReportError("ESLint contém severidade diferente de 1 ou 2")


def _original_sarif_severity(value: Any) -> str:
    if value in {"error", "warning", "note", "none"}:
        return value
    raise MalformedReportError(f"SARIF contém nível inválido: {value}")


def _optional_line(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise MalformedReportError("linha do relatório deve ser um inteiro positivo")
    return value


def _preserved_fields(
    source: Mapping[str, Any],
    default_evidence: Mapping[str, Any],
) -> dict[str, Any]:
    properties = source.get("properties")
    properties = properties if isinstance(properties, Mapping) else {}
    evidence = source["evidence"] if "evidence" in source else properties.get("evidence", default_evidence)
    status = source.get("status", properties.get("status", "aberto"))
    if status not in ALLOWED_STATES:
        raise MalformedReportError(f"estado inválido no relatório: {status}")

    fields: dict[str, Any] = {"evidence": evidence, "status": status}
    for name in ("backlogId", "owner"):
        if name in source:
            fields[name] = source[name]
        elif name in properties:
            fields[name] = properties[name]
    return fields


def _finding(
    *,
    tool: str,
    rule_id: str,
    original_severity: str,
    path: str,
    line: int | None,
    message: str,
    context: Any,
    policy: Mapping[str, Any],
    preserved: Mapping[str, Any],
) -> dict[str, Any]:
    configuration = _rule_configuration(tool, rule_id, policy)
    fingerprint = fingerprint_for(
        tool=tool,
        rule_id=rule_id,
        path=path,
        context=context,
    )
    finding: dict[str, Any] = {
        "id": fingerprint,
        "fingerprint": fingerprint,
        "module": module_for_path(path, policy),
        "category": configuration["category"],
        "severity": configuration["severity"],
        "originalSeverity": original_severity,
        "tool": tool,
        "ruleId": rule_id,
        "path": path,
        "line": line,
        "message": message,
        "evidence": preserved["evidence"],
        "status": preserved["status"],
    }
    for name in ("backlogId", "owner"):
        if name in preserved:
            finding[name] = preserved[name]
    return finding


def normalize_eslint_report(
    report: Any,
    policy: Mapping[str, Any],
    *,
    repository_root: str | Path | None = None,
) -> list[dict[str, Any]]:
    """Adapt ESLint's JSON formatter output to the current finding model."""

    if not isinstance(report, list):
        raise MalformedReportError("relatório ESLint deve ser uma lista")
    findings: list[dict[str, Any]] = []
    for file_index, file_report in enumerate(report):
        file_report = _mapping(file_report, f"ESLint[{file_index}]")
        path_value = file_report.get("filePath")
        if not isinstance(path_value, str) or not path_value.strip():
            raise MalformedReportError(f"ESLint[{file_index}] não contém filePath")
        path = normalize_path(path_value, repository_root)
        messages = file_report.get("messages")
        if not isinstance(messages, list):
            raise MalformedReportError(f"ESLint[{file_index}].messages deve ser uma lista")
        for message_index, raw_message in enumerate(messages):
            raw_message = _mapping(raw_message, f"ESLint[{file_index}].messages[{message_index}]")
            rule_id = raw_message.get("ruleId")
            if not isinstance(rule_id, str) or not rule_id.strip():
                raise MalformedReportError("mensagem ESLint sem ruleId")
            message = raw_message.get("message")
            if not isinstance(message, str):
                raise MalformedReportError("mensagem ESLint sem texto")
            original_severity = _original_eslint_severity(raw_message.get("severity"))
            context = raw_message.get("source", raw_message.get("context", message))
            evidence = {
                "source": "eslint",
                "column": raw_message.get("column"),
                "endLine": raw_message.get("endLine"),
                "endColumn": raw_message.get("endColumn"),
            }
            finding = _finding(
                tool="eslint",
                rule_id=rule_id,
                original_severity=original_severity,
                path=path,
                line=_optional_line(raw_message.get("line")),
                message=message,
                context=context,
                policy=policy,
                preserved=_preserved_fields(raw_message, evidence),
            )
            findings.append(finding)
    return findings


def _sarif_location(result: Mapping[str, Any]) -> tuple[str, Mapping[str, Any]]:
    locations = result.get("locations")
    if not isinstance(locations, list) or not locations:
        raise MalformedReportError("resultado SARIF sem locations")
    location = _mapping(locations[0], "SARIF location")
    physical = _mapping(location.get("physicalLocation"), "SARIF physicalLocation")
    artifact = _mapping(physical.get("artifactLocation"), "SARIF artifactLocation")
    uri = artifact.get("uri")
    if not isinstance(uri, str) or not uri.strip():
        raise MalformedReportError("resultado SARIF sem artifactLocation.uri")
    return uri, _mapping(physical.get("region", {}), "SARIF region")


def _sarif_rule_id(result: Mapping[str, Any], rules: list[Any]) -> str:
    rule_id = result.get("ruleId")
    if isinstance(rule_id, str) and rule_id.strip():
        return rule_id
    rule_index = result.get("ruleIndex")
    if isinstance(rule_index, int) and 0 <= rule_index < len(rules):
        rule = _mapping(rules[rule_index], "SARIF tool.driver.rules")
        value = rule.get("id")
        if isinstance(value, str) and value.strip():
            return value
    raise MalformedReportError("resultado SARIF sem ruleId")


def normalize_sarif_report(
    report: Any,
    policy: Mapping[str, Any],
    *,
    repository_root: str | Path | None = None,
    tool_name: str | None = None,
) -> list[dict[str, Any]]:
    """Adapt SARIF 2.1 reports, preserving result multiplicity and metadata."""

    report = _mapping(report, "relatório SARIF")
    if report.get("version") != "2.1.0":
        raise MalformedReportError("relatório SARIF deve usar a versão 2.1.0")
    runs = report.get("runs")
    if not isinstance(runs, list) or not runs:
        raise MalformedReportError("relatório SARIF deve conter runs")

    findings: list[dict[str, Any]] = []
    for run_index, raw_run in enumerate(runs):
        run = _mapping(raw_run, f"SARIF runs[{run_index}]")
        tool = _mapping(run.get("tool"), "SARIF tool")
        driver = _mapping(tool.get("driver"), "SARIF tool.driver")
        detected_tool = tool_name or driver.get("name") or "sarif"
        if not isinstance(detected_tool, str) or not detected_tool.strip():
            raise MalformedReportError("SARIF tool.driver.name inválido")
        results = run.get("results")
        if not isinstance(results, list):
            raise MalformedReportError(f"SARIF runs[{run_index}].results deve ser uma lista")
        rules = driver.get("rules", [])
        if not isinstance(rules, list):
            raise MalformedReportError("SARIF tool.driver.rules deve ser uma lista")
        for result_index, raw_result in enumerate(results):
            result = _mapping(raw_result, f"SARIF results[{result_index}]")
            rule_id = _sarif_rule_id(result, rules)
            message_object = _mapping(result.get("message"), "SARIF message")
            message = message_object.get("text")
            if not isinstance(message, str):
                raise MalformedReportError("resultado SARIF sem message.text")
            uri, region = _sarif_location(result)
            snippet = region.get("snippet")
            if snippet is None:
                context = message
            else:
                snippet = _mapping(snippet, "SARIF region.snippet")
                context = snippet.get("text", message)
            path = normalize_path(uri, repository_root)
            evidence = {
                "source": "sarif",
                "level": result.get("level", "warning"),
            }
            findings.append(
                _finding(
                    tool=detected_tool.strip(),
                    rule_id=rule_id,
                    original_severity=_original_sarif_severity(result.get("level", "warning")),
                    path=path,
                    line=_optional_line(region.get("startLine")),
                    message=message,
                    context=context,
                    policy=policy,
                    preserved=_preserved_fields(result, evidence),
                )
            )
    return findings


def build_current(
    *,
    source_sha: str,
    dirty: bool,
    toolchain: Mapping[str, Any],
    policy_hash: str,
    generated_at: str,
    producers: Iterable[Mapping[str, Any]],
    findings: Iterable[Mapping[str, Any]],
) -> dict[str, Any]:
    """Build the versioned current.json envelope without adding defaults."""

    source_sha = _non_empty_string(source_sha, "sourceSha")
    policy_hash = _non_empty_string(policy_hash, "policyHash")
    generated_at = _non_empty_string(generated_at, "generatedAt")
    if not isinstance(dirty, bool):
        raise QualityBaselineError("dirty deve ser booleano")
    toolchain = dict(_mapping(toolchain, "toolchain"))
    producer_list = [dict(_mapping(item, "producer")) for item in producers]
    finding_list = [dict(_mapping(item, "finding")) for item in findings]
    return {
        "schemaVersion": SCHEMA_VERSION,
        "sourceSha": source_sha,
        "dirty": dirty,
        "toolchain": toolchain,
        "policyHash": policy_hash,
        "generatedAt": generated_at,
        "fingerprint": {
            "algorithm": FINGERPRINT_ALGORITHM,
            "version": FINGERPRINT_VERSION,
        },
        "producers": producer_list,
        "findings": finding_list,
    }


def _default_runner(command: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    """Execute one producer without invoking a shell."""

    return subprocess.run(
        resolve_command(command),
        cwd=cwd,
        capture_output=True,
        check=False,
        text=True,
    )


def _read_json(path: Path, description: str) -> Any:
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        raise CollectionError(f"{description} ausente ou ilegível: {path}") from error
    if not text.strip():
        raise MalformedReportError(f"{description} vazio: {path}")
    try:
        return json.loads(text)
    except json.JSONDecodeError as error:
        raise MalformedReportError(f"JSON inválido em {description}: {path}") from error


def _policy_hash(path: Path) -> str:
    try:
        return hashlib.sha256(path.read_bytes()).hexdigest()
    except OSError as error:
        raise QualityBaselineError(f"não foi possível ler a política: {path}") from error


def _git_metadata(repository_root: Path) -> tuple[str, bool]:
    """Capture revision state, with a conservative fallback for fixture roots."""

    try:
        revision = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=repository_root,
            capture_output=True,
            check=False,
            text=True,
        )
        status = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=repository_root,
            capture_output=True,
            check=False,
            text=True,
        )
    except OSError:
        return "unknown", True

    if revision.returncode != 0:
        return "unknown", True
    source_sha = revision.stdout.strip()
    if not source_sha:
        return "unknown", True
    return source_sha, status.returncode != 0 or bool(status.stdout.strip())


def _relative_path(path: Path, repository_root: Path) -> str:
    try:
        return normalize_path(path.resolve(), repository_root.resolve())
    except (OSError, MalformedReportError):
        return normalize_path(path)


def _validate_functional_findings(
    payload: Any,
    policy: Mapping[str, Any],
    path: Path,
) -> list[dict[str, Any]]:
    payload = _mapping(payload, "functional-findings")
    if payload.get("schemaVersion") != SCHEMA_VERSION:
        raise QualityBaselineError("schemaVersion de functional-findings deve ser 1")
    raw_findings = payload.get("findings")
    if not isinstance(raw_findings, list):
        raise QualityBaselineError("functional-findings.findings deve ser uma lista")

    required = {
        "id",
        "fingerprint",
        "module",
        "category",
        "severity",
        "originalSeverity",
        "tool",
        "ruleId",
        "path",
        "line",
        "message",
        "evidence",
        "status",
    }
    findings: list[dict[str, Any]] = []
    for index, raw in enumerate(raw_findings):
        finding = dict(_mapping(raw, f"functional-findings.findings[{index}]"))
        missing = sorted(required - finding.keys())
        if missing:
            raise QualityBaselineError(
                f"achado funcional {index} sem campos: {', '.join(missing)}"
            )
        for field in ("id", "fingerprint", "module", "originalSeverity", "tool", "ruleId", "message"):
            _non_empty_string(finding[field], f"functional-findings.findings[{index}].{field}")
        if finding["category"] not in ALLOWED_CATEGORIES:
            raise QualityBaselineError(f"categoria funcional inválida: {finding['id']}")
        if finding["severity"] not in ALLOWED_SEVERITIES:
            raise QualityBaselineError(f"severidade funcional inválida: {finding['id']}")
        if finding["status"] not in ALLOWED_STATES:
            raise QualityBaselineError(f"estado funcional inválido: {finding['id']}")
        if not isinstance(finding["evidence"], Mapping):
            raise QualityBaselineError(f"evidência funcional inválida: {finding['id']}")
        normalized_path = normalize_path(finding["path"])
        if finding["line"] is not None:
            finding["line"] = _optional_line(finding["line"])
        finding["path"] = normalized_path
        actual_module = module_for_path(normalized_path, policy)
        if finding["module"] != actual_module:
            raise ModuleClassificationError(
                f"módulo funcional incorreto para {normalized_path}: "
                f"declarado {finding['module']}, esperado {actual_module}"
            )
        findings.append(finding)
    return findings


def load_functional_findings(
    path: str | Path = DEFAULT_FUNCTIONAL_FINDINGS_PATH,
    *,
    policy: Mapping[str, Any],
) -> list[dict[str, Any]]:
    """Load functional candidates without changing their declared status."""

    functional_path = Path(path)
    return _validate_functional_findings(
        _read_json(functional_path, "functional-findings"), policy, functional_path
    )


def _run_toolchain(
    manifest: Mapping[str, Any],
    repository_root: Path,
    runner: CommandRunner,
) -> dict[str, Any]:
    tools = _mapping(manifest.get("tools"), "tools")
    required: dict[str, str] = {}
    observed: dict[str, str] = {}
    errors: list[str] = []
    for name, raw_specification in tools.items():
        specification = _mapping(raw_specification, f"tools.{name}")
        command = list(specification["command"])
        expected = _non_empty_string(specification.get("required"), f"tools.{name}.required")
        parser_name = _non_empty_string(specification.get("parser", name), f"tools.{name}.parser")
        required[name] = expected
        try:
            completed = runner(command, repository_root)
        except (FileNotFoundError, OSError) as error:
            errors.append(f"{name}: executável não encontrado ou indisponível")
            continue
        if completed.returncode != 0:
            errors.append(f"{name}: comando terminou com código {completed.returncode}")
            continue
        try:
            value = parse_version(parser_name, f"{completed.stdout or ''}\n{completed.stderr or ''}")
        except ValueError as error:
            errors.append(str(error))
            continue
        observed[name] = value
        if value != expected:
            errors.append(
                f"{name}: versão incompatível; requerida {expected}, observada {value}"
            )

    if errors:
        raise CollectionError("verificação de ambiente falhou: " + "; ".join(errors))
    return {
        "required": required,
        "observed": observed,
        "runner": dict(_mapping(manifest.get("runner"), "runner")),
        "playwright": dict(_mapping(manifest.get("playwright"), "playwright")),
    }


def _producer_record(
    *,
    name: str,
    command: Sequence[str],
    cwd: Path,
    repository_root: Path,
    completed: subprocess.CompletedProcess[str],
    report_path: Path,
    findings: int,
    project: str | None = None,
    project_path: str | None = None,
) -> dict[str, Any]:
    record: dict[str, Any] = {
        "name": name,
        "status": "success",
        "exitCode": completed.returncode,
        "command": list(command),
        "cwd": _relative_path(cwd, repository_root),
        "stdout": completed.stdout or "",
        "stderr": completed.stderr or "",
        "reportPath": _relative_path(report_path, repository_root),
        "findings": findings,
    }
    if project is not None:
        record["project"] = project
    if project_path is not None:
        record["projectPath"] = project_path
    return record


def _infer_report_root(
    report: Any,
    repository_root: Path,
    policy: Mapping[str, Any],
) -> Path | str:
    """Support native absolute paths and portable fixture roots alike."""

    if not isinstance(report, list):
        return repository_root
    prefixes = {
        _normalized_prefix(prefix).split("/", 1)[0]
        for module in policy["modules"]
        for prefix in module["prefixes"]
        if _normalized_prefix(prefix)
    }
    for item in report:
        if not isinstance(item, Mapping) or not isinstance(item.get("filePath"), str):
            continue
        raw = _slash_path(item["filePath"])
        is_absolute = raw.startswith("/") or re.match(r"^[A-Za-z]:/", raw) is not None
        if not is_absolute:
            continue
        parts = [part for part in raw.split("/") if part]
        for index, part in enumerate(parts):
            if part in prefixes and index > 0:
                return "/" + "/".join(parts[:index])
    return repository_root


def _solution_projects(
    solution_path: Path,
    repository_root: Path,
    runner: CommandRunner,
) -> list[str]:
    command = ["dotnet", "sln", str(solution_path), "list"]
    try:
        completed = runner(command, repository_root)
    except (FileNotFoundError, OSError) as error:
        raise CollectionError("dotnet não está disponível para descobrir a solução") from error
    if completed.returncode != 0:
        raise CollectionError(
            f"dotnet sln list terminou com código {completed.returncode}: "
            f"{(completed.stderr or '').strip()}"
        )
    projects: list[str] = []
    for raw_line in (completed.stdout or "").splitlines():
        line = raw_line.strip()
        if not line.lower().endswith(".csproj"):
            continue
        project = normalize_path(line, repository_root)
        if project not in projects:
            projects.append(project)
    if not projects:
        raise CollectionError("a solução não declarou nenhum projeto .csproj")
    return projects


def _project_name(project_path: str) -> str:
    return posixpath.splitext(posixpath.basename(project_path))[0]


def _find_project_reports(
    artifact_root: Path,
    projects: Sequence[str],
) -> dict[str, Path]:
    reports = sorted(artifact_root.rglob("*.sarif")) if artifact_root.exists() else []
    by_name: dict[str, list[Path]] = {}
    for report in reports:
        by_name.setdefault(report.stem.casefold(), []).append(report)

    selected: dict[str, Path] = {}
    used: set[Path] = set()
    for project in projects:
        name = _project_name(project)
        candidates = by_name.get(name.casefold(), [])
        if len(candidates) != 1:
            raise CollectionError(
                f"SARIF ausente ou ambíguo para o projeto {project}; "
                f"encontrados {len(candidates)}"
            )
        selected[project] = candidates[0]
        used.add(candidates[0])

    extras = [report for report in reports if report not in used]
    if extras:
        names = ", ".join(str(item) for item in extras)
        raise CollectionError(f"SARIF sem projeto correspondente: {names}")
    return selected


def collect_quality(
    output: str | Path,
    *,
    repository_root: str | Path = REPOSITORY_ROOT,
    policy_path: str | Path = DEFAULT_POLICY_PATH,
    functional_findings_path: str | Path = DEFAULT_FUNCTIONAL_FINDINGS_PATH,
    toolchain_path: str | Path = DEFAULT_TOOLCHAIN_PATH,
    solution_path: str | Path = DEFAULT_SOLUTION_PATH,
    runner: CommandRunner = _default_runner,
) -> CollectionResult:
    """Run all quality producers in a fresh attempt workspace."""

    output_path = Path(output)
    root = Path(repository_root)
    attempt: Path | None = None
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        attempt = Path(
            tempfile.mkdtemp(prefix=f"{output_path.stem}-attempt-", dir=output_path.parent)
        )
        policy = load_policy(policy_path)
        manifest = load_toolchain(Path(toolchain_path))
        functional_findings = load_functional_findings(
            functional_findings_path, policy=policy
        )
        toolchain = _run_toolchain(manifest, root, runner)

        eslint_report_path = attempt / "frontend" / "eslint.json"
        eslint_report_path.parent.mkdir(parents=True, exist_ok=True)
        eslint_command = [
            "npx",
            "--no-install",
            "eslint",
            ".",
            "--config",
            "eslint.quality.config.js",
            "--format",
            "json",
            "--output-file",
            str(eslint_report_path),
        ]
        try:
            eslint_result = runner(eslint_command, root / "frontend")
        except (FileNotFoundError, OSError) as error:
            raise CollectionError("ESLint não está disponível") from error
        if eslint_result.returncode != 0:
            raise CollectionError(
                f"ESLint terminou com código {eslint_result.returncode}: "
                f"{(eslint_result.stderr or '').strip()}"
            )
        eslint_report = _read_json(eslint_report_path, "relatório ESLint")
        eslint_findings = normalize_eslint_report(
            eslint_report,
            policy,
            repository_root=_infer_report_root(eslint_report, root, policy),
        )

        projects = _solution_projects(Path(solution_path), root, runner)
        backend_artifact_root = attempt / "backend"
        restore_command = [
            "dotnet",
            "restore",
            str(solution_path),
            "--locked-mode",
            "--artifacts-path",
            str(backend_artifact_root),
            "--nologo",
        ]
        try:
            restore_result = runner(restore_command, root)
        except (FileNotFoundError, OSError) as error:
            raise CollectionError("dotnet nÃ£o estÃ¡ disponÃ­vel para a restauraÃ§Ã£o") from error
        if restore_result.returncode != 0:
            raise CollectionError(
                f"restauraÃ§Ã£o .NET terminou com cÃ³digo {restore_result.returncode}: "
                f"{(restore_result.stderr or '').strip()}"
            )

        dotnet_command = [
            "dotnet",
            "build",
            str(solution_path),
            "--no-restore",
            "--configuration",
            "Release",
            "--artifacts-path",
            str(backend_artifact_root),
            "-t:Rebuild",
            "--nologo",
            "--disable-build-servers",
        ]
        try:
            dotnet_result = runner(dotnet_command, root)
        except (FileNotFoundError, OSError) as error:
            raise CollectionError("dotnet não está disponível para a reconstrução") from error
        if dotnet_result.returncode != 0:
            raise CollectionError(
                f"reconstrução .NET terminou com código {dotnet_result.returncode}: "
                f"{(dotnet_result.stderr or '').strip()}"
            )

        project_reports = _find_project_reports(backend_artifact_root, projects)
        dotnet_findings: list[dict[str, Any]] = []
        producers: list[dict[str, Any]] = [
            _producer_record(
                name="eslint",
                command=eslint_command,
                cwd=root / "frontend",
                repository_root=root,
                completed=eslint_result,
                report_path=eslint_report_path,
                findings=len(eslint_findings),
            )
        ]
        for project in projects:
            report_path = project_reports[project]
            report = _read_json(report_path, f"SARIF do projeto {project}")
            findings = normalize_sarif_report(
                report,
                policy,
                repository_root=root,
                tool_name="dotnet",
            )
            dotnet_findings.extend(findings)
            producers.append(
                _producer_record(
                    name=f"dotnet:{_project_name(project)}",
                    command=dotnet_command,
                    cwd=root,
                    repository_root=root,
                    completed=dotnet_result,
                    report_path=report_path,
                    findings=len(findings),
                    project=_project_name(project),
                    project_path=project,
                )
            )

        source_sha, dirty = _git_metadata(root)
        current = build_current(
            source_sha=source_sha,
            dirty=dirty,
            toolchain=toolchain,
            policy_hash=_policy_hash(Path(policy_path)),
            generated_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            producers=producers,
            findings=[*eslint_findings, *dotnet_findings, *functional_findings],
        )
        output_path.write_text(
            json.dumps(current, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        return CollectionResult(0, [], current, attempt)
    except (CollectionError, QualityBaselineError, OSError) as error:
        return CollectionResult(2, [str(error)], None, attempt)


def _validate_current_for_render(payload: Any, path: Path) -> Mapping[str, Any]:
    current = _mapping(payload, f"current inválido: {path}")
    if current.get("schemaVersion") != SCHEMA_VERSION:
        raise QualityBaselineError("schemaVersion de current deve ser 1")
    for key in ("sourceSha", "policyHash", "generatedAt", "toolchain", "producers", "findings"):
        if key not in current:
            raise QualityBaselineError(f"current sem campo obrigatório: {key}")
    if not isinstance(current["producers"], list) or not isinstance(current["findings"], list):
        raise QualityBaselineError("producers e findings de current devem ser listas")
    return current


def _severity_order(value: str) -> int:
    return {"alta": 0, "media": 1, "baixa": 2}.get(value, 3)


def render_inventory(
    current_path: str | Path,
    output: str | Path,
) -> str:
    """Render a stable human-readable inventory without changing quality data."""

    current_file = Path(current_path)
    current = _validate_current_for_render(_read_json(current_file, "current"), current_file)
    findings = [dict(_mapping(item, "finding")) for item in current["findings"]]
    findings.sort(
        key=lambda item: (
            str(item.get("module", "")),
            _severity_order(str(item.get("severity", ""))),
            str(item.get("path", "")),
            item.get("line") if isinstance(item.get("line"), int) else 0,
            str(item.get("ruleId", "")),
            str(item.get("fingerprint", item.get("id", ""))),
        )
    )

    producer_lines = [
        "| Produtor | Projeto | Estado | Achados | Relatório |",
        "|---|---|---|---:|---|",
    ]
    for raw_producer in sorted(
        current["producers"], key=lambda item: str(item.get("name", ""))
    ):
        producer = _mapping(raw_producer, "producer")
        producer_lines.append(
            "| {name} | {project} | {status} | {findings} | `{report}` |".format(
                name=producer.get("name", ""),
                project=producer.get("project", "—"),
                status=producer.get("status", ""),
                findings=producer.get("findings", 0),
                report=producer.get("reportPath", "—"),
            )
        )

    grouped: dict[str, list[Mapping[str, Any]]] = {}
    for finding in findings:
        grouped.setdefault(str(finding.get("module", "não classificado")), []).append(finding)
    severity_counts = Counter(str(item.get("severity", "não classificada")) for item in findings)
    lines = [
        "# Inventário de qualidade",
        "",
        f"- Revisão: `{current['sourceSha']}`",
        f"- Working tree alterado: `{'sim' if current.get('dirty') else 'não'}`",
        f"- Gerado em: `{current['generatedAt']}`",
        f"- Achados: **{len(findings)}** (alta: {severity_counts.get('alta', 0)}, "
        f"média: {severity_counts.get('media', 0)}, baixa: {severity_counts.get('baixa', 0)})",
        "",
        "## Produtores",
        "",
        *producer_lines,
        "",
        "## Achados por módulo",
        "",
    ]
    if not grouped:
        lines.append("Nenhum achado foi produzido.")
    else:
        for module, module_findings in sorted(grouped.items()):
            lines.extend([f"### {module}", ""])
            for finding in module_findings:
                line = finding.get("line")
                location = f"{finding.get('path')}:{line}" if line is not None else str(finding.get("path"))
                lines.append(
                    f"- **{finding.get('severity')}** `{finding.get('ruleId')}` "
                    f"({finding.get('status')}) — `{location}` — {finding.get('message')}"
                )
                evidence = finding.get("evidence")
                if evidence:
                    lines.append(f"  - Evidência: `{json.dumps(evidence, ensure_ascii=False, sort_keys=True)}`")
            lines.append("")

    rendered = "\n".join(lines).rstrip() + "\n"
    output_path = Path(output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(rendered, encoding="utf-8")
    return rendered


def _finding_fingerprint(finding: Any, index: int) -> str:
    finding = _mapping(finding, f"finding[{index}]")
    value = finding.get("fingerprint", finding.get("id"))
    return _non_empty_string(value, f"finding[{index}].fingerprint")


def _validate_fingerprint_metadata(payload: Mapping[str, Any], description: str) -> None:
    fingerprint = _mapping(payload.get("fingerprint"), f"fingerprint de {description}")
    if fingerprint.get("algorithm") != FINGERPRINT_ALGORITHM:
        raise QualityBaselineError(f"fingerprint de {description} usa algoritmo incompatível")
    if fingerprint.get("version") != FINGERPRINT_VERSION:
        raise QualityBaselineError(f"fingerprint de {description} usa versão incompatível")


def _validate_baseline(payload: Any, path: Path) -> Mapping[str, Any]:
    baseline = _mapping(payload, f"baseline inválido: {path}")
    if baseline.get("schemaVersion") != SCHEMA_VERSION:
        raise QualityBaselineError("schemaVersion de baseline deve ser 1")
    for key in ("sourceSha", "policyHash", "fingerprint", "findings"):
        if key not in baseline:
            raise QualityBaselineError(f"baseline sem campo obrigatório: {key}")
    _non_empty_string(baseline["sourceSha"], "baseline.sourceSha")
    _non_empty_string(baseline["policyHash"], "baseline.policyHash")
    _validate_fingerprint_metadata(baseline, "baseline")
    findings = baseline["findings"]
    if not isinstance(findings, list):
        raise QualityBaselineError("baseline.findings deve ser uma lista")
    for index, finding in enumerate(findings):
        finding = _mapping(finding, f"baseline.findings[{index}]")
        _finding_fingerprint(finding, index)
        severity = finding.get("severity")
        if severity not in ALLOWED_SEVERITIES:
            raise QualityBaselineError(
                f"severidade inválida no baseline.findings[{index}]"
            )
        status = finding.get("status", "aberto")
        if status not in ALLOWED_STATES:
            raise QualityBaselineError(f"estado inválido no baseline.findings[{index}]")
        if severity in {"media", "baixa"}:
            for field in ("backlogId", "owner"):
                _non_empty_string(
                    finding.get(field), f"baseline.findings[{index}].{field}"
                )
    return baseline


def _validate_current_for_check(payload: Any, path: Path) -> Mapping[str, Any]:
    current = _validate_current_for_render(payload, path)
    _validate_fingerprint_metadata(current, "current")
    for index, finding in enumerate(current["findings"]):
        _finding_fingerprint(finding, index)
    producers = current["producers"]
    if not producers:
        raise CollectionError("coleta incompleta: nenhum produtor foi executado")
    for index, raw_producer in enumerate(producers):
        producer = _mapping(raw_producer, f"current.producers[{index}]")
        if producer.get("status") != "success" or producer.get("exitCode") != 0:
            raise CollectionError(
                f"coleta incompleta: produtor {producer.get('name', index)} falhou"
            )
    return current


def compare_findings(
    current_findings: Iterable[Mapping[str, Any]],
    baseline_findings: Iterable[Mapping[str, Any]],
) -> ComparisonResult:
    """Compare occurrence multiplicity without allowing count-based replacement."""

    try:
        current = [
            dict(_mapping(item, "current finding"))
            for item in current_findings
            if item.get("status") != "corrigido"
        ]
        baseline = [dict(_mapping(item, "baseline finding")) for item in baseline_findings]
        current_keys = [_finding_fingerprint(item, index) for index, item in enumerate(current)]
        baseline_keys = [_finding_fingerprint(item, index) for index, item in enumerate(baseline)]
    except QualityBaselineError as error:
        return ComparisonResult(2, [str(error)], [], {})

    current_counts = Counter(current_keys)
    baseline_counts = Counter(baseline_keys)
    new_counts = current_counts - baseline_counts
    violations: list[str] = []

    baseline_false_positive_counts = Counter(
        key
        for key, finding in zip(baseline_keys, baseline)
        if finding.get("status") == "falso-positivo"
    )
    current_false_positive_counts = Counter(
        key
        for key, finding in zip(current_keys, current)
        if finding.get("status") == "falso-positivo"
    )

    for key in sorted(new_counts):
        count = new_counts[key]
        sample = next(finding for finding, value in zip(current, current_keys) if value == key)
        if sample.get("status") == "falso-positivo":
            violations.append(
                f"falso-positivo sem correspondência histórica exata: {key} ({count})"
            )
        else:
            violations.append(f"achado novo: {key} ({count})")

    for key, count in sorted(current_false_positive_counts.items()):
        if count > baseline_false_positive_counts.get(key, 0):
            message = f"falso-positivo sem justificativa/correspondência exata: {key}"
            if message not in violations:
                violations.append(message)

    return ComparisonResult(1 if violations else 0, [], violations, dict(new_counts))


def _git_output(repository_root: Path, command: list[str]) -> str:
    try:
        completed = subprocess.run(
            command,
            cwd=repository_root,
            capture_output=True,
            check=False,
            text=True,
        )
    except OSError as error:
        raise CollectionError(f"git indisponível ao resolver a revisão: {error}") from error
    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout or "").strip()
        raise CollectionError(f"referência base inválida ou ausente: {command[-1]} {detail}")
    return completed.stdout.strip()


def _trusted_file(repository_root: Path, base_ref: str, relative_path: str) -> bytes | None:
    spec = f"{base_ref}:{relative_path}"
    try:
        completed = subprocess.run(
            ["git", "show", spec],
            cwd=repository_root,
            capture_output=True,
            check=False,
        )
    except OSError as error:
        raise CollectionError(f"git indisponível ao ler {relative_path}") from error
    if completed.returncode != 0:
        return None
    return completed.stdout


def _bootstrap_trusted_current(
    repository_root: Path,
    base_sha: str,
    policy_bytes: bytes,
) -> Mapping[str, Any]:
    """Collect the trusted base in a disposable worktree when no baseline exists."""

    import shutil

    with tempfile.TemporaryDirectory(prefix="quality-baseline-") as directory:
        worktree = Path(directory) / "base"
        try:
            subprocess.run(
                ["git", "worktree", "add", "--detach", str(worktree), base_sha],
                cwd=repository_root,
                capture_output=True,
                check=True,
                text=True,
            )
        except (OSError, subprocess.CalledProcessError) as error:
            raise CollectionError("não foi possível criar checkout isolado da base") from error

        try:
            _overlay_bootstrap_quality_files(repository_root, worktree)
            _prepare_bootstrap_frontend(worktree)
            policy_path = worktree / ".github" / "quality" / "policy.json"
            if not policy_path.exists():
                policy_path.parent.mkdir(parents=True, exist_ok=True)
                policy_path.write_bytes(policy_bytes)
            functional_path = worktree / ".github" / "quality" / "functional-findings.json"
            if not functional_path.exists():
                functional_path.write_text(
                    json.dumps({"schemaVersion": SCHEMA_VERSION, "findings": []}) + "\n",
                    encoding="utf-8",
                )
            toolchain_path = worktree / ".github" / "quality" / "toolchain.json"
            if not toolchain_path.exists():
                toolchain_path = REPOSITORY_ROOT / ".github" / "quality" / "toolchain.json"
            solution_path = worktree / "backend" / "backend.sln"
            if not solution_path.exists():
                solution_path = DEFAULT_SOLUTION_PATH
            output = worktree / ".tmp" / "quality" / "trusted-current.json"
            result = collect_quality(
                output,
                repository_root=worktree,
                policy_path=policy_path,
                functional_findings_path=functional_path,
                toolchain_path=toolchain_path,
                solution_path=solution_path,
            )
            if result.exit_code != 0 or result.current is None:
                details = "; ".join(result.errors) or "coleta sem resultado"
                raise CollectionError(f"bootstrap da base falhou: {details}")
            return result.current
        finally:
            subprocess.run(
                ["git", "worktree", "remove", "--force", str(worktree)],
                cwd=repository_root,
                capture_output=True,
                check=False,
                text=True,
            )
            if worktree.exists():
                shutil.rmtree(worktree, ignore_errors=True)


def _overlay_bootstrap_quality_files(repository_root: Path, worktree: Path) -> None:
    """Overlay candidate-only analyzer configuration onto the base checkout."""

    import shutil

    relative_paths = (
        "global.json",
        "frontend/eslint.quality.config.js",
        "backend/Directory.Build.props",
        "backend/Directory.Build.targets",
        "backend/.editorconfig",
        "backend/LabSolos-Server-DotNet8/.editorconfig",
    )
    for relative_path in relative_paths:
        source = repository_root / relative_path
        if not source.is_file():
            continue
        target = worktree / relative_path
        target.parent.mkdir(parents=True, exist_ok=True)
        try:
            shutil.copyfile(source, target)
        except OSError as error:
            raise CollectionError(
                f"não foi possível preparar configuração de qualidade da base: {relative_path}"
            ) from error


def _prepare_bootstrap_frontend(worktree: Path) -> None:
    """Install only the base checkout's frontend dependencies before collecting it."""

    frontend = worktree / "frontend"
    lockfile = frontend / "package-lock.json"
    if not lockfile.exists():
        return
    try:
        completed = subprocess.run(
            resolve_command(["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"]),
            cwd=frontend,
            capture_output=True,
            check=False,
            text=True,
        )
    except OSError as error:
        raise CollectionError("npm indisponível para preparar o bootstrap da base") from error
    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout or "").strip()
        raise CollectionError(
            f"instalação frontend do bootstrap terminou com código {completed.returncode}: {detail}"
        )


def check_quality(
    current_path: str | Path,
    *,
    base_ref: str,
    repository_root: str | Path = REPOSITORY_ROOT,
) -> ComparisonResult:
    """Apply the quality gate using only policy and baseline from ``base_ref``."""

    root = Path(repository_root)
    try:
        current_file = Path(current_path)
        current = _validate_current_for_render(_read_json(current_file, "current"), current_file)
        _validate_fingerprint_metadata(current, "current")
        for index, finding in enumerate(current["findings"]):
            _finding_fingerprint(finding, index)
        base_sha = _git_output(root, ["git", "rev-parse", "--verify", f"{base_ref}^{{commit}}"])
        policy_bytes = _trusted_file(root, base_ref, ".github/quality/policy.json")
        baseline_bytes = _trusted_file(root, base_ref, ".github/quality/baseline.json")
        if policy_bytes is None:
            if baseline_bytes is not None:
                raise CollectionError("política ausente na revisão base confiável")
            candidate_policy = root / ".github" / "quality" / "policy.json"
            try:
                policy_bytes = candidate_policy.read_bytes()
            except OSError as error:
                raise CollectionError("política ausente na revisão base e na revisão candidata") from error
        trusted_policy_hash = hashlib.sha256(policy_bytes).hexdigest()
        working_policy = root / ".github" / "quality" / "policy.json"
        policy_matches_trusted = False
        if working_policy.exists():
            try:
                policy_matches_trusted = load_policy(working_policy) == json.loads(
                    policy_bytes.decode("utf-8")
                )
            except (OSError, UnicodeError, json.JSONDecodeError, QualityBaselineError):
                policy_matches_trusted = False
        current_policy_hashes = {trusted_policy_hash}
        if working_policy.exists():
            current_policy_hashes.add(_policy_hash(working_policy))
        if not policy_matches_trusted or current["policyHash"] not in current_policy_hashes:
            raise QualityBaselineError(
                "policyHash da coleta não corresponde à política da revisão base"
            )

        if baseline_bytes is None:
            base_current = _bootstrap_trusted_current(root, base_sha, policy_bytes)
            base_current = _validate_current_for_check(base_current, Path("baseline bootstrap"))
            baseline_findings = list(base_current["findings"])
            candidate_baseline_path = root / ".github" / "quality" / "baseline.json"
            if candidate_baseline_path.exists():
                candidate_baseline = _validate_baseline(
                    _read_json(candidate_baseline_path, "baseline candidato"),
                    candidate_baseline_path,
                )
                if candidate_baseline["policyHash"] not in current_policy_hashes:
                    raise QualityBaselineError(
                        "policyHash do baseline candidato não corresponde à política base"
                    )
                candidate_findings = list(candidate_baseline["findings"])
                current_keys = Counter(
                    _finding_fingerprint(finding, index)
                    for index, finding in enumerate(current["findings"])
                )
                candidate_keys = Counter(
                    _finding_fingerprint(finding, index)
                    for index, finding in enumerate(candidate_findings)
                )
                if candidate_keys - current_keys:
                    raise QualityBaselineError(
                        "baseline candidato contém ocorrência ausente da coleta atual"
                    )
                candidate_static = [
                    finding for finding in candidate_findings if finding.get("tool") != "functional"
                ]
                trusted_static = [
                    finding for finding in base_current["findings"] if finding.get("tool") != "functional"
                ]
                candidate_comparison = compare_findings(candidate_static, trusted_static)
                if candidate_comparison.errors:
                    raise QualityBaselineError(
                        "; ".join(candidate_comparison.errors)
                    )
                if candidate_comparison.violations:
                    raise QualityBaselineError(
                        "baseline candidato inclui achados estáticos ausentes na base confiável: "
                        + "; ".join(candidate_comparison.violations)
                    )
                baseline_findings = candidate_findings
        else:
            try:
                baseline_payload = json.loads(baseline_bytes.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as error:
                raise QualityBaselineError("baseline da revisão base não é JSON válido") from error
            baseline = _validate_baseline(baseline_payload, Path("baseline@" + base_ref))
            baseline_policy_hashes = {trusted_policy_hash}
            if working_policy.exists():
                baseline_policy_hashes.add(_policy_hash(working_policy))
            if baseline["policyHash"] not in baseline_policy_hashes:
                raise QualityBaselineError("policyHash do baseline não corresponde à política base")
            baseline_findings = list(baseline["findings"])

        current = _validate_current_for_check(current, current_file)

        high_open = [
            finding
            for finding in current["findings"]
            if finding.get("severity") == "alta" and finding.get("status") == "aberto"
        ]
        if high_open:
            return ComparisonResult(
                1,
                [],
                [
                    "achado alto aberto: "
                    + str(finding.get("fingerprint", finding.get("id", "desconhecido")))
                    for finding in high_open
                ],
                {},
            )

        high_historical = [
            finding for finding in baseline_findings if finding.get("severity") == "alta"
        ]
        if high_historical:
            raise QualityBaselineError(
                f"baseline contém {len(high_historical)} achado(s) de severidade alta"
            )
        comparison = compare_findings(current["findings"], baseline_findings)
        return comparison
    except (QualityBaselineError, CollectionError, OSError) as error:
        return ComparisonResult(2, [str(error)], [], {})


def _build_parser() -> Any:
    import argparse

    parser = argparse.ArgumentParser(description="Coleta e renderiza o inventário de qualidade.")
    subparsers = parser.add_subparsers(dest="command", required=True)
    collect_parser = subparsers.add_parser("collect", help="executa os produtores reais")
    collect_parser.add_argument("--output", type=Path, required=True)
    collect_parser.add_argument("--policy", type=Path, default=DEFAULT_POLICY_PATH)
    collect_parser.add_argument("--functional-findings", type=Path, default=DEFAULT_FUNCTIONAL_FINDINGS_PATH)
    collect_parser.add_argument("--toolchain", type=Path, default=DEFAULT_TOOLCHAIN_PATH)
    collect_parser.add_argument("--solution", type=Path, default=DEFAULT_SOLUTION_PATH)
    render_parser = subparsers.add_parser("render", help="gera o inventário legível")
    render_parser.add_argument("--current", type=Path, required=True)
    render_parser.add_argument("--output", type=Path, required=True)
    check_parser = subparsers.add_parser("check", help="aplica o gate contra a base confiável")
    check_parser.add_argument("--current", type=Path, required=True)
    check_parser.add_argument("--base-ref", required=True)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    if args.command == "collect":
        result = collect_quality(
            args.output,
            policy_path=args.policy,
            functional_findings_path=args.functional_findings,
            toolchain_path=args.toolchain,
            solution_path=args.solution,
        )
        if result.exit_code == 0:
            print(f"current.json gerado em {args.output}")
            return 0
        for error in result.errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return result.exit_code
    if args.command == "check":
        result = check_quality(args.current, base_ref=args.base_ref)
        for error in result.errors:
            print(f"ERROR: {error}", file=sys.stderr)
        for violation in result.violations:
            print(f"VIOLATION: {violation}", file=sys.stderr)
        return result.exit_code
    try:
        render_inventory(args.current, args.output)
    except (QualityBaselineError, OSError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 2
    print(f"inventário gerado em {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
