#!/usr/bin/env python3
"""Normalize dependency vulnerability reports into auditable Markdown snapshots."""

from __future__ import annotations

import argparse
from dataclasses import dataclass, replace
from datetime import date, datetime, timezone
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
from typing import Any, Iterable, Mapping, Sequence


SOURCE_NAMES = {
    "npm": "npm-audit",
    "nuget": "nuget-audit",
    "dependabot": "dependabot",
}
SEVERITY_ORDER = {"unknown": -1, "low": 0, "moderate": 1, "high": 2, "critical": 3}
UNAVAILABLE = "indisponível"
UNKNOWN = "desconhecida"
FIX_AVAILABLE = "disponível (versão não resolvida)"
UNRESOLVED = "não resolvida"
PENDING_COLUMNS = (
    "id",
    "estado",
    "justificativa",
    "mitigacao",
    "risco_residual",
    "responsavel",
    "revisar_em",
)


class AuditError(Exception):
    """Expected input or collection error safe to report without raw contents."""


@dataclass(frozen=True)
class SourceState:
    status: str
    detail: str | None = None


@dataclass(frozen=True)
class ValidationResult:
    valid: bool
    errors: tuple[str, ...] = ()


@dataclass(frozen=True)
class AdvisoryRecord:
    id: str
    sources: tuple[str, ...]
    collected_at: str
    branch: str
    commit: str
    ecosystem: str
    manifest: str
    package: str
    dependency_root: str
    relationship: str
    current_version: str
    vulnerable_range: str
    severity: str
    fixed_version: str
    batch: str
    state: str
    decision: str
    evidence: tuple[str, ...]
    justification: str = ""
    mitigation: str = ""
    residual_risk: str = ""
    owner: str = ""
    review_at: str = ""


def _severity(value: Any) -> str:
    normalized = str(value or "unknown").strip().lower()
    aliases = {"medium": "moderate", "moderado": "moderate", "alto": "high", "crítico": "critical"}
    normalized = aliases.get(normalized, normalized)
    return normalized if normalized in SEVERITY_ORDER else "unknown"


def _advisory_id(*values: Any) -> str:
    for value in values:
        text = str(value or "")
        match = re.search(r"(?:GHSA-[0-9A-Za-z-]+|CVE-\d{4}-\d+)", text, re.IGNORECASE)
        if match:
            identifier = match.group(0)
            if identifier.upper().startswith("GHSA-"):
                return "GHSA-" + identifier[5:].lower()
            return identifier.upper()
    stable = "|".join(str(value or "unknown") for value in values)
    return "LOCAL-" + str(abs(sum((index + 1) * ord(char) for index, char in enumerate(stable))))


def _metadata(metadata: Mapping[str, str]) -> tuple[str, str, str]:
    return (
        metadata.get("collected_at", "unknown"),
        metadata.get("branch", "unknown"),
        metadata.get("commit", "unknown"),
    )


def _open_classification(fixed_version: str, severity: str) -> tuple[str, str]:
    if fixed_version == UNKNOWN:
        return "aberto", "investigar"
    if fixed_version == UNAVAILABLE:
        if severity in {"critical", "high"}:
            return "aberto", "investigar"
        return "pendente", "pendente"
    return "aberto", "remediar"


def _new_record(
    *,
    advisory_id: str,
    source: str,
    metadata: Mapping[str, str],
    ecosystem: str,
    manifest: str,
    package: str,
    dependency_root: str,
    relationship: str,
    current_version: Any,
    vulnerable_range: Any,
    severity: Any,
    fixed_version: Any,
    evidence: str,
) -> AdvisoryRecord:
    collected_at, branch, commit = _metadata(metadata)
    fix = str(fixed_version or UNAVAILABLE)
    normalized_severity = _severity(severity)
    state, decision = _open_classification(fix, normalized_severity)
    return AdvisoryRecord(
        id=advisory_id,
        sources=(SOURCE_NAMES[source],),
        collected_at=collected_at,
        branch=branch,
        commit=commit,
        ecosystem=ecosystem,
        manifest=manifest,
        package=package,
        dependency_root=dependency_root,
        relationship=relationship,
        current_version=str(current_version or "desconhecida"),
        vulnerable_range=str(vulnerable_range or "desconhecido"),
        severity=normalized_severity,
        fixed_version=fix,
        batch="não classificado",
        state=state,
        decision=decision,
        evidence=(evidence,),
    )


def parse_npm(
    data: Any,
    metadata: Mapping[str, str],
    advisory_index: Mapping[tuple[str, str, str], tuple[str, str]] | None = None,
) -> list[AdvisoryRecord]:
    if not isinstance(data, dict) or not isinstance(data.get("vulnerabilities"), dict):
        raise AuditError("npm input has an invalid schema")
    records: list[AdvisoryRecord] = []
    for package_name, vulnerability in sorted(data["vulnerabilities"].items()):
        if not isinstance(vulnerability, dict):
            raise AuditError("npm input has an invalid vulnerability")
        via = vulnerability.get("via", [])
        advisories = [item for item in via if isinstance(item, dict)]
        if not advisories and vulnerability.get("severity"):
            advisories = [vulnerability]
        fix_available = vulnerability.get("fixAvailable")
        relationship = "direct" if vulnerability.get("isDirect") else "transitive"
        dependency_root = str(
            vulnerability.get("dependencyRoot")
            or (package_name if relationship == "direct" else UNRESOLVED)
        )
        for advisory in advisories:
            advisory_package = str(advisory.get("dependency") or package_name)
            identifier = _advisory_id(advisory.get("url"), advisory.get("cves"), advisory.get("source"), advisory_package)
            catalog_entry = (advisory_index or {}).get(
                (identifier, "npm", advisory_package.lower())
            )
            if isinstance(fix_available, dict):
                fixed_version = fix_available.get("version") or UNKNOWN
            elif fix_available is False:
                fixed_version = UNAVAILABLE
            elif catalog_entry:
                fixed_version = catalog_entry[1]
            elif fix_available is True:
                fixed_version = FIX_AVAILABLE
            else:
                fixed_version = UNKNOWN
            vulnerable_range = advisory.get("range") or vulnerability.get("range")
            if not vulnerable_range and catalog_entry:
                vulnerable_range = catalog_entry[0]
            records.append(
                _new_record(
                    advisory_id=identifier,
                    source="npm",
                    metadata=metadata,
                    ecosystem="npm",
                    manifest="frontend/package-lock.json",
                    package=advisory_package,
                    dependency_root=dependency_root,
                    relationship=relationship,
                    current_version=vulnerability.get("version"),
                    vulnerable_range=vulnerable_range,
                    severity=advisory.get("severity") or vulnerability.get("severity"),
                    fixed_version=fixed_version,
                    evidence=str(advisory.get("url") or "npm audit --json"),
                )
            )
    return records


def _catalog_fixed_version(value: Any) -> str:
    if isinstance(value, dict):
        return str(value.get("identifier") or UNKNOWN)
    if isinstance(value, str):
        return value.strip() or UNKNOWN
    if value is None:
        return UNAVAILABLE
    return UNKNOWN


def _catalog_index(advisories: Any) -> dict[tuple[str, str, str], tuple[str, str]]:
    if advisories is None:
        return {}
    if isinstance(advisories, dict):
        advisories = [advisories]
    if not isinstance(advisories, list):
        raise AuditError("advisory catalog has an invalid schema")
    index: dict[tuple[str, str, str], tuple[str, str]] = {}
    for advisory in advisories:
        if not isinstance(advisory, dict):
            raise AuditError("advisory catalog has an invalid entry")
        advisory_id = _advisory_id(advisory.get("ghsa_id"), advisory.get("cve_id"))
        vulnerabilities = advisory.get("vulnerabilities", [])
        if not isinstance(vulnerabilities, list):
            raise AuditError("advisory catalog has invalid vulnerabilities")
        for vulnerability in vulnerabilities:
            package = vulnerability.get("package", {}) if isinstance(vulnerability, dict) else None
            if not isinstance(package, dict):
                raise AuditError("advisory catalog has an invalid package")
            ecosystem = str(package.get("ecosystem") or "unknown").lower()
            package_name = str(package.get("name") or "unknown").lower()
            fixed_version = _catalog_fixed_version(
                vulnerability.get("first_patched_version")
            )
            vulnerable_range = str(vulnerability.get("vulnerable_version_range") or "desconhecido")
            index[(advisory_id, ecosystem, package_name)] = (vulnerable_range, str(fixed_version))
    return index


def parse_nuget(
    data: Any,
    metadata: Mapping[str, str],
    advisory_index: Mapping[tuple[str, str, str], tuple[str, str]] | None = None,
) -> list[AdvisoryRecord]:
    if not isinstance(data, dict) or not isinstance(data.get("projects"), list):
        raise AuditError("NuGet input has an invalid schema")
    records: list[AdvisoryRecord] = []
    for project in data["projects"]:
        if not isinstance(project, dict):
            raise AuditError("NuGet input has an invalid project")
        path = project.get("path")
        frameworks = project.get("frameworks", [])
        if (
            not isinstance(path, str)
            or not path.strip()
            or not isinstance(frameworks, list)
        ):
            raise AuditError("NuGet input has an invalid project")
        manifest = path
        for framework in frameworks:
            if not isinstance(framework, dict):
                raise AuditError("NuGet input has an invalid framework")
            groups = (("topLevelPackages", "direct"), ("transitivePackages", "transitive"))
            for group_name, relationship in groups:
                packages = framework.get(group_name, [])
                if not isinstance(packages, list):
                    raise AuditError("NuGet input has an invalid package group")
                for package in packages:
                    vulnerabilities = package.get("vulnerabilities", []) if isinstance(package, dict) else None
                    if not isinstance(vulnerabilities, list):
                        raise AuditError("NuGet input has an invalid vulnerability list")
                    package_name = str(package.get("id") or "unknown")
                    root = str(package.get("dependencyRoot") or (package_name if relationship == "direct" else UNRESOLVED))
                    for vulnerability in vulnerabilities:
                        if not isinstance(vulnerability, dict):
                            raise AuditError("NuGet input has an invalid vulnerability")
                        url = vulnerability.get("advisoryurl") or vulnerability.get("advisoryUrl")
                        advisory_id = _advisory_id(url, package_name, vulnerability.get("severity"))
                        catalog_entry = (advisory_index or {}).get(
                            (advisory_id, "nuget", package_name.lower())
                        )
                        if "fixedVersion" in vulnerability:
                            fixed_version = vulnerability.get("fixedVersion") or UNAVAILABLE
                        elif catalog_entry:
                            fixed_version = catalog_entry[1]
                        else:
                            fixed_version = UNKNOWN
                        vulnerable_range = vulnerability.get("vulnerableRange")
                        if not vulnerable_range and catalog_entry:
                            vulnerable_range = catalog_entry[0]
                        records.append(
                            _new_record(
                                advisory_id=advisory_id,
                                source="nuget",
                                metadata=metadata,
                                ecosystem="nuget",
                                manifest=manifest,
                                package=package_name,
                                dependency_root=root,
                                relationship=relationship,
                                current_version=package.get("resolvedVersion"),
                                vulnerable_range=vulnerable_range,
                                severity=vulnerability.get("severity"),
                                fixed_version=fixed_version,
                                evidence=str(url or "dotnet list package --vulnerable"),
                            )
                        )
    return records


def parse_dependabot(data: Any, metadata: Mapping[str, str]) -> list[AdvisoryRecord]:
    if isinstance(data, list) and data and all(isinstance(page, list) for page in data):
        data = [alert for page in data for alert in page]
    if not isinstance(data, list):
        raise AuditError("Dependabot input has an invalid schema")
    records: list[AdvisoryRecord] = []
    for alert in data:
        if not isinstance(alert, dict):
            raise AuditError("Dependabot input has an invalid alert")
        dependency = alert.get("dependency") or {}
        advisory = alert.get("security_advisory") or {}
        vulnerability = alert.get("security_vulnerability") or {}
        package_data = vulnerability.get("package") or dependency.get("package") or {}
        if not all(isinstance(item, dict) for item in (dependency, advisory, vulnerability, package_data)):
            raise AuditError("Dependabot input has an invalid alert schema")
        package_name = str(package_data.get("name") or "unknown")
        ecosystem = str(package_data.get("ecosystem") or "unknown").lower()
        patched = vulnerability.get("first_patched_version")
        fixed_version = patched.get("identifier") if isinstance(patched, dict) else None
        relationship_value = str(dependency.get("relationship") or "indirect").lower()
        relationship = "direct" if relationship_value == "direct" else "transitive"
        root = str(dependency.get("dependency_root") or (package_name if relationship == "direct" else UNRESOLVED))
        identifier = _advisory_id(advisory.get("ghsa_id"), advisory.get("cve_id"), alert.get("html_url"), package_name)
        records.append(
            _new_record(
                advisory_id=identifier,
                source="dependabot",
                metadata=metadata,
                ecosystem=ecosystem,
                manifest=str(dependency.get("manifest_path") or "unknown"),
                package=package_name,
                dependency_root=root,
                relationship=relationship,
                current_version=dependency.get("version"),
                vulnerable_range=vulnerability.get("vulnerable_version_range"),
                severity=vulnerability.get("severity") or advisory.get("severity"),
                fixed_version=fixed_version,
                evidence=str(alert.get("html_url") or f"Dependabot alert #{alert.get('number', 'unknown')}"),
            )
        )
    return records


PARSERS = {"npm": parse_npm, "nuget": parse_nuget, "dependabot": parse_dependabot}


def _prefer(first: str, second: str, rejected: Iterable[str]) -> str:
    rejected_set = set(rejected)
    return first if first not in rejected_set else second


def _merge(first: AdvisoryRecord, second: AdvisoryRecord) -> AdvisoryRecord:
    severity = max((first.severity, second.severity), key=lambda item: SEVERITY_ORDER[item])
    relationship = "direct" if "direct" in (first.relationship, second.relationship) else "transitive"
    exact_fixes = [
        value
        for value in (first.fixed_version, second.fixed_version)
        if value not in {UNKNOWN, UNAVAILABLE, FIX_AVAILABLE}
    ]
    if exact_fixes:
        fixed_version = exact_fixes[0]
    elif FIX_AVAILABLE in (first.fixed_version, second.fixed_version):
        fixed_version = FIX_AVAILABLE
    elif UNAVAILABLE in (first.fixed_version, second.fixed_version):
        fixed_version = UNAVAILABLE
    else:
        fixed_version = UNKNOWN
    state, decision = _open_classification(fixed_version, severity)
    return replace(
        first,
        sources=tuple(sorted(set(first.sources + second.sources))),
        manifest=_prefer(first.manifest, second.manifest, {"unknown"}),
        dependency_root=_prefer(first.dependency_root, second.dependency_root, {UNRESOLVED, "unknown"}),
        relationship=relationship,
        current_version=_prefer(first.current_version, second.current_version, {"desconhecida", "unknown"}),
        vulnerable_range=_prefer(first.vulnerable_range, second.vulnerable_range, {"desconhecido", "unknown"}),
        severity=severity,
        fixed_version=fixed_version,
        state=state,
        decision=decision,
        evidence=tuple(sorted(set(first.evidence + second.evidence))),
    )


def normalize_sources(
    data_by_source: Mapping[str, Any],
    metadata: Mapping[str, str],
    advisory_catalog: Any = None,
) -> list[AdvisoryRecord]:
    merged: dict[tuple[str, str, str], AdvisoryRecord] = {}
    advisory_index = _catalog_index(advisory_catalog)
    for source in sorted(data_by_source):
        if source not in PARSERS:
            raise AuditError(f"unsupported source: {source}")
        parsed = (
            parse_nuget(data_by_source[source], metadata, advisory_index)
            if source == "nuget"
            else parse_npm(data_by_source[source], metadata, advisory_index)
            if source == "npm"
            else PARSERS[source](data_by_source[source], metadata)
        )
        for record in parsed:
            key = (record.id, record.ecosystem, record.package.lower())
            merged[key] = _merge(merged[key], record) if key in merged else record
    return sorted(
        merged.values(),
        key=lambda item: (-SEVERITY_ORDER[item.severity], item.ecosystem, item.dependency_root.lower(), item.package.lower(), item.id),
    )


def policy_exit_code(
    records: Sequence[AdvisoryRecord],
    source_states: Mapping[str, SourceState],
    pending_valid: bool,
) -> int:
    if (
        not source_states
        or any(state.status != "collected" for state in source_states.values())
        or any(record.fixed_version == UNKNOWN for record in records)
        or not pending_valid
    ):
        return 2
    if any(
        record.state == "aberto"
        and record.severity in {"critical", "high"}
        for record in records
    ):
        return 1
    return 0


def _markdown_cell(value: Any) -> str:
    return str(value).replace("|", "\\|").replace("\r", " ").replace("\n", " ")


def render_inventory(
    records: Sequence[AdvisoryRecord],
    metadata: Mapping[str, str],
    source_states: Mapping[str, SourceState],
) -> str:
    lines = [
        f"## Fotografia {metadata.get('collected_at', 'unknown')}",
        "",
        f"- Branch: `{_markdown_cell(metadata.get('branch', 'unknown'))}`",
        f"- Commit: `{_markdown_cell(metadata.get('commit', 'unknown'))}`",
        "- Fontes: " + ", ".join(f"`{name}={state.status}`" for name, state in sorted(source_states.items())),
        "",
        "| id | fonte | ecossistema | manifesto | pacote | dependencia_raiz | relacao | versao_atual | intervalo_vulneravel | severidade | versao_corrigida | lote | estado | decisao | evidencia |",
        "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for record in records:
        values = (
            record.id,
            ", ".join(record.sources),
            record.ecosystem,
            record.manifest,
            record.package,
            record.dependency_root,
            record.relationship,
            record.current_version,
            record.vulnerable_range,
            record.severity,
            record.fixed_version,
            record.batch,
            record.state,
            record.decision,
            "; ".join(record.evidence),
        )
        lines.append("| " + " | ".join(_markdown_cell(value) for value in values) + " |")
    if not records:
        lines.append("| — | — | — | — | — | — | — | — | — | — | — | — | — | sem achados | — |")
    return "\n".join(lines) + "\n"


def render_pending(records: Sequence[AdvisoryRecord], metadata: Mapping[str, str]) -> str:
    pending = [record for record in records if record.state in {"pendente", "excecao"}]
    lines = [
        f"## Fotografia {metadata.get('collected_at', 'unknown')}",
        "",
        "| id | estado | justificativa | mitigacao | risco_residual | responsavel | revisar_em |",
        "|---|---|---|---|---|---|---|",
    ]
    for record in pending:
        values = (
            record.id,
            record.state,
            record.justification,
            record.mitigation,
            record.residual_risk,
            record.owner,
            record.review_at,
        )
        lines.append("| " + " | ".join(_markdown_cell(value) for value in values) + " |")
    if not pending:
        lines.append("| — | nenhum | — | — | — | — | — |")
    return "\n".join(lines) + "\n"


def _table_rows(text: str) -> Iterable[tuple[list[str], list[str]]]:
    lines = text.splitlines()
    for index, line in enumerate(lines[:-1]):
        if not line.strip().startswith("|"):
            continue
        headers = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if tuple(headers) != PENDING_COLUMNS:
            continue
        if index + 1 >= len(lines) or "---" not in lines[index + 1]:
            continue
        row_index = index + 2
        while row_index < len(lines) and lines[row_index].strip().startswith("|"):
            cells = [cell.strip() for cell in lines[row_index].strip().strip("|").split("|")]
            yield headers, cells
            row_index += 1


def validate_pending_text(text: str) -> ValidationResult:
    errors: list[str] = []
    saw_table = False
    for headers, cells in _table_rows(text):
        saw_table = True
        if len(cells) != len(headers):
            errors.append("pending row has the wrong number of columns")
            continue
        item = dict(zip(headers, cells))
        if item["estado"] in {"nenhum", "remediado", "aberto"} or item["id"] == "—":
            continue
        if item["estado"] not in {"pendente", "excecao"}:
            errors.append(f"{item['id']}: invalid pending state")
            continue
        for field in PENDING_COLUMNS[2:]:
            if not item[field] or item[field] in {"—", "-"}:
                errors.append(f"{item['id']}: missing {field}")
        if item["revisar_em"] and item["revisar_em"] not in {"—", "-"}:
            try:
                date.fromisoformat(item["revisar_em"])
            except ValueError:
                errors.append(f"{item['id']}: invalid revisar_em")
    if text.strip() and not saw_table:
        errors.append("pending document has no recognized table")
    return ValidationResult(not errors, tuple(errors))


def append_snapshot(path: Path, title: str, snapshot: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_text(encoding="utf-8").strip():
        previous = path.read_text(encoding="utf-8").rstrip()
        content = previous + "\n\n" + snapshot
    else:
        content = f"# {title}\n\n{snapshot}"
    path.write_text(content, encoding="utf-8", newline="\n")


def read_json(path: Path, source: str) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise AuditError(f"{source} input could not be read") from exc


def _resolve_command(arguments: Sequence[str]) -> list[str]:
    command = list(arguments)
    if command:
        command[0] = shutil.which(command[0]) or command[0]
    return command


def run_json_command(
    arguments: Sequence[str],
    cwd: Path,
    source: str,
    accepted_codes: Iterable[int] = (0,),
) -> Any:
    command = _resolve_command(arguments)
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            shell=False,
            check=False,
            timeout=300,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise AuditError(f"{source} collection failed") from exc
    if result.returncode not in set(accepted_codes):
        raise AuditError(f"{source} collection failed")
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise AuditError(f"{source} returned invalid JSON") from exc


def _run_text(arguments: Sequence[str], cwd: Path, fallback: str) -> str:
    command = _resolve_command(arguments)
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            shell=False,
            check=False,
            timeout=30,
        )
    except (OSError, subprocess.SubprocessError):
        return fallback
    return result.stdout.strip() if result.returncode == 0 and result.stdout.strip() else fallback


def repository_metadata(repository: Path) -> dict[str, str]:
    return {
        "collected_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "branch": _run_text(["git", "branch", "--show-current"], repository, "unknown"),
        "commit": _run_text(["git", "rev-parse", "HEAD"], repository, "unknown"),
    }


def _repository_name(repository: Path) -> str:
    name = _run_text(["gh", "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"], repository, "")
    if not name:
        raise AuditError("repository identity could not be resolved")
    return name


def collect_source(source: str, repository: Path, input_path: Path | None) -> Any:
    if input_path is not None:
        return read_json(input_path, source)
    if source == "npm":
        return run_json_command(["npm", "audit", "--json"], repository / "frontend", source, (0, 1))
    if source == "nuget":
        return run_json_command(
            ["dotnet", "list", "backend/backend.sln", "package", "--vulnerable", "--include-transitive", "--format", "json"],
            repository,
            source,
        )
    if source == "dependabot":
        repo_name = _repository_name(repository)
        return run_json_command(
            ["gh", "api", "--paginate", "--slurp", f"repos/{repo_name}/dependabot/alerts?state=open&per_page=100"],
            repository,
            source,
        )
    raise AuditError(f"unsupported source: {source}")


def _dependabot_advisories(data: Any) -> list[dict[str, Any]]:
    if isinstance(data, list) and data and all(isinstance(page, list) for page in data):
        data = [alert for page in data for alert in page]
    if not isinstance(data, list):
        return []
    catalog: list[dict[str, Any]] = []
    for alert in data:
        if not isinstance(alert, dict):
            continue
        advisory = alert.get("security_advisory")
        vulnerability = alert.get("security_vulnerability")
        if not isinstance(advisory, dict) or not isinstance(vulnerability, dict):
            continue
        catalog.append(
            {
                "ghsa_id": advisory.get("ghsa_id"),
                "cve_id": advisory.get("cve_id"),
                "vulnerabilities": [vulnerability],
            }
        )
    return catalog


def _nuget_advisories_without_fix(data: Any) -> set[tuple[str, str]]:
    missing: set[tuple[str, str]] = set()
    if not isinstance(data, dict):
        return missing
    for project in data.get("projects", []):
        if not isinstance(project, dict):
            continue
        for framework in project.get("frameworks", []):
            if not isinstance(framework, dict):
                continue
            for group_name in ("topLevelPackages", "transitivePackages"):
                for package in framework.get(group_name, []):
                    if not isinstance(package, dict):
                        continue
                    package_name = str(package.get("id") or "unknown")
                    for vulnerability in package.get("vulnerabilities", []):
                        if not isinstance(vulnerability, dict) or "fixedVersion" in vulnerability:
                            continue
                        url = vulnerability.get("advisoryurl") or vulnerability.get("advisoryUrl")
                        missing.add((_advisory_id(url, package_name), package_name))
    return missing


def _npm_advisories_without_fix(data: Any) -> set[tuple[str, str]]:
    missing: set[tuple[str, str]] = set()
    if not isinstance(data, dict):
        return missing
    vulnerabilities = data.get("vulnerabilities", {})
    if not isinstance(vulnerabilities, dict):
        return missing
    for package_name, vulnerability in vulnerabilities.items():
        if not isinstance(vulnerability, dict):
            continue
        fix_available = vulnerability.get("fixAvailable")
        if isinstance(fix_available, dict) and fix_available.get("version"):
            continue
        if fix_available is False or fix_available is True:
            continue
        for advisory in vulnerability.get("via", []):
            if not isinstance(advisory, dict):
                continue
            advisory_package = str(advisory.get("dependency") or package_name)
            advisory_id = _advisory_id(
                advisory.get("url"), advisory.get("cves"), advisory.get("source"), advisory_package
            )
            missing.add((advisory_id, advisory_package))
    return missing


def _catalog_has_package(
    catalog: Any, advisory_id: str, ecosystem: str, package_name: str
) -> bool:
    return (advisory_id, ecosystem, package_name.lower()) in _catalog_index(catalog)


def collect_advisory_catalog(
    npm_data: Any,
    nuget_data: Any,
    dependabot_data: Any,
    repository: Path,
    input_path: Path | None,
) -> tuple[list[dict[str, Any]], set[str]]:
    catalog = _dependabot_advisories(dependabot_data)
    if input_path is not None:
        supplied = read_json(input_path, "advisory catalog")
        if isinstance(supplied, dict):
            supplied = [supplied]
        if not isinstance(supplied, list):
            raise AuditError("advisory catalog has an invalid schema")
        catalog.extend(supplied)
    required = {
        "npm": _npm_advisories_without_fix(npm_data),
        "nuget": _nuget_advisories_without_fix(nuget_data),
    }
    missing = {
        (advisory_id, ecosystem, package_name)
        for ecosystem, pairs in required.items()
        for advisory_id, package_name in pairs
        if not _catalog_has_package(catalog, advisory_id, ecosystem, package_name)
    }
    if input_path is None:
        for advisory_id in sorted({item[0] for item in missing}):
            try:
                advisory = run_json_command(
                    ["gh", "api", f"advisories/{advisory_id}"],
                    repository,
                    "advisory catalog",
                )
            except AuditError:
                continue
            if isinstance(advisory, dict):
                catalog.append(advisory)
    incomplete_sources = {
        ecosystem
        for ecosystem, pairs in required.items()
        if any(
            not _catalog_has_package(catalog, advisory_id, ecosystem, package_name)
            for advisory_id, package_name in pairs
        )
    }
    return catalog, incomplete_sources


def collect(args: argparse.Namespace) -> int:
    repository = args.repository.resolve()
    requested = [source.strip().lower() for source in args.sources.split(",") if source.strip()]
    if not requested or len(requested) != len(set(requested)) or any(source not in PARSERS for source in requested):
        print("error: --sources must contain unique supported sources", file=sys.stderr)
        return 2
    data: dict[str, Any] = {}
    states: dict[str, SourceState] = {}
    input_paths = {"npm": args.npm_json, "nuget": args.nuget_json, "dependabot": args.dependabot_json}
    for source in requested:
        try:
            data[source] = collect_source(source, repository, input_paths[source])
            states[source] = SourceState("collected")
        except AuditError:
            states[source] = SourceState("not-collected", "collection failed")
            print(f"error: source '{source}' could not be collected", file=sys.stderr)
    advisory_catalog: list[dict[str, Any]] = []
    if "npm" in data or "nuget" in data:
        try:
            advisory_catalog, incomplete_sources = collect_advisory_catalog(
                data.get("npm", {}),
                data.get("nuget", {}),
                data.get("dependabot", []),
                repository,
                args.advisories_json,
            )
        except AuditError:
            incomplete_sources = {source for source in ("npm", "nuget") if source in data}
            print("error: advisory metadata could not be collected", file=sys.stderr)
        for source in incomplete_sources:
            states[source] = SourceState("collected-incomplete", "advisory metadata missing")
    metadata = repository_metadata(repository)
    try:
        records = normalize_sources(data, metadata, advisory_catalog=advisory_catalog)
    except AuditError as exc:
        print(f"error: normalized input is invalid ({exc})", file=sys.stderr)
        return 2
    inventory_snapshot = render_inventory(records, metadata, states)
    pending_snapshot = render_pending(records, metadata)
    try:
        append_snapshot(args.inventory, "Inventário de vulnerabilidades", inventory_snapshot)
        append_snapshot(args.pending, "Pendências de vulnerabilidades", pending_snapshot)
    except OSError:
        print("error: output files could not be written", file=sys.stderr)
        return 2
    pending_validation = validate_pending_text(pending_snapshot)
    code = policy_exit_code(records, states, pending_validation.valid)
    print(f"normalized={len(records)} policy_exit={code}")
    return code


def validate_pending(args: argparse.Namespace) -> int:
    try:
        text = args.path.read_text(encoding="utf-8")
    except (OSError, UnicodeError):
        print("error: pending document could not be read", file=sys.stderr)
        return 2
    result = validate_pending_text(text)
    if not result.valid:
        for error in result.errors:
            print(f"error: {error}", file=sys.stderr)
        return 2
    print("pending document is valid")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    collect_parser = subparsers.add_parser("collect", help="collect or read JSON reports and append snapshots")
    collect_parser.add_argument("--sources", required=True, help="comma-separated: npm,nuget[,dependabot]")
    collect_parser.add_argument("--repository", required=True, type=Path, help="repository root")
    collect_parser.add_argument("--inventory", required=True, type=Path, help="inventory Markdown path")
    collect_parser.add_argument("--pending", required=True, type=Path, help="pending-risk Markdown path")
    collect_parser.add_argument("--npm-json", type=Path, help="read npm audit JSON instead of running npm")
    collect_parser.add_argument("--nuget-json", type=Path, help="read NuGet audit JSON instead of running dotnet")
    collect_parser.add_argument("--dependabot-json", type=Path, help="read Dependabot JSON instead of calling GitHub")
    collect_parser.add_argument(
        "--advisories-json",
        type=Path,
        help="read GitHub Advisory Database JSON used to enrich NuGet corrections",
    )
    collect_parser.set_defaults(handler=collect)
    pending_parser = subparsers.add_parser("validate-pending", help="validate pending/exception risk fields")
    pending_parser.add_argument("path", type=Path, help="pending-risk Markdown path")
    pending_parser.set_defaults(handler=validate_pending)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return int(args.handler(args))


if __name__ == "__main__":
    raise SystemExit(main())
