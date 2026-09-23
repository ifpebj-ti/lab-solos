#!/usr/bin/env python3
"""Validate the design coverage inventory during and after migration.

The default mode checks that the inventory is structurally complete and that
its progress claims are honest.  ``--final`` additionally requires every
surface to have an accepted result with existing evidence and a linked
decision.  The validator intentionally does not edit ``cobertura.json``.
"""

from __future__ import annotations

import argparse
import json
import posixpath
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping


DEFAULT_ALLOWED_STATUSES = (
    "pendente",
    "em execução",
    "aguardando aceite",
    "redesenhada e validada",
    "compartilhada e validada",
    "exclusão aprovada",
)
ROUTE_TYPES = {"rota", "alias"}
ACCEPTED_STATUSES = {
    "redesenhada e validada",
    "compartilhada e validada",
    "exclusão aprovada",
}
CONCLUDED_STATUSES = {
    "redesenhada e validada",
    "compartilhada e validada",
}
TASK_HEADING = re.compile(r"^##\s+(T\d{3})\b")
TASK_WAVE = re.compile(r"^-\s*Onda:\s*(\d+)\s*$", re.MULTILINE)
ROUTE_PATH = re.compile(r"\bpath\s*=\s*(['\"])(.*?)\1")
TASK_ID = re.compile(r"^T\d{3}$")
SURFACE_LIST_FIELDS = (
    "perfil",
    "estados_aplicaveis",
    "larguras",
    "temas",
    "requisitos",
    "evidencias",
    "nao_aplicavel",
)


@dataclass(frozen=True)
class Issue:
    code: str
    message: str


@dataclass(frozen=True)
class ValidationResult:
    issues: tuple[Issue, ...]
    surface_count: int
    route_count: int

    @property
    def ok(self) -> bool:
        return not self.issues


def _issue(issues: list[Issue], code: str, message: str) -> None:
    issues.append(Issue(code, message))


def _read_json(path: Path, issues: list[Issue]) -> dict[str, Any] | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        _issue(issues, "INVENTORY_MISSING", f"inventário ausente: {path}")
        return None
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        _issue(issues, "INVENTORY_INVALID", f"não foi possível ler {path}: {exc}")
        return None
    if not isinstance(value, dict):
        _issue(issues, "INVENTORY_INVALID", "cobertura.json deve conter um objeto JSON")
        return None
    return value


def _parse_tasks(path: Path, issues: list[Issue]) -> dict[str, int]:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        _issue(issues, "TASKS_MISSING", f"tasks.md ausente: {path}")
        return {}
    except (OSError, UnicodeError) as exc:
        _issue(issues, "TASKS_INVALID", f"não foi possível ler {path}: {exc}")
        return {}

    headings: list[tuple[int, str]] = []
    for index, line in enumerate(lines):
        match = TASK_HEADING.match(line)
        if match:
            headings.append((index, match.group(1)))

    tasks: dict[str, int] = {}
    for position, (start, task_id) in enumerate(headings):
        end = headings[position + 1][0] if position + 1 < len(headings) else len(lines)
        block = "\n".join(lines[start:end])
        wave_match = TASK_WAVE.search(block)
        if task_id in tasks:
            _issue(issues, "DUPLICATE_TASK", f"tarefa duplicada em tasks.md: {task_id}")
        if wave_match is None:
            _issue(issues, "TASK_WAVE_MISSING", f"tarefa sem onda em tasks.md: {task_id}")
            continue
        tasks[task_id] = int(wave_match.group(1))

    if not tasks:
        _issue(issues, "TASKS_INVALID", "tasks.md não contém tarefas com ID e onda")
    return tasks


def _normalise_route(value: str) -> str:
    if value == "*":
        return value
    value = value.strip()
    if not value.startswith("/"):
        value = "/" + value
    normalised = posixpath.normpath(value)
    return "/" if normalised == "." else normalised


def _extract_routes(path: Path, issues: list[Issue]) -> set[str]:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        _issue(issues, "ROUTES_MISSING", f"arquivo de rotas ausente: {path}")
        return set()
    except (OSError, UnicodeError) as exc:
        _issue(issues, "ROUTES_INVALID", f"não foi possível ler {path}: {exc}")
        return set()

    routes: set[str] = set()
    current_parent: str | None = None
    for line in lines:
        for match in ROUTE_PATH.finditer(line):
            raw = match.group(2).strip()
            if not raw or raw.startswith("{"):
                continue
            if raw == "*" or raw.startswith("/"):
                route = _normalise_route(raw)
                current_parent = route if raw != "*" else None
            elif current_parent:
                route = _normalise_route(
                    posixpath.join(current_parent.rstrip("/"), raw)
                )
            else:
                route = _normalise_route(raw)
            routes.add(route)
    return routes


def _relative_repo_path(
    raw_value: Any,
    repo_root: Path,
    issues: list[Issue],
    code: str,
    label: str,
) -> Path | None:
    if not isinstance(raw_value, str) or not raw_value.strip():
        _issue(issues, f"{code}_INVALID", f"{label} deve ser um caminho relativo")
        return None

    raw_path = Path(raw_value)
    candidate = (raw_path if raw_path.is_absolute() else repo_root / raw_path).resolve()
    try:
        candidate.relative_to(repo_root)
    except ValueError:
        _issue(issues, f"{code}_OUTSIDE", f"{label} está fora do repositório: {raw_value}")
        return None
    return candidate


def _decision_id(value: Any) -> str | None:
    if isinstance(value, str) and value.strip():
        return value
    if isinstance(value, Mapping) and isinstance(value.get("id"), str):
        return value["id"]
    return None


def _evidence_path(value: Any) -> str | None:
    if isinstance(value, str):
        return value
    if isinstance(value, Mapping):
        for key in ("arquivo", "path", "caminho", "file"):
            candidate = value.get(key)
            if isinstance(candidate, str):
                return candidate
    return None


def _validate_evidences(
    values: Any,
    surface_label: str,
    repo_root: Path,
    issues: list[Issue],
) -> None:
    if not isinstance(values, list):
        return
    for evidence in values:
        raw_path = _evidence_path(evidence)
        if raw_path is None:
            _issue(
                issues,
                "EVIDENCE_INVALID",
                f"{surface_label} possui evidência sem caminho",
            )
            continue
        resolved = _relative_repo_path(
            raw_path,
            repo_root,
            issues,
            "EVIDENCE",
            f"evidência de {surface_label}",
        )
        if resolved is not None and not resolved.is_file():
            _issue(issues, "EVIDENCE_MISSING", f"evidência não existe: {raw_path}")


def _validate_decisions(
    inventory: Mapping[str, Any],
    repo_root: Path,
    issues: list[Issue],
) -> dict[str, Mapping[str, Any]]:
    raw_decisions = inventory.get("decisoes_confirmadas", [])
    if not isinstance(raw_decisions, list):
        _issue(issues, "DECISIONS_INVALID", "decisoes_confirmadas deve ser uma lista")
        return {}

    decisions: dict[str, Mapping[str, Any]] = {}
    for index, decision in enumerate(raw_decisions):
        if not isinstance(decision, Mapping):
            _issue(issues, "DECISION_INVALID", f"decisão #{index + 1} deve ser um objeto")
            continue
        decision_id = decision.get("id")
        if not isinstance(decision_id, str) or not decision_id.strip():
            _issue(issues, "DECISION_INVALID", f"decisão #{index + 1} sem id")
            continue
        if decision_id in decisions:
            _issue(issues, "DUPLICATE_DECISION", f"decisão duplicada: {decision_id}")
        decisions[decision_id] = decision

        reference = decision.get("referencia")
        if reference is not None:
            resolved = _relative_repo_path(
                reference,
                repo_root,
                issues,
                "DECISION",
                f"referência da decisão {decision_id}",
            )
            if resolved is not None and not resolved.is_file():
                _issue(
                    issues,
                    "DECISION_MISSING",
                    f"referência da decisão não existe: {reference}",
                )
    return decisions


def _validate_surface_shape(
    surface: Any,
    index: int,
    allowed_statuses: set[str],
    tasks: Mapping[str, int],
    decisions: Mapping[str, Mapping[str, Any]],
    repo_root: Path,
    issues: list[Issue],
) -> tuple[str | None, str | None]:
    label = f"superfície #{index + 1}"
    if not isinstance(surface, Mapping):
        _issue(issues, "SURFACE_INVALID", f"{label} deve ser um objeto")
        return None, None

    surface_id = surface.get("id")
    if not isinstance(surface_id, str) or not re.fullmatch(r"SUP-\d{3}", surface_id):
        _issue(issues, "ID_INVALID", f"{label} tem ID inválido: {surface_id!r}")
    surface_type = surface.get("tipo")
    if not isinstance(surface_type, str) or not surface_type.strip():
        _issue(issues, "SURFACE_TYPE_INVALID", f"{label} sem tipo")

    for field in SURFACE_LIST_FIELDS:
        if not isinstance(surface.get(field), list):
            _issue(issues, "SURFACE_FIELD_INVALID", f"{label}.{field} deve ser uma lista")

    if surface_type in ROUTE_TYPES:
        route = surface.get("rota")
        if not isinstance(route, str) or not route.strip():
            _issue(issues, "ROUTE_INVALID", f"{label} sem rota")
    elif surface.get("rota") not in (None, ""):
        _issue(issues, "ROUTE_INVALID", f"{label} não-rotatória possui rota")

    task_id = surface.get("tarefa")
    if not isinstance(task_id, str) or not TASK_ID.fullmatch(task_id):
        _issue(issues, "TASK_INVALID", f"{label} tem tarefa inválida: {task_id!r}")
    elif task_id not in tasks:
        _issue(issues, "UNKNOWN_TASK", f"{surface_id or label} referencia tarefa inexistente: {task_id}")

    wave = surface.get("onda")
    if not isinstance(wave, int) or isinstance(wave, bool) or wave < 1:
        _issue(issues, "WAVE_INVALID", f"{surface_id or label} tem onda inválida: {wave!r}")
    elif isinstance(task_id, str) and task_id in tasks and wave != tasks[task_id]:
        _issue(
            issues,
            "WAVE_MISMATCH",
            f"{surface_id or label} declara onda {wave}, mas {task_id} está na onda {tasks[task_id]}",
        )

    milestone = surface.get("marco_aceite")
    if not isinstance(milestone, str) or not TASK_ID.fullmatch(milestone):
        _issue(issues, "MILESTONE_INVALID", f"{surface_id or label} tem marco inválido: {milestone!r}")
    elif milestone not in tasks:
        _issue(
            issues,
            "UNKNOWN_MILESTONE",
            f"{surface_id or label} referencia marco inexistente: {milestone}",
        )

    status = surface.get("status")
    if status not in allowed_statuses:
        _issue(issues, "STATUS_INVALID", f"{surface_id or label} tem status inválido: {status!r}")

    decision_value = surface.get("decisao")
    decision_id = _decision_id(decision_value) if decision_value is not None else None
    if decision_value is not None and decision_id is None:
        _issue(issues, "DECISION_INVALID", f"{surface_id or label} tem decisão inválida")
    elif decision_id is not None and decision_id not in decisions:
        _issue(
            issues,
            "UNKNOWN_DECISION",
            f"{surface_id or label} referencia decisão inexistente: {decision_id}",
        )

    evidence_values = surface.get("evidencias", [])
    _validate_evidences(evidence_values, surface_id or label, repo_root, issues)

    not_applicable = surface.get("nao_aplicavel", [])
    if status == "exclusão aprovada":
        if not isinstance(not_applicable, list) or not not_applicable:
            _issue(
                issues,
                "EXCLUSION_REASON",
                f"{surface_id or label} não possui justificativa de não aplicabilidade",
            )
        if decision_id is None or decision_id not in decisions:
            _issue(
                issues,
                "EXCLUSION_DECISION",
                f"{surface_id or label} não possui aprovação decisória explícita",
            )

    if status in CONCLUDED_STATUSES:
        if not evidence_values or decision_id is None or decision_id not in decisions:
            _issue(
                issues,
                "FALSE_CONCLUSION",
                f"{surface_id or label} declara conclusão sem evidência e decisão vinculadas",
            )

    return (
        _normalise_route(surface["rota"])
        if surface_type in ROUTE_TYPES and isinstance(surface.get("rota"), str)
        else None,
        surface_id if isinstance(surface_id, str) else None,
    )


def validate_spec(
    spec_dir: Path,
    *,
    repo_root: Path | None = None,
    routes_file: Path | None = None,
    final: bool = False,
) -> ValidationResult:
    """Validate one inventory without changing any input file."""

    spec_dir = spec_dir.resolve()
    repo_root = (repo_root or Path(__file__).resolve().parents[1]).resolve()
    inventory_path = spec_dir / "cobertura.json"
    tasks_path = spec_dir / "tasks.md"
    routes_file = routes_file or repo_root / "frontend" / "src" / "routes.tsx"
    routes_file = routes_file.resolve()
    issues: list[Issue] = []

    inventory = _read_json(inventory_path, issues)
    tasks = _parse_tasks(tasks_path, issues)
    actual_routes = _extract_routes(routes_file, issues)
    if inventory is None:
        return ValidationResult(tuple(issues), 0, len(actual_routes))

    required_root = ("versao", "superficies", "decisoes_confirmadas", "regras")
    for field in required_root:
        if field not in inventory:
            _issue(issues, "ROOT_FIELD_MISSING", f"campo obrigatório ausente: {field}")

    raw_statuses = inventory.get("regras", {}).get("status_permitidos") if isinstance(inventory.get("regras"), Mapping) else None
    allowed_statuses = set(raw_statuses) if isinstance(raw_statuses, list) and all(isinstance(item, str) for item in raw_statuses) else set(DEFAULT_ALLOWED_STATUSES)

    raw_surfaces = inventory.get("superficies")
    if not isinstance(raw_surfaces, list):
        _issue(issues, "SURFACES_INVALID", "superficies deve ser uma lista")
        return ValidationResult(tuple(issues), 0, len(actual_routes))
    if not raw_surfaces:
        _issue(issues, "SURFACES_EMPTY", "inventário não contém superfícies")

    decisions = _validate_decisions(inventory, repo_root, issues)
    inventory_routes: set[str] = set()
    seen_ids: set[str] = set()
    surface_statuses: list[tuple[str | None, Any]] = []
    for index, surface in enumerate(raw_surfaces):
        route, surface_id = _validate_surface_shape(
            surface,
            index,
            allowed_statuses,
            tasks,
            decisions,
            repo_root,
            issues,
        )
        if surface_id is not None:
            if surface_id in seen_ids:
                _issue(issues, "DUPLICATE_ID", f"ID de superfície duplicado: {surface_id}")
            seen_ids.add(surface_id)
        if route is not None:
            if route in inventory_routes:
                _issue(issues, "DUPLICATE_ROUTE", f"rota duplicada no inventário: {route}")
            inventory_routes.add(route)
        if isinstance(surface, Mapping):
            surface_statuses.append((surface_id, surface.get("status")))

    for route in sorted(actual_routes - inventory_routes):
        _issue(issues, "ROUTE_UNCOVERED", f"rota atual sem superfície inventariada: {route}")
    for route in sorted(inventory_routes - actual_routes):
        _issue(issues, "ROUTE_NOT_FOUND", f"rota inventariada não encontrada nas rotas atuais: {route}")

    if final:
        for surface_id, status in surface_statuses:
            if status not in ACCEPTED_STATUSES:
                _issue(
                    issues,
                    "FINAL_INCOMPLETE",
                    f"--final exige aceite para {surface_id or 'superfície sem ID'}; status atual: {status!r}",
                )

    return ValidationResult(tuple(issues), len(raw_surfaces), len(actual_routes))


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Valida a cobertura progressiva do inventário de design."
    )
    parser.add_argument(
        "--spec",
        required=True,
        type=Path,
        help="pasta da especificação que contém cobertura.json e tasks.md",
    )
    parser.add_argument(
        "--final",
        action="store_true",
        help="exige aceite integral de todas as superfícies",
    )
    parser.add_argument(
        "--repo-root",
        type=Path,
        help="raiz do repositório (útil para fixtures isoladas)",
    )
    parser.add_argument(
        "--routes",
        type=Path,
        help="arquivo de rotas; por padrão frontend/src/routes.tsx",
    )
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    repo_root = args.repo_root.resolve() if args.repo_root else Path(__file__).resolve().parents[1]
    routes_file = args.routes
    if routes_file is not None and not routes_file.is_absolute():
        routes_file = repo_root / routes_file
    result = validate_spec(
        args.spec,
        repo_root=repo_root,
        routes_file=routes_file,
        final=args.final,
    )
    if result.ok:
        mode = "final" if args.final else "progressivo"
        print(
            f"OK ({mode}): {result.surface_count} superfícies e "
            f"{result.route_count} rotas verificadas."
        )
        return 0

    for issue in result.issues:
        print(f"ERROR {issue.code}: {issue.message}")
    print(f"FAIL: {len(result.issues)} problema(s) encontrado(s).")
    return 1


if __name__ == "__main__":
    sys.exit(main())
