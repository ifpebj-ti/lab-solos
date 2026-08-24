#!/usr/bin/env python3
"""Plan or apply the idempotent consolidation of the LabOn GitHub Projects.

The default mode is read-only. Pass ``--apply`` only after reviewing the plan.
This tool never deletes or archives projects, fields, or items.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import runpy
import subprocess
import sys
import time
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Callable, Iterable


SOURCE_P4 = ("nathannmvr", 4)
SOURCE_P17 = ("ifpebj-ti", 17)
TARGET_P41 = ("ifpebj-ti", 41)

STATUS_NAMES = (
    "Backlog",
    "Todo",
    "In Progress",
    "In Test",
    "Stabilize",
    "Blocked",
    "Done",
)

STATUS_SPECS = {
    "Backlog": {"color": "GRAY", "description": "Not yet scheduled"},
    "Todo": {"color": "GREEN", "description": "This item hasn't been started"},
    "In Progress": {"color": "YELLOW", "description": "This is actively being worked on"},
    "In Test": {"color": "BLUE", "description": "This is actively being tested"},
    "Stabilize": {"color": "RED", "description": "Ready for stabilization"},
    "Blocked": {"color": "RED", "description": "Progress is blocked"},
    "Done": {"color": "PURPLE", "description": "This has been completed"},
}

P17_STATUS_MAP = {
    "backlog": "Backlog",
    "to do": "Todo",
    "todo": "Todo",
    "in progress": "In Progress",
    "impeditive": "Blocked",
    "blocked": "Blocked",
    "done": "Done",
}

PRIORITY_MAP = {
    "high": ("High", "P1 Alta"),
    "medium": ("Medium", "P2 Média"),
    "low": ("Low", "P3 Baixa"),
}

CANONICAL_FIELDS = {
    "Tipo": {
        "dataType": "SINGLE_SELECT",
        "options": ("Feature", "Bug", "Segurança", "Qualidade", "DevOps", "Documentação"),
    },
    "Área": {
        "dataType": "SINGLE_SELECT",
        "options": ("Frontend", "Backend", "CI/CD", "Segurança", "Produto", "Documentação"),
    },
    "Prioridade": {
        "dataType": "SINGLE_SELECT",
        "options": ("P0 Crítica", "P1 Alta", "P2 Média", "P3 Baixa"),
    },
    "Severidade": {
        "dataType": "SINGLE_SELECT",
        "options": ("Crítica", "Alta", "Média", "Baixa", "N/A"),
    },
    "Esforço": {"dataType": "NUMBER"},
    "PRD": {"dataType": "TEXT"},
}

CLASSIFIABLE_FIELDS = ("Tipo", "Área", "Prioridade", "Severidade", "PRD")
ITEM_FIELD_BATCH_SIZE = 20
ITEM_LIST_CONSISTENCY_DELAYS = (0.25, 0.5, 1.0)


FIELDS_QUERY = """
query($projectId: ID!, $after: String) {
  node(id: $projectId) {
    ... on ProjectV2 {
      fields(first: 100, after: $after) {
        totalCount
        pageInfo { hasNextPage endCursor }
        nodes {
          __typename
          ... on ProjectV2Field { id name dataType }
          ... on ProjectV2SingleSelectField {
            id name dataType
            options { id name color description }
          }
          ... on ProjectV2MultiSelectField {
            id name dataType
            multiSelectOptions { id name color description }
          }
          ... on ProjectV2IterationField { id name dataType }
        }
      }
    }
  }
}
"""

UPDATE_SELECT_FIELD_MUTATION = """
mutation($fieldId: ID!, $options: [ProjectV2SingleSelectFieldOptionInput!]!) {
  updateProjectV2Field(
    input: {fieldId: $fieldId, singleSelectOptions: $options}
  ) {
    projectV2Field {
      ... on ProjectV2SingleSelectField {
        id name options { id name color description }
      }
    }
  }
}
"""

DRAFT_DETAILS_QUERY = """
query($projectId: ID!, $after: String) {
  node(id: $projectId) {
    ... on ProjectV2 {
      items(first: 100, after: $after) {
        totalCount
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          content {
            ... on DraftIssue {
              id title body
              assignees(first: 100) { nodes { id login } }
            }
          }
        }
      }
    }
  }
}
"""

RESOLVE_USER_QUERY = """
query($login: String!) {
  user(login: $login) { id login }
}
"""

UPDATE_DRAFT_ASSIGNEES_MUTATION = """
mutation($draftIssueId: ID!, $assigneeIds: [ID!]!) {
  updateProjectV2DraftIssue(
    input: {draftIssueId: $draftIssueId, assigneeIds: $assigneeIds}
  ) {
    draftIssue {
      id
      assignees(first: 100) { nodes { id login } }
    }
  }
}
"""


class ContractError(RuntimeError):
    """Raised before mutations when a discovered project violates the contract."""


class GhClient:
    """Small UTF-8-safe wrapper around the authenticated ``gh`` executable."""

    def run(self, *args: str, input_text: str | None = None) -> str:
        result = subprocess.run(
            ["gh", *args],
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            input=input_text,
        )
        if result.returncode != 0:
            message = result.stderr.strip() or result.stdout.strip()
            raise RuntimeError(f"gh {' '.join(args)}: {message}")
        return result.stdout

    def json(self, *args: str, input_text: str | None = None) -> Any:
        output = self.run(*args, input_text=input_text).strip()
        return json.loads(output) if output else None

    def graphql(self, query: str, variables: dict[str, Any]) -> dict[str, Any]:
        payload = json.dumps(
            {"query": query, "variables": variables},
            ensure_ascii=False,
            separators=(",", ":"),
        )
        response = self.json("api", "graphql", "--input", "-", input_text=payload)
        if response.get("errors"):
            raise RuntimeError(f"GraphQL: {json.dumps(response['errors'], ensure_ascii=False)}")
        return response


def normalized_words(value: Any) -> str:
    text = repair_mojibake(str(value or ""))
    decomposed = unicodedata.normalize("NFKD", text.casefold())
    without_marks = "".join(char for char in decomposed if not unicodedata.combining(char))
    return " ".join(re.findall(r"[a-z0-9]+", without_marks))


def repair_mojibake(value: str) -> str:
    """Repair the common UTF-8-as-Latin-1 form without damaging valid text."""

    if not any(marker in value for marker in ("Ã", "Â", "â")):
        return value
    try:
        candidate = value.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return value
    old_markers = sum(value.count(marker) for marker in ("Ã", "Â", "â"))
    new_markers = sum(candidate.count(marker) for marker in ("Ã", "Â", "â"))
    return candidate if new_markers < old_markers else value


def is_blank(value: Any) -> bool:
    return value is None or value == "" or value == [] or value == {}


def value_name(value: Any) -> Any:
    if isinstance(value, dict):
        for key in ("name", "title", "value", "text", "number"):
            if key in value:
                return value[key]
    return value


def item_field_value(item: dict[str, Any], field_name: str) -> Any:
    wanted = normalized_words(field_name).replace(" ", "")
    for key, value in item.items():
        if key in {"id", "content"}:
            continue
        if normalized_words(key).replace(" ", "") == wanted:
            return value_name(value)
    return None


def content_type(item: dict[str, Any]) -> str:
    return str(item.get("content", {}).get("type") or item.get("type") or "")


def canonical_url(value: Any) -> str:
    return str(value or "").strip().rstrip("/").casefold()


def draft_signature(item: dict[str, Any]) -> tuple[str, str]:
    content = item.get("content", {})
    return str(content.get("title") or ""), str(content.get("body") or "")


def draft_locator(signature: tuple[str, str], occurrence: int) -> str:
    digest = hashlib.sha256((signature[0] + "\0" + signature[1]).encode("utf-8")).hexdigest()[:16]
    return f"draft:{digest}:{occurrence}"


def locator_for_url(url: str) -> str:
    return f"url:{canonical_url(url)}"


def canonical_status(value: Any, origin: str) -> str | None:
    if is_blank(value):
        return None
    words = normalized_words(value)
    canonical = {normalized_words(name): name for name in STATUS_NAMES}
    if origin == "p17":
        result = P17_STATUS_MAP.get(words)
    else:
        result = canonical.get(words) or P17_STATUS_MAP.get(words)
        if result is None and origin == "target":
            matches = [name for key, name in canonical.items() if words.endswith(key)]
            result = matches[0] if len(matches) == 1 else None
    if result is None:
        raise ContractError(f"Status desconhecido em {origin}: {value!r}")
    return result


def canonical_priority(value: Any) -> tuple[str, str] | None:
    if is_blank(value):
        return None
    words = normalized_words(value)
    for alias, result in PRIORITY_MAP.items():
        if words == alias or words.endswith(" " + alias):
            return result
    raise ContractError(f"Priority desconhecida no Project 17: {value!r}")


def sprint_number(item: dict[str, Any]) -> int | None:
    milestone = item_field_value(item, "Milestone")
    if is_blank(milestone):
        milestone = value_name(item.get("content", {}).get("milestone"))
    if is_blank(milestone):
        return None
    match = re.fullmatch(r"\s*Sprint\s+(\d+)\s*", str(milestone), flags=re.IGNORECASE)
    if not match:
        if normalized_words(milestone).startswith("sprint"):
            raise ContractError(f"Milestone de Sprint inválido: {milestone!r}")
        return None
    return int(match.group(1))


def item_labels(item: dict[str, Any]) -> list[Any]:
    labels = item_field_value(item, "Labels")
    if is_blank(labels):
        labels = item.get("content", {}).get("labels", [])
    if isinstance(labels, list):
        return labels
    return [labels] if not is_blank(labels) else []


def draft_assignee_logins(item: dict[str, Any]) -> list[str]:
    if not item or content_type(item) not in {"DraftIssue", "DRAFT_ISSUE"}:
        return []
    raw: Any = item.get("content", {}).get("assignees")
    if isinstance(raw, dict):
        raw = raw.get("nodes", [])
    if is_blank(raw):
        raw = item_field_value(item, "Assignees")
    if is_blank(raw):
        return []
    values = raw if isinstance(raw, list) else [raw]
    logins: list[str] = []
    for value in values:
        login = value.get("login") if isinstance(value, dict) else value
        if not is_blank(login):
            logins.append(str(login))
    normalized = [login.casefold() for login in logins]
    if len(set(normalized)) != len(normalized):
        raise ContractError(f"Draft contém responsáveis duplicados: {logins!r}")
    return logins


_SYNC_CLASSIFIER: Callable[[str, list[Any]], dict[str, str]] | None = None


def sync_classify(title: str, labels: list[Any]) -> dict[str, str]:
    """Run the repository's classifier and normalize its historical encoding."""

    global _SYNC_CLASSIFIER
    if _SYNC_CLASSIFIER is None:
        namespace = runpy.run_path(str(Path(__file__).with_name("sync_github_project.py")))
        _SYNC_CLASSIFIER = namespace["classify"]
    raw = _SYNC_CLASSIFIER(title, labels)
    repaired = {repair_mojibake(str(key)): repair_mojibake(str(value)) for key, value in raw.items()}
    by_key = {normalized_words(key).replace(" ", ""): value for key, value in repaired.items()}
    return {
        name: by_key.get(normalized_words(name).replace(" ", ""), "")
        for name in CLASSIFIABLE_FIELDS
    }


def field_type(field: dict[str, Any]) -> str:
    data_type = field.get("dataType")
    if data_type:
        return str(data_type)
    typename = field.get("__typename") or field.get("type")
    if typename == "ProjectV2SingleSelectField":
        return "SINGLE_SELECT"
    if typename == "ProjectV2MultiSelectField":
        return "MULTI_SELECT"
    if typename == "ProjectV2IterationField":
        return "ITERATION"
    return str(typename or "")


def field_options(field: dict[str, Any]) -> list[dict[str, Any]]:
    return list(field.get("options") or field.get("multiSelectOptions") or [])


def fields_by_name(fields: Iterable[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    seen: dict[str, str] = {}
    for field in fields:
        name = str(field.get("name") or "")
        key = normalized_words(name).replace(" ", "")
        if key in seen:
            raise ContractError(f"Campos ambíguos: {seen[key]!r} e {name!r}")
        seen[key] = name
        result[name] = field
    return result


def find_field(fields: Iterable[dict[str, Any]], name: str) -> dict[str, Any] | None:
    wanted = normalized_words(name).replace(" ", "")
    matches = [
        field
        for field in fields
        if normalized_words(field.get("name", "")).replace(" ", "") == wanted
    ]
    if len(matches) > 1:
        raise ContractError(f"Mais de um campo corresponde a {name!r}")
    return matches[0] if matches else None


def option_payload(option: dict[str, Any], *, name: str | None = None) -> dict[str, Any]:
    payload = {
        "name": name if name is not None else str(option.get("name") or ""),
        "color": str(option.get("color") or "GRAY"),
        "description": str(option.get("description") or ""),
    }
    if option.get("id"):
        payload["id"] = option["id"]
    return payload


def same_options(current: list[dict[str, Any]], desired: list[dict[str, Any]]) -> bool:
    keys = ("id", "name", "color", "description")
    return [tuple(option.get(key) for key in keys) for option in current] == [
        tuple(option.get(key) for key in keys) for option in desired
    ]


class MigrationPlan:
    def __init__(self, operations: list[dict[str, Any]]):
        self.operations = operations

    def of_kind(self, kind: str) -> list[dict[str, Any]]:
        return [operation for operation in self.operations if operation["kind"] == kind]

    def summary(self) -> dict[str, int]:
        return dict(sorted(Counter(operation["kind"] for operation in self.operations).items()))


class ProjectMigrator:
    def __init__(
        self,
        gh: GhClient | Any,
        classifier: Callable[[str, list[Any]], dict[str, str]] = sync_classify,
        sleep: Callable[[float], None] = time.sleep,
        consistency_delays: tuple[float, ...] = ITEM_LIST_CONSISTENCY_DELAYS,
    ):
        self.gh = gh
        self.classifier = classifier
        self.sleep = sleep
        self.consistency_delays = consistency_delays

    def load_fields(self, project_id: str) -> list[dict[str, Any]]:
        fields: list[dict[str, Any]] = []
        after: str | None = None
        while True:
            response = self.gh.graphql(FIELDS_QUERY, {"projectId": project_id, "after": after})
            connection = response["data"]["node"]["fields"]
            fields.extend(connection["nodes"])
            if not connection["pageInfo"]["hasNextPage"]:
                if len(fields) != connection["totalCount"]:
                    raise ContractError("A paginação de campos não retornou todos os campos.")
                return fields
            after = connection["pageInfo"]["endCursor"]

    def load_draft_details(self, project_id: str) -> dict[str, dict[str, Any]]:
        details: dict[str, dict[str, Any]] = {}
        after: str | None = None
        seen = 0
        while True:
            response = self.gh.graphql(
                DRAFT_DETAILS_QUERY, {"projectId": project_id, "after": after}
            )
            connection = response["data"]["node"]["items"]
            seen += len(connection["nodes"])
            for node in connection["nodes"]:
                content = node.get("content") or {}
                if content.get("id"):
                    details[str(node["id"])] = content
            if not connection["pageInfo"]["hasNextPage"]:
                if seen != connection["totalCount"]:
                    raise ContractError("A paginação de drafts não percorreu todos os itens.")
                return details
            after = connection["pageInfo"]["endCursor"]

    def load_project_items(self, ref: tuple[str, int]) -> list[dict[str, Any]]:
        owner, number = ref
        item_data = self.gh.json(
            "project",
            "item-list",
            str(number),
            "--owner",
            owner,
            "--limit",
            "10000",
            "--format",
            "json",
        )
        items = item_data.get("items", [])
        if len(items) != item_data.get("totalCount", len(items)):
            raise ContractError(f"{owner}/{number}: a listagem de itens foi truncada.")
        return items

    def load_snapshot(self, ref: tuple[str, int]) -> dict[str, Any]:
        owner, number = ref
        project = self.gh.json(
            "project", "view", str(number), "--owner", owner, "--format", "json"
        )
        fields = self.load_fields(project["id"])
        items = self.load_project_items(ref)
        draft_details = self.load_draft_details(project["id"])
        items_by_id = {str(item.get("id")): item for item in items}
        missing_drafts = set(draft_details) - set(items_by_id)
        for delay in self.consistency_delays:
            if not missing_drafts:
                break
            self.sleep(delay)
            # Only retry the eventually-consistent CLI item listing. GraphQL details
            # and every other API error remain single-attempt and fail immediately.
            items = self.load_project_items(ref)
            items_by_id = {str(item.get("id")): item for item in items}
            missing_drafts = set(draft_details) - set(items_by_id)
        if missing_drafts:
            missing = ", ".join(sorted(missing_drafts))
            raise ContractError(
                f"{owner}/{number}: drafts ausentes da listagem do gh após "
                f"{len(self.consistency_delays)} tentativas adicionais: {missing}"
            )
        for project_item_id, content in draft_details.items():
            items_by_id[project_item_id].setdefault("content", {}).update(content)
        return {"ref": ref, "project": project, "fields": fields, "items": items}

    def discover(self) -> dict[tuple[str, int], dict[str, Any]]:
        return {ref: self.load_snapshot(ref) for ref in (SOURCE_P4, SOURCE_P17, TARGET_P41)}

    def validate_snapshot(self, snapshot: dict[str, Any]) -> None:
        owner, number = snapshot["ref"]
        project = snapshot.get("project") or {}
        if not project.get("id"):
            raise ContractError(f"{owner}/{number}: Project sem id.")
        fields_by_name(snapshot.get("fields", []))

    def validate_source_p4(self, snapshot: dict[str, Any]) -> None:
        status = find_field(snapshot["fields"], "Status")
        if status is None or field_type(status) != "SINGLE_SELECT":
            raise ContractError("Project 4 precisa do campo Status SINGLE_SELECT.")
        for name, spec in CANONICAL_FIELDS.items():
            field = find_field(snapshot["fields"], name)
            if field is None:
                raise ContractError(f"Project 4 não possui o campo canônico {name!r}.")
            if field_type(field) != spec["dataType"]:
                raise ContractError(
                    f"Project 4: {name!r} deveria ser {spec['dataType']}, "
                    f"mas é {field_type(field)}."
                )
            if spec["dataType"] == "SINGLE_SELECT":
                actual = {str(option.get("name")) for option in field_options(field)}
                missing = set(spec["options"]) - actual
                if missing:
                    raise ContractError(
                        f"Project 4: {name!r} não possui as opções {sorted(missing)!r}."
                    )

    def validate_source_item_mappings(
        self, p4: dict[str, Any], p17: dict[str, Any]
    ) -> None:
        p17_status = find_field(p17["fields"], "Status")
        if p17_status is None or field_type(p17_status) != "SINGLE_SELECT":
            raise ContractError("Project 17 precisa do campo Status SINGLE_SELECT.")
        for item in p4["items"]:
            status = item_field_value(item, "Status")
            if not is_blank(status):
                canonical_status(status, "p4")
        for item in p17["items"]:
            status = item_field_value(item, "Status")
            if not is_blank(status):
                canonical_status(status, "p17")
            priority = item_field_value(item, "Priority")
            if not is_blank(priority):
                canonical_priority(priority)
            sprint_number(item)

    def canonical_source_specs(self, p4: dict[str, Any]) -> dict[str, dict[str, Any]]:
        result: dict[str, dict[str, Any]] = {}
        for name, contract in CANONICAL_FIELDS.items():
            source = find_field(p4["fields"], name)
            assert source is not None
            spec = {"name": name, "dataType": contract["dataType"]}
            if contract["dataType"] == "SINGLE_SELECT":
                wanted = set(contract["options"])
                spec["options"] = [
                    option_payload(option)
                    for option in field_options(source)
                    if option.get("name") in wanted
                ]
            result[name] = spec
        return result

    def plan_required_select(
        self,
        field: dict[str, Any],
        required: list[dict[str, Any]],
        *,
        exact: bool,
        alias: Callable[[Any], str | None] | None = None,
    ) -> list[dict[str, Any]]:
        current = field_options(field)
        matched: dict[str, dict[str, Any]] = {}
        extras: list[dict[str, Any]] = []
        required_names = {str(option["name"]): option for option in required}
        normalized_required = {normalized_words(name): name for name in required_names}

        for option in current:
            if alias is not None:
                canonical = alias(option.get("name"))
            else:
                canonical = normalized_required.get(normalized_words(option.get("name")))
            if canonical is None:
                if exact:
                    raise ContractError(
                        f"Opção desconhecida em {field.get('name')!r}: {option.get('name')!r}"
                    )
                extras.append(option_payload(option))
                continue
            if canonical in matched:
                raise ContractError(
                    f"Opções duplicadas para {canonical!r} em {field.get('name')!r}."
                )
            matched[canonical] = option

        desired: list[dict[str, Any]] = []
        for required_option in required:
            name = str(required_option["name"])
            existing = matched.get(name)
            payload = {
                "name": name,
                "color": str(required_option.get("color") or "GRAY"),
                "description": str(required_option.get("description") or ""),
            }
            if existing and existing.get("id"):
                payload["id"] = existing["id"]
            desired.append(payload)
        if not exact:
            desired.extend(extras)
        return desired

    def plan_structure(
        self, p4: dict[str, Any], target: dict[str, Any]
    ) -> list[dict[str, Any]]:
        operations: list[dict[str, Any]] = []
        source_specs = self.canonical_source_specs(p4)
        for name, spec in source_specs.items():
            target_field = find_field(target["fields"], name)
            if target_field is None:
                operations.append(
                    {
                        "kind": "create_field",
                        "field": spec,
                        "description": f"Criar campo canônico {name} ({spec['dataType']})",
                    }
                )
                continue
            if field_type(target_field) != spec["dataType"]:
                raise ContractError(
                    f"Project 41: {name!r} deveria ser {spec['dataType']}, "
                    f"mas é {field_type(target_field)}."
                )
            if spec["dataType"] == "SINGLE_SELECT":
                desired = self.plan_required_select(
                    target_field, spec["options"], exact=False
                )
                if not same_options(field_options(target_field), desired):
                    operations.append(
                        {
                            "kind": "update_select_options",
                            "field_name": name,
                            "field_id": target_field["id"],
                            "options": desired,
                            "description": f"Completar opções canônicas de {name}",
                        }
                    )

        status_field = find_field(target["fields"], "Status")
        if status_field is None or field_type(status_field) != "SINGLE_SELECT":
            raise ContractError("Project 41 precisa de um campo Status SINGLE_SELECT.")
        required_status = [
            {"name": name, **STATUS_SPECS[name]}
            for name in STATUS_NAMES
        ]
        desired_status = self.plan_required_select(
            status_field,
            required_status,
            exact=True,
            alias=lambda value: canonical_status(value, "target"),
        )
        if not same_options(field_options(status_field), desired_status):
            operations.append(
                {
                    "kind": "update_select_options",
                    "field_name": "Status",
                    "field_id": status_field["id"],
                    "options": desired_status,
                    "description": "Padronizar Status preservando ids existentes",
                }
            )
        return operations

    def index_url_items(
        self, snapshot: dict[str, Any], *, source: bool
    ) -> dict[str, dict[str, Any]]:
        owner, number = snapshot["ref"]
        result: dict[str, dict[str, Any]] = {}
        for item in snapshot["items"]:
            kind = content_type(item)
            content = item.get("content", {})
            url = canonical_url(content.get("url"))
            if kind in {"Issue", "PullRequest", "ISSUE", "PULL_REQUEST"}:
                if not url:
                    if source:
                        raise ContractError(f"{owner}/{number}: {kind} sem URL.")
                    continue
                if url in result:
                    raise ContractError(f"{owner}/{number}: item duplicado por URL: {url}")
                result[url] = item
            elif kind in {"DraftIssue", "DRAFT_ISSUE"}:
                continue
            elif source:
                raise ContractError(f"{owner}/{number}: tipo de item não suportado: {kind!r}")
        return result

    def draft_records(
        self, p4: dict[str, Any], p17: dict[str, Any], target: dict[str, Any]
    ) -> list[dict[str, Any]]:
        if any(content_type(item) in {"DraftIssue", "DRAFT_ISSUE"} for item in p4["items"]):
            raise ContractError("O Project 4 contém draft; o contrato só recria drafts do Project 17.")

        source_groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
        target_groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
        for item in p17["items"]:
            if content_type(item) in {"DraftIssue", "DRAFT_ISSUE"}:
                signature = draft_signature(item)
                if not signature[0]:
                    raise ContractError("Project 17 contém draft sem título.")
                source_groups[signature].append(item)
        for item in target["items"]:
            if content_type(item) in {"DraftIssue", "DRAFT_ISSUE"}:
                target_groups[draft_signature(item)].append(item)

        records: list[dict[str, Any]] = []
        signatures = sorted(set(source_groups) | set(target_groups))
        for signature in signatures:
            sources = source_groups.get(signature, [])
            targets = sorted(target_groups.get(signature, []), key=lambda item: str(item.get("id")))
            count = max(len(sources), len(targets))
            for occurrence in range(count):
                records.append(
                    {
                        "locator": draft_locator(signature, occurrence),
                        "signature": signature,
                        "p17": sources[occurrence] if occurrence < len(sources) else None,
                        "target": targets[occurrence] if occurrence < len(targets) else None,
                    }
                )
        return records

    def url_records(
        self, p4: dict[str, Any], p17: dict[str, Any], target: dict[str, Any]
    ) -> list[dict[str, Any]]:
        p4_items = self.index_url_items(p4, source=True)
        p17_items = self.index_url_items(p17, source=True)
        target_items = self.index_url_items(target, source=False)
        records: list[dict[str, Any]] = []
        for url in sorted(set(p4_items) | set(p17_items) | set(target_items)):
            sources = [item for item in (p4_items.get(url), p17_items.get(url)) if item]
            if sources:
                types = {content_type(item).casefold() for item in sources}
                if len(types) > 1:
                    raise ContractError(f"Tipos conflitantes para {url}: {sorted(types)}")
            records.append(
                {
                    "locator": locator_for_url(url),
                    "url": sources[0]["content"]["url"] if sources else target_items[url]["content"]["url"],
                    "p4": p4_items.get(url),
                    "p17": p17_items.get(url),
                    "target": target_items.get(url),
                }
            )
        return records

    def record_content(self, record: dict[str, Any]) -> dict[str, Any]:
        for key in ("p4", "p17", "target"):
            item = record.get(key)
            if item:
                return item.get("content", {})
        return {}

    def desired_values(self, record: dict[str, Any]) -> dict[str, Any]:
        values: dict[str, Any] = {}
        target_item = record.get("target")
        p17_item = record.get("p17")
        p4_item = record.get("p4")

        def target_is_blank(field_name: str) -> bool:
            return target_item is None or is_blank(item_field_value(target_item, field_name))

        if p17_item:
            raw_status = item_field_value(p17_item, "Status")
            if not is_blank(raw_status) and target_is_blank("Status"):
                values["Status"] = canonical_status(raw_status, "p17")
            raw_priority = item_field_value(p17_item, "Priority")
            priority = canonical_priority(raw_priority)
            if priority:
                if target_is_blank("Priority"):
                    values["Priority"] = priority[0]
                if target_is_blank("Prioridade"):
                    values["Prioridade"] = priority[1]
            sprint = sprint_number(p17_item)
            if sprint is not None and (target_item is None or is_blank(item_field_value(target_item, "Sprint"))):
                values["Sprint"] = sprint

        if p4_item:
            raw_status = item_field_value(p4_item, "Status")
            if not is_blank(raw_status) and target_is_blank("Status"):
                values["Status"] = canonical_status(raw_status, "p4")
            for name in CANONICAL_FIELDS:
                value = item_field_value(p4_item, name)
                if not is_blank(value) and target_is_blank(name):
                    values[name] = repair_mojibake(str(value)) if isinstance(value, str) else value

        content = self.record_content(record)
        classification = self.classifier(str(content.get("title") or ""), item_labels(
            p4_item or p17_item or target_item or {}
        ))
        classification = {
            repair_mojibake(str(key)): repair_mojibake(str(value))
            for key, value in classification.items()
        }
        for name in CLASSIFIABLE_FIELDS:
            if name in values:
                continue
            current = item_field_value(target_item or {}, name)
            value = classification.get(name, "")
            if is_blank(current) and not is_blank(value):
                values[name] = value
        return values

    def validate_desired_fields(
        self,
        records: list[dict[str, Any]],
        p17: dict[str, Any],
        target: dict[str, Any],
    ) -> None:
        desired = [(record, self.desired_values(record)) for record in records]
        used_priority = any("Priority" in values for _, values in desired)
        used_sprint = any("Sprint" in values for _, values in desired)

        source_priority = find_field(p17["fields"], "Priority")
        target_priority = find_field(target["fields"], "Priority")
        if used_priority:
            if source_priority is None or field_type(source_priority) != "SINGLE_SELECT":
                raise ContractError("Project 17 precisa do campo Priority SINGLE_SELECT.")
            if target_priority is None or field_type(target_priority) != "SINGLE_SELECT":
                raise ContractError("Project 41 precisa do campo legado Priority SINGLE_SELECT.")
            available: set[str] = set()
            for option in field_options(target_priority):
                priority = canonical_priority(option.get("name"))
                if priority:
                    available.add(priority[0])
            required = {values["Priority"] for _, values in desired if "Priority" in values}
            if not required.issubset(available):
                raise ContractError(
                    f"Project 41 Priority não possui as opções {sorted(required - available)!r}."
                )

        if used_sprint:
            target_sprint = find_field(target["fields"], "Sprint")
            if target_sprint is None or field_type(target_sprint) != "NUMBER":
                raise ContractError("Project 41 precisa do campo Sprint NUMBER.")

        for _, values in desired:
            for name, spec in CANONICAL_FIELDS.items():
                if name not in values or spec["dataType"] != "SINGLE_SELECT":
                    continue
                if str(values[name]) not in spec["options"]:
                    raise ContractError(f"Valor inválido para {name}: {values[name]!r}")
            if "Esforço" in values:
                try:
                    float(values["Esforço"])
                except (TypeError, ValueError) as error:
                    raise ContractError(f"Esforço não numérico: {values['Esforço']!r}") from error

    def values_equal(self, field_name: str, current: Any, desired: Any) -> bool:
        if is_blank(current):
            return False
        if field_name == "Status":
            return canonical_status(current, "target") == desired
        if field_name == "Priority":
            priority = canonical_priority(current)
            return bool(priority and priority[0] == desired)
        if field_name in {"Sprint", "Esforço"}:
            try:
                return float(current) == float(desired)
            except (TypeError, ValueError):
                return False
        return repair_mojibake(str(current)) == repair_mojibake(str(desired))

    def plan_items(
        self, p4: dict[str, Any], p17: dict[str, Any], target: dict[str, Any]
    ) -> list[dict[str, Any]]:
        url_records = self.url_records(p4, p17, target)
        drafts = self.draft_records(p4, p17, target)
        records = [*url_records, *drafts]
        self.validate_desired_fields(records, p17, target)
        operations: list[dict[str, Any]] = []

        for record in url_records:
            if record["target"] is None:
                operations.append(
                    {
                        "kind": "add_item",
                        "locator": record["locator"],
                        "url": record["url"],
                        "description": f"Adicionar item {record['url']}",
                    }
                )
        for record in drafts:
            title, body = record["signature"]
            if record.get("p17") and record.get("target") is None:
                operations.append(
                    {
                        "kind": "create_draft",
                        "locator": record["locator"],
                        "title": title,
                        "body": body,
                        "description": f"Recriar draft do Project 17: {title}",
                    }
                )
            if record.get("p17"):
                desired_assignees = draft_assignee_logins(record["p17"])
                current_assignees = draft_assignee_logins(record.get("target") or {})
                if desired_assignees and not current_assignees:
                    rendered = ", ".join(desired_assignees) if desired_assignees else "nenhum"
                    operations.append(
                        {
                            "kind": "set_draft_assignees",
                            "locator": record["locator"],
                            "assignee_logins": desired_assignees,
                            "description": (
                                f"Definir responsáveis exatos do draft {title}: {rendered}"
                            ),
                        }
                    )

        for record in records:
            current_item = record.get("target") or {}
            for field_name, value in self.desired_values(record).items():
                current = item_field_value(current_item, field_name)
                if not self.values_equal(field_name, current, value):
                    operations.append(
                        {
                            "kind": "set_field",
                            "locator": record["locator"],
                            "field_name": field_name,
                            "value": value,
                            "description": f"{record['locator']}: {field_name}={value}",
                        }
                    )
        return operations

    def build_plan(
        self, snapshots: dict[tuple[str, int], dict[str, Any]] | None = None
    ) -> MigrationPlan:
        snapshots = snapshots or self.discover()
        missing = [ref for ref in (SOURCE_P4, SOURCE_P17, TARGET_P41) if ref not in snapshots]
        if missing:
            raise ContractError(f"Snapshots ausentes: {missing!r}")
        for snapshot in snapshots.values():
            self.validate_snapshot(snapshot)
        p4 = snapshots[SOURCE_P4]
        p17 = snapshots[SOURCE_P17]
        target = snapshots[TARGET_P41]
        self.validate_source_p4(p4)
        self.validate_source_item_mappings(p4, p17)
        operations = [
            *self.plan_structure(p4, target),
            *self.plan_items(p4, p17, target),
        ]
        return MigrationPlan(operations)

    def create_field(self, field: dict[str, Any]) -> None:
        args = [
            "project",
            "field-create",
            str(TARGET_P41[1]),
            "--owner",
            TARGET_P41[0],
            "--name",
            field["name"],
            "--data-type",
            field["dataType"],
        ]
        if field["dataType"] == "SINGLE_SELECT":
            args.extend(
                [
                    "--single-select-options",
                    ",".join(str(option["name"]) for option in field["options"]),
                ]
            )
        args.extend(["--format", "json"])
        self.gh.run(*args)

    def update_select_options(self, field_id: str, options: list[dict[str, Any]]) -> None:
        self.gh.graphql(
            UPDATE_SELECT_FIELD_MUTATION,
            {"fieldId": field_id, "options": options},
        )

    def resolve_user_ids(self, logins: Iterable[str]) -> dict[str, str]:
        resolved: dict[str, str] = {}
        for login in logins:
            key = login.casefold()
            if key in resolved:
                continue
            response = self.gh.graphql(RESOLVE_USER_QUERY, {"login": login})
            user = response.get("data", {}).get("user")
            if not user or not user.get("id") or not user.get("login"):
                raise ContractError(f"Usuário GitHub não encontrado: {login!r}")
            if str(user["login"]).casefold() != key:
                raise ContractError(
                    f"Login {login!r} resolveu para um usuário diferente: {user['login']!r}"
                )
            resolved[key] = str(user["id"])
        return resolved

    def update_draft_assignees(self, draft_issue_id: str, assignee_ids: list[str]) -> None:
        self.gh.graphql(
            UPDATE_DRAFT_ASSIGNEES_MUTATION,
            {"draftIssueId": draft_issue_id, "assigneeIds": assignee_ids},
        )

    def find_target_item(self, snapshot: dict[str, Any], locator: str) -> dict[str, Any]:
        if locator.startswith("url:"):
            wanted = locator.removeprefix("url:")
            matches = [
                item
                for item in snapshot["items"]
                if canonical_url(item.get("content", {}).get("url")) == wanted
            ]
        else:
            draft_groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
            for item in snapshot["items"]:
                if content_type(item) in {"DraftIssue", "DRAFT_ISSUE"}:
                    draft_groups[draft_signature(item)].append(item)
            matches = []
            for signature, items in draft_groups.items():
                ordered = sorted(items, key=lambda item: str(item.get("id")))
                for occurrence, item in enumerate(ordered):
                    if draft_locator(signature, occurrence) == locator:
                        matches.append(item)
        if len(matches) != 1:
            raise ContractError(
                f"Esperado exatamente um item no alvo para {locator}, encontrados {len(matches)}."
            )
        return matches[0]

    def select_option_id(
        self, field: dict[str, Any], value: str, field_name: str
    ) -> str:
        matches: list[dict[str, Any]] = []
        for option in field_options(field):
            if field_name == "Status":
                equal = canonical_status(option.get("name"), "target") == value
            elif field_name == "Priority":
                priority = canonical_priority(option.get("name"))
                equal = bool(priority and priority[0] == value)
            else:
                equal = repair_mojibake(str(option.get("name"))) == repair_mojibake(str(value))
            if equal:
                matches.append(option)
        if len(matches) != 1 or not matches[0].get("id"):
            raise ContractError(
                f"Opção {value!r} não resolvida de forma única no campo {field_name!r}."
            )
        return str(matches[0]["id"])

    def prepare_field_update(
        self,
        target: dict[str, Any],
        item: dict[str, Any],
        field_name: str,
        value: Any,
    ) -> dict[str, Any]:
        field = find_field(target["fields"], field_name)
        if field is None:
            raise ContractError(f"Campo {field_name!r} ausente após preparação do alvo.")
        data_type = field_type(field)
        if data_type == "SINGLE_SELECT":
            field_value = {
                "singleSelectOptionId": self.select_option_id(
                    field, str(value), field_name
                )
            }
        elif data_type == "TEXT":
            field_value = {"text": str(value)}
        elif data_type == "NUMBER":
            field_value = {"number": float(value)}
        else:
            raise ContractError(
                f"Tipo {data_type!r} não suportado para escrita em {field_name!r}."
            )
        return {
            "itemId": str(item["id"]),
            "fieldId": str(field["id"]),
            "value": field_value,
        }

    def item_field_batch_query(self, size: int) -> str:
        if size < 1 or size > ITEM_FIELD_BATCH_SIZE:
            raise ValueError(
                f"Lote de valores deve ter entre 1 e {ITEM_FIELD_BATCH_SIZE} itens."
            )
        definitions = ["$projectId: ID!"]
        mutations: list[str] = []
        for index in range(size):
            definitions.extend(
                [
                    f"$itemId{index}: ID!",
                    f"$fieldId{index}: ID!",
                    f"$value{index}: ProjectV2FieldValue!",
                ]
            )
            mutations.append(
                f"update{index}: updateProjectV2ItemFieldValue("
                f"input: {{projectId: $projectId, itemId: $itemId{index}, "
                f"fieldId: $fieldId{index}, value: $value{index}}}) "
                "{ projectV2Item { id } }"
            )
        return (
            "mutation(" + ", ".join(definitions) + ") {\n  "
            + "\n  ".join(mutations)
            + "\n}"
        )

    def execute_field_update_batches(
        self, project_id: str, writes: list[dict[str, Any]]
    ) -> int:
        completed = 0
        for start in range(0, len(writes), ITEM_FIELD_BATCH_SIZE):
            batch = writes[start : start + ITEM_FIELD_BATCH_SIZE]
            variables: dict[str, Any] = {"projectId": project_id}
            for index, write in enumerate(batch):
                variables[f"itemId{index}"] = write["itemId"]
                variables[f"fieldId{index}"] = write["fieldId"]
                variables[f"value{index}"] = write["value"]
            response = self.gh.graphql(self.item_field_batch_query(len(batch)), variables)
            if response.get("errors"):
                raise RuntimeError(
                    "GraphQL retornou errors ao atualizar lote de valores: "
                    + json.dumps(response["errors"], ensure_ascii=False)
                )
            completed += len(batch)
        return completed

    def apply(self, plan: MigrationPlan) -> dict[str, int]:
        """Apply a prevalidated plan, resolving ids again after structural changes."""

        executed: Counter[str] = Counter()
        skipped: Counter[str] = Counter()
        draft_assignee_operations = plan.of_kind("set_draft_assignees")
        assignee_logins = sorted(
            {
                login
                for operation in draft_assignee_operations
                for login in operation["assignee_logins"]
            },
            key=str.casefold,
        )
        # Resolve every login before the first mutation so an invalid source contract
        # cannot leave a partially prepared target.
        resolved_users = self.resolve_user_ids(assignee_logins)

        for operation in plan.operations:
            if operation["kind"] == "create_field":
                self.create_field(operation["field"])
                executed["create_field"] += 1
            elif operation["kind"] == "update_select_options":
                self.update_select_options(operation["field_id"], operation["options"])
                executed["update_select_options"] += 1

        for operation in plan.operations:
            if operation["kind"] == "add_item":
                self.gh.run(
                    "project",
                    "item-add",
                    str(TARGET_P41[1]),
                    "--owner",
                    TARGET_P41[0],
                    "--url",
                    operation["url"],
                    "--format",
                    "json",
                )
                executed["add_item"] += 1
            elif operation["kind"] == "create_draft":
                self.gh.run(
                    "project",
                    "item-create",
                    str(TARGET_P41[1]),
                    "--owner",
                    TARGET_P41[0],
                    "--title",
                    operation["title"],
                    "--body",
                    operation["body"],
                    "--format",
                    "json",
                )
                executed["create_draft"] += 1

        target = self.load_snapshot(TARGET_P41)
        self.validate_snapshot(target)
        for name, spec in CANONICAL_FIELDS.items():
            field = find_field(target["fields"], name)
            if field is None or field_type(field) != spec["dataType"]:
                raise ContractError(f"Campo {name!r} não ficou disponível no alvo.")

        # field-create accepts names but not the source colors/descriptions. Normalize
        # newly created selects now, keeping the ids GitHub just assigned, so the first
        # apply converges before any item value is written.
        for operation in plan.of_kind("create_field"):
            created_spec = operation["field"]
            if created_spec["dataType"] != "SINGLE_SELECT":
                continue
            created_field = find_field(target["fields"], created_spec["name"])
            assert created_field is not None
            desired_options = self.plan_required_select(
                created_field,
                created_spec["options"],
                exact=False,
            )
            if not same_options(field_options(created_field), desired_options):
                self.update_select_options(created_field["id"], desired_options)
                created_field["options"] = desired_options
                executed["update_select_options"] += 1

        # After drafts have been recreated/reloaded, reuse the prevalidated user ids
        # and apply exact source assignments using the DraftIssue id (DI_).
        for operation in draft_assignee_operations:
            item = self.find_target_item(target, operation["locator"])
            if content_type(item) not in {"DraftIssue", "DRAFT_ISSUE"}:
                raise ContractError(
                    f"Operação de responsáveis apontou para item não-draft: {operation['locator']}"
                )
            current_logins = draft_assignee_logins(item)
            desired_logins = operation["assignee_logins"]
            if current_logins or not desired_logins:
                skipped["set_draft_assignees"] += 1
                continue
            draft_issue_id = str(item.get("content", {}).get("id") or "")
            if not draft_issue_id.startswith("DI_"):
                raise ContractError(
                    f"Draft {operation['locator']} não possui content.id DI_: {draft_issue_id!r}"
                )
            assignee_ids = [resolved_users[login.casefold()] for login in desired_logins]
            self.update_draft_assignees(draft_issue_id, assignee_ids)
            executed["set_draft_assignees"] += 1

        newly_created_locators = {
            operation["locator"]
            for operation in plan.operations
            if operation["kind"] in {"add_item", "create_draft"}
        }
        pending_field_writes: list[dict[str, Any]] = []
        for operation in plan.operations:
            if operation["kind"] != "set_field":
                continue
            item = self.find_target_item(target, operation["locator"])
            current = item_field_value(item, operation["field_name"])
            if self.values_equal(operation["field_name"], current, operation["value"]):
                skipped["set_field"] += 1
                continue
            if not is_blank(current) and operation["locator"] not in newly_created_locators:
                skipped["set_field"] += 1
                continue
            pending_field_writes.append(
                self.prepare_field_update(
                    target,
                    item,
                    operation["field_name"],
                    operation["value"],
                )
            )
        completed_field_writes = self.execute_field_update_batches(
            str(target["project"]["id"]), pending_field_writes
        )
        if completed_field_writes:
            executed["set_field"] += completed_field_writes

        result = {f"executed_{key}": value for key, value in sorted(executed.items())}
        result.update({f"skipped_{key}": value for key, value in sorted(skipped.items())})
        return result


def render_plan(plan: MigrationPlan, *, apply: bool) -> None:
    mode = "APPLY" if apply else "DRY-RUN"
    print(f"[{mode}] Consolidação nathannmvr/4 + ifpebj-ti/17 -> ifpebj-ti/41")
    if not plan.operations:
        print("Nenhuma alteração necessária; o alvo já está convergido.")
        return
    for index, operation in enumerate(plan.operations, start=1):
        print(f"{index:03d}. {operation['description']}")
    print("Resumo do plano: " + json.dumps(plan.summary(), ensure_ascii=False, sort_keys=True))
    if not apply:
        print("Nenhuma mutação foi executada. Use --apply após revisar este plano.")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Executa o plano validado; sem esta opção o comando é somente leitura.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    migrator = ProjectMigrator(GhClient())
    try:
        snapshots = migrator.discover()
        plan = migrator.build_plan(snapshots)
        render_plan(plan, apply=args.apply)
        if args.apply:
            result = migrator.apply(plan)
            print("Resumo da aplicação: " + json.dumps(result, ensure_ascii=False, sort_keys=True))
        return 0
    except (ContractError, RuntimeError, KeyError, ValueError) as error:
        print(f"ERRO: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
