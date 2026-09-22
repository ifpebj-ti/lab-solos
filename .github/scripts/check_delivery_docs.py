"""Validate the read-only editorial contract for the delivery documentation."""

from __future__ import annotations

import argparse
import datetime as date
import json
import os
import re
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path, PurePosixPath
from typing import Callable
from urllib.parse import unquote, urlsplit


SCHEMA_VERSION = 1
SHA_PATTERN = re.compile(r"^[0-9a-f]{40}$", re.IGNORECASE)
REQUIREMENT_PATTERN = re.compile(r"^(?:RF|RNF)-\d{3}$")
CRITERION_PATTERN = re.compile(r"^CA-\d{3}$")
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MANIFEST_FIELDS = frozenset(
    {"versao", "referenciaAplicacao", "referenciaWiki", "paginas", "exemplosCompose"}
)
PAGE_FIELDS = frozenset({"caminho", "titulo", "secoes", "requisitos", "criterios"})
COMPOSE_FIELDS = frozenset({"secao", "arquivo"})
APP_REPOSITORY = ("ifpebj-ti", "lab-solos")
WIKI_REPOSITORY = ("ifpebj-ti", "lab-solos.wiki")
COMPOSE_VARIABLE_PATTERN = re.compile(r"\$\{([A-Za-z_][A-Za-z0-9_]*)([^}]*)\}")
ENV_ASSIGNMENT_PATTERN = re.compile(r"^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$")
FENCE_PATTERN = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")
HEADING_PATTERN = re.compile(r"^ {0,3}(#{1,6})[ \t]+(.+?)\s*#*\s*$")
SENSITIVE_PATTERN = re.compile(
    r"(?i)(?:^|[^a-z0-9])(?:senha|password|token|secret|api[_-]?key)"
    r"\b\s*[:=]\s*"
    r"(?:[`'\"])?([^\s`'\"<>{}]+)"
)
MARKDOWN_LINK_MARKER = "]("
METADATA_PATTERNS = {
    "date": re.compile(
        r"^\s*(?:\*\*)?(?:Data da revis(?:ã|a)o|Revisado em|Atualizado em)"
        r"(?:\*\*)?\s*:\s*`?([^`\r\n]+?)`?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "responsible": re.compile(
        r"^\s*(?:\*\*)?Respons[aá]vel(?: pela revis[aã]o)?"
        r"(?:\*\*)?\s*:\s*`?([^`\r\n]+?)`?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "application": re.compile(
        r"^\s*(?:\*\*)?(?:Refer[eê]ncia da aplica[cç][aã]o|"
        r"Commit da aplica[cç][aã]o)"
        r"(?:\*\*)?\s*:\s*`?([^`\r\n]+?)`?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
}


@dataclass
class Report:
    violations: list[str] = field(default_factory=list)
    infrastructure: list[str] = field(default_factory=list)

    def violation(self, location: object, rule: str) -> None:
        self.violations.append(_diagnostic(location, rule))

    def fatal(self, location: object, rule: str) -> None:
        self.infrastructure.append(_diagnostic(location, rule))

    @property
    def exit_code(self) -> int:
        if self.infrastructure:
            return 2
        return 1 if self.violations else 0


def _display_location(value: object) -> str:
    text = str(value).replace("\r", " ").replace("\n", " ").replace("\x00", " ")
    return text[:160] or "<entrada>"


def _diagnostic(location: object, rule: str) -> str:
    return f"{_display_location(location)}: {rule}"


def _read_utf8(path: Path, location: str, report: Report) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeError):
        report.fatal(location, "file-unreadable")
        return None


def _valid_iso_date(value: str) -> bool:
    if not DATE_PATTERN.fullmatch(value):
        return False
    try:
        date.date.fromisoformat(value)
    except ValueError:
        return False
    return True


def _safe_relative(value: object, location: str, report: Report) -> str | None:
    if not isinstance(value, str) or not value.strip():
        report.violation(location, "path-invalid")
        return None
    value = value.strip()
    if (
        "\x00" in value
        or "\\" in value
        or re.match(r"^[A-Za-z]:", value)
        or value.startswith("/")
    ):
        report.violation(location, "path-invalid")
        return None
    parts = value.split("/")
    if any(part in {"", ".", ".."} for part in parts):
        report.violation(location, "path-invalid")
        return None
    try:
        decoded = unquote(value)
    except UnicodeDecodeError:
        report.violation(location, "path-invalid")
        return None
    decoded_parts = decoded.split("/")
    if "\\" in decoded or any(part in {"", ".", ".."} for part in decoded_parts):
        report.violation(location, "path-invalid")
        return None
    if PurePosixPath(value).is_absolute():
        report.violation(location, "path-invalid")
        return None
    return value


def _resolve_under(root: Path, relative: str, location: str, report: Report) -> Path | None:
    root = root.resolve()
    candidate = root.joinpath(*relative.split("/"))
    try:
        resolved = candidate.resolve(strict=False)
        resolved.relative_to(root)
    except (OSError, ValueError):
        report.violation(location, "path-invalid")
        return None
    current = root
    for part in relative.split("/"):
        current /= part
        try:
            if current.is_symlink():
                report.violation(location, "path-invalid")
                return None
        except OSError:
            report.fatal(location, "file-unreadable")
            return None
    return candidate


def _required_text(mapping: dict, field_name: str, location: str, report: Report) -> str | None:
    value = mapping.get(field_name)
    if not isinstance(value, str) or not value.strip():
        report.violation(f"{location}.{field_name}", "manifest-field")
        return None
    return value.strip()


def _validate_field_names(
    mapping: dict, allowed: frozenset[str], location: str, report: Report
) -> None:
    if set(mapping) - allowed:
        report.violation(location, "manifest-field")


def _validate_id_list(
    value: object,
    pattern: re.Pattern[str],
    location: str,
    report: Report,
) -> None:
    if not isinstance(value, list) or not value:
        report.violation(location, "manifest-field")
        return
    seen: set[str] = set()
    for index, item in enumerate(value):
        if not isinstance(item, str) or not pattern.fullmatch(item):
            report.violation(f"{location}[{index}]", "manifest-field")
            continue
        if item in seen:
            report.violation(f"{location}[{index}]", "manifest-duplicate")
        seen.add(item)


def _validate_manifest_structure(manifest: object, repository: Path, report: Report) -> dict | None:
    if not isinstance(manifest, dict):
        report.violation("manifest.json", "manifest-shape")
        return None
    _validate_field_names(manifest, MANIFEST_FIELDS, "manifest.json", report)
    if manifest.get("versao") != SCHEMA_VERSION or isinstance(manifest.get("versao"), bool):
        report.violation("manifest.json.versao", "manifest-field")
    for field_name in ("referenciaAplicacao", "referenciaWiki"):
        value = manifest.get(field_name)
        if not isinstance(value, str) or not SHA_PATTERN.fullmatch(value):
            report.violation(f"manifest.json.{field_name}", "manifest-sha")

    pages = manifest.get("paginas")
    if not isinstance(pages, list) or not pages:
        report.violation("manifest.json.paginas", "manifest-field")
        pages = []
    seen_paths: set[str] = set()
    for index, item in enumerate(pages):
        location = f"manifest.json.paginas[{index}]"
        if not isinstance(item, dict):
            report.violation(location, "manifest-field")
            continue
        _validate_field_names(item, PAGE_FIELDS, location, report)
        path = _safe_relative(item.get("caminho"), f"{location}.caminho", report)
        if path is not None:
            if path in seen_paths:
                report.violation(f"{location}.caminho", "manifest-duplicate")
            seen_paths.add(path)
        _required_text(item, "titulo", location, report)
        sections = item.get("secoes")
        if not isinstance(sections, list) or not sections:
            report.violation(f"{location}.secoes", "manifest-field")
        elif any(not isinstance(section, str) or not section.strip() for section in sections):
            report.violation(f"{location}.secoes", "manifest-field")
        _validate_id_list(item.get("requisitos"), REQUIREMENT_PATTERN, f"{location}.requisitos", report)
        _validate_id_list(item.get("criterios"), CRITERION_PATTERN, f"{location}.criterios", report)

    compose_examples = manifest.get("exemplosCompose", [])
    if not isinstance(compose_examples, list):
        report.violation("manifest.json.exemplosCompose", "manifest-field")
    else:
        seen_examples: set[tuple[str, str]] = set()
        for index, item in enumerate(compose_examples):
            location = f"manifest.json.exemplosCompose[{index}]"
            if not isinstance(item, dict):
                report.violation(location, "manifest-field")
                continue
            _validate_field_names(item, COMPOSE_FIELDS, location, report)
            section = _required_text(item, "secao", location, report)
            compose_path = _safe_relative(item.get("arquivo"), f"{location}.arquivo", report)
            if section is not None and compose_path is not None:
                pair = (section, compose_path)
                if pair in seen_examples:
                    report.violation(location, "manifest-duplicate")
                seen_examples.add(pair)
                resolved = _resolve_under(repository, compose_path, f"{location}.arquivo", report)
                if resolved is not None and not resolved.is_file():
                    report.violation(f"{location}.arquivo", "compose-file-missing")
    return manifest


def _run_git(repository: Path, arguments: list[str], report: Report, location: str) -> tuple[int, str] | None:
    try:
        result = subprocess.run(
            ["git", "-C", str(repository), *arguments],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            check=False,
        )
    except (FileNotFoundError, OSError):
        report.fatal(location, "tool-unavailable")
        return None
    return result.returncode, result.stdout


def _validate_git_revision(repository: Path, revision: object, location: str, report: Report) -> None:
    if not isinstance(revision, str) or not SHA_PATTERN.fullmatch(revision):
        return
    result = _run_git(repository, ["cat-file", "-e", f"{revision}^{{commit}}"], report, location)
    if result is not None and result[0] != 0:
        report.violation(location, "git-reference-missing")


def _git_object_exists(
    repository: Path, revision: str, relative: str, location: str, report: Report
) -> bool:
    result = _run_git(repository, ["cat-file", "-t", f"{revision}:{relative}"], report, location)
    if result is None:
        return False
    if result[0] != 0:
        report.violation(location, "git-link-broken")
        return False
    return result[1].strip() == "blob"


def _git_pages_exist(wiki: Path, revision: str, pages: list[dict], report: Report) -> None:
    for index, page in enumerate(pages):
        path = page.get("caminho")
        if not isinstance(path, str) or not SHA_PATTERN.fullmatch(revision):
            continue
        result = _run_git(wiki, ["cat-file", "-t", f"{revision}:{path}"], report, f"paginas[{index}]")
        if result is not None and result[0] != 0:
            report.violation(f"paginas[{index}]", "git-page-missing")
        elif result is not None and result[1].strip() != "blob":
            report.violation(f"paginas[{index}]", "git-page-missing")


def _mask_fenced_code(text: str) -> str:
    output: list[str] = []
    fence: tuple[str, int] | None = None
    for line in text.splitlines(keepends=True):
        content = line.rstrip("\r\n")
        match = re.match(r"^ {0,3}(`{3,}|~{3,})", content)
        if fence is not None:
            output.append("".join(char if char in "\r\n" else " " for char in line))
            character, minimum = fence
            if re.fullmatch(rf" {{0,3}}{re.escape(character)}{{{minimum},}}[ \t]*", content):
                fence = None
        elif match:
            output.append("".join(char if char in "\r\n" else " " for char in line))
            fence = (match.group(1)[0], len(match.group(1)))
        else:
            output.append(line)
    return "".join(output)


def _headings(text: str) -> tuple[set[str], set[str]]:
    visible = _mask_fenced_code(text)
    headings: set[str] = set()
    anchors: set[str] = set()
    for match in re.finditer(r"^ {0,3}(#{1,6})[ \t]+(.+?)\s*#*\s*$", visible, re.MULTILINE):
        heading = match.group(2).strip()
        headings.add(heading.casefold())
        slug = re.sub(r"[^\w\s-]", "", heading.casefold(), flags=re.UNICODE)
        slug = re.sub(r"[\s-]+", "-", slug).strip("-")
        if slug:
            anchors.add(slug)
    for match in re.finditer(r"<a\s+[^>]*id\s*=\s*(['\"])([^'\"]+)\1", visible, re.IGNORECASE):
        anchors.add(match.group(2).casefold())
    return headings, anchors


def _metadata(text: str) -> dict[str, str | None]:
    values: dict[str, str | None] = {}
    for name, pattern in METADATA_PATTERNS.items():
        match = pattern.search(text)
        values[name] = match.group(1).strip() if match else None
    return values


def _validate_page_content(
    page: dict, path: str, text: str, application_revision: str, report: Report
) -> None:
    headings, _ = _headings(text)
    title = page.get("titulo")
    if isinstance(title, str) and title.casefold() not in headings:
        report.violation(path, "title-missing")
    sections = page.get("secoes", [])
    if isinstance(sections, list):
        for index, section in enumerate(sections):
            if not isinstance(section, str):
                continue
            section_text = re.sub(r"^\s*#{1,6}\s+", "", section).strip()
            if section_text.casefold() not in headings:
                report.violation(f"{path}:section-{index + 1}", "section-missing")
    metadata = _metadata(text)
    if metadata["date"] is None:
        report.violation(path, "metadata-missing")
    elif not _valid_iso_date(str(metadata["date"])):
        report.violation(path, "metadata-invalid")
    if metadata["responsible"] is None or str(metadata["responsible"]).casefold() in {
        "n/a",
        "a definir",
        "não definido",
        "nao definido",
    }:
        report.violation(path, "metadata-missing")
    if metadata["application"] is None:
        report.violation(path, "metadata-missing")
    elif str(metadata["application"]).strip("`") != application_revision:
        report.violation(path, "metadata-invalid")

    for line_number, line in enumerate(text.splitlines(), start=1):
        match = SENSITIVE_PATTERN.search(line)
        if match and not _is_placeholder(match.group(1)):
            report.violation(f"{path}:{line_number}", "sensitive-example")


def _is_placeholder(value: str) -> bool:
    lowered = value.casefold()
    markers = (
        "<",
        ">",
        "${",
        "example",
        "exemplo",
        "sintet",
        "fict",
        "placeholder",
        "changeme",
        "change-me",
        "troque",
        "defina",
        "your-",
        "seu-",
    )
    return lowered in {"password", "senha", "token", "secret"} or any(
        marker in lowered for marker in markers
    )


def _normalise_link_path(origin: str, path: str, location: str, report: Report) -> str | None:
    if not path:
        return origin
    if "\\" in path or path.startswith("/") or re.match(r"^[A-Za-z]:", path):
        report.violation(location, "path-invalid")
        return None
    pieces: list[str] = []
    base = list(PurePosixPath(origin).parent.parts)
    for part in base + path.split("/"):
        if part in {"", "."}:
            continue
        if part == "..":
            if not pieces:
                report.violation(location, "path-invalid")
                return None
            pieces.pop()
        else:
            pieces.append(part)
    return "/".join(pieces)


def _extract_markdown_links(text: str) -> list[tuple[str, int]]:
    visible = _mask_fenced_code(text)
    links: list[tuple[str, int]] = []
    cursor = 0
    while True:
        marker = visible.find(MARKDOWN_LINK_MARKER, cursor)
        if marker < 0:
            break
        label_start = visible.rfind("[", max(0, marker - 2048), marker)
        if label_start < 0 or label_start == 0:
            cursor = marker + 2
            continue
        position = marker + len(MARKDOWN_LINK_MARKER)
        if position >= len(visible):
            break
        if visible[position] == "<":
            end = visible.find(">", position + 1)
            if end < 0:
                cursor = position
                continue
            raw = text[position + 1 : end]
            cursor = end + 1
        else:
            depth = 0
            end = position
            while end < len(visible):
                character = visible[end]
                if character == "\\":
                    end += 2
                    continue
                if character == "(":
                    depth += 1
                elif character == ")":
                    if depth == 0:
                        break
                    depth -= 1
                end += 1
            if end >= len(visible):
                cursor = position
                continue
            raw = text[position:end].strip().split()[0] if text[position:end].strip() else ""
            cursor = end + 1
        if raw:
            links.append((raw, visible.count("\n", 0, marker) + 1))
    return links


def _extract_html_links(text: str) -> list[tuple[str, int]]:
    visible = _mask_fenced_code(text)
    links: list[tuple[str, int]] = []
    pattern = re.compile(r"<a\b[^>]*\bhref\s*=\s*(['\"])(.*?)\1", re.IGNORECASE)
    for match in pattern.finditer(visible):
        links.append((match.group(2), visible.count("\n", 0, match.start()) + 1))
    return links


def _validate_git_link(
    parsed_path: str, location: str, repository: Path, wiki: Path, report: Report
) -> None:
    try:
        decoded = unquote(parsed_path)
    except UnicodeDecodeError:
        report.violation(location, "link-invalid")
        return
    pieces = decoded.strip("/").split("/")
    if len(pieces) < 5 or pieces[2] != "blob":
        return
    owner, repository_name, revision = pieces[0], pieces[1], pieces[3]
    relative = "/".join(pieces[4:])
    if (owner, repository_name) == APP_REPOSITORY:
        if not SHA_PATTERN.fullmatch(revision):
            report.violation(location, "git-link-broken")
            return
        if _safe_relative(relative, location, report) is None:
            return
        _git_object_exists(repository, revision, relative, location, report)
    elif (owner, repository_name) == WIKI_REPOSITORY:
        if not SHA_PATTERN.fullmatch(revision):
            report.violation(location, "git-link-broken")
            return
        if _safe_relative(relative, location, report) is None:
            return
        _git_object_exists(wiki, revision, relative, location, report)


def _validate_links(
    page_text: dict[str, str], repository: Path, wiki: Path, report: Report
) -> None:
    for origin, text in page_text.items():
        for destination, line_number in _extract_markdown_links(text) + _extract_html_links(text):
            location = f"{origin}:{line_number}"
            if not destination or destination.startswith("//"):
                report.violation(location, "link-invalid")
                continue
            parsed = urlsplit(destination)
            if parsed.scheme or parsed.netloc:
                if parsed.scheme.casefold() not in {"http", "https"}:
                    report.violation(location, "link-scheme")
                    continue
                if parsed.username or parsed.password:
                    report.violation(location, "link-invalid")
                    continue
                if parsed.scheme.casefold() != "https":
                    report.violation(location, "link-scheme")
                if parsed.hostname and parsed.hostname.casefold() == "github.com":
                    _validate_git_link(parsed.path, location, repository, wiki, report)
                continue
            try:
                decoded_path = unquote(parsed.path)
                fragment = unquote(parsed.fragment)
            except UnicodeDecodeError:
                report.violation(location, "link-invalid")
                continue
            target = _normalise_link_path(origin, decoded_path, location, report)
            if target is None:
                continue
            target_path = _resolve_under(wiki, target, location, report)
            if target_path is None:
                continue
            if not target_path.is_file():
                report.violation(location, "link-broken")
                continue
            if fragment:
                target_text = _read_utf8(target_path, target, report)
                if target_text is None:
                    continue
                _, anchors = _headings(target_text)
                if fragment.casefold() not in anchors:
                    report.violation(location, "fragment-missing")


def _load_manifest(path: Path, report: Report) -> object | None:
    try:
        content = path.read_text(encoding="utf-8")
        return json.loads(content)
    except (OSError, UnicodeError, json.JSONDecodeError):
        report.fatal("manifest.json", "manifest-unreadable")
        return None


def _section_body(text: str, section: str) -> str | None:
    lines = text.splitlines(keepends=True)
    headings: list[tuple[int, int, str]] = []
    fence: tuple[str, int] | None = None
    for index, line in enumerate(lines):
        content = line.rstrip("\r\n")
        fence_match = FENCE_PATTERN.match(content)
        if fence is not None:
            character, minimum = fence
            if re.fullmatch(rf" {{0,3}}{re.escape(character)}{{{minimum},}}[ \t]*", content):
                fence = None
            continue
        if fence_match:
            fence = (fence_match.group(1)[0], len(fence_match.group(1)))
            continue
        heading_match = HEADING_PATTERN.match(content)
        if heading_match:
            headings.append(
                (index, len(heading_match.group(1)), heading_match.group(2).strip())
            )

    for heading_index, (start, level, title) in enumerate(headings):
        if title.casefold() != section.casefold():
            continue
        end = len(lines)
        for next_start, next_level, _ in headings[heading_index + 1 :]:
            if next_level <= level:
                end = next_start
                break
        return "".join(lines[start + 1 : end])
    return None


def _env_blocks(section_text: str) -> list[str]:
    lines = section_text.splitlines(keepends=True)
    blocks: list[str] = []
    fence: tuple[str, int] | None = None
    current: list[str] | None = None
    for line in lines:
        content = line.rstrip("\r\n")
        fence_match = FENCE_PATTERN.match(content)
        if fence is None:
            if not fence_match:
                continue
            info = fence_match.group(2).strip().casefold()
            if info not in {"", "env", "dotenv", ".env"}:
                fence = (fence_match.group(1)[0], len(fence_match.group(1)))
                current = None
                continue
            fence = (fence_match.group(1)[0], len(fence_match.group(1)))
            current = []
            continue

        character, minimum = fence
        if re.fullmatch(rf" {{0,3}}{re.escape(character)}{{{minimum},}}[ \t]*", content):
            if current is not None:
                blocks.append("".join(current))
            fence = None
            current = None
        elif current is not None:
            current.append(line)
    return blocks


def _parse_env_block(text: str, location: str, report: Report) -> dict[str, str]:
    values: dict[str, str] = {}
    for line_number, line in enumerate(text.splitlines(), start=1):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        match = ENV_ASSIGNMENT_PATTERN.match(line)
        if match is None:
            report.violation(f"{location}:{line_number}", "compose-env-line-invalid")
            continue
        name, value = match.groups()
        if name in values:
            report.violation(f"{location}:{line_number}", "compose-variable-duplicate")
            continue
        values[name] = value.strip()
    return values


def _compose_variables(text: str) -> dict[str, bool]:
    variables: dict[str, bool] = {}
    for match in COMPOSE_VARIABLE_PATTERN.finditer(text):
        name, suffix = match.groups()
        operator = suffix[:2] if suffix.startswith(":") else suffix[:1]
        required = operator in {"", "?", ":?"}
        variables[name] = variables.get(name, False) or required
    return variables


def _isolated_compose_environment(variable_names: set[str]) -> dict[str, str]:
    environment = os.environ.copy()
    for name in variable_names:
        environment.pop(name, None)
    for name in (
        "COMPOSE_FILE",
        "COMPOSE_ENV_FILES",
        "COMPOSE_PATH_SEPARATOR",
        "COMPOSE_PROJECT_NAME",
        "COMPOSE_PROFILES",
        "DOCKER_CONFIG",
        "DOCKER_CONTEXT",
        "DOCKER_HOST",
    ):
        environment.pop(name, None)
    return environment


def _compose_infrastructure_failure(stderr: str) -> bool:
    lowered = stderr.casefold()
    return any(
        marker in lowered
        for marker in (
            "cannot connect to the docker daemon",
            "is the docker daemon running",
            "error during connect",
            "docker_engine",
            "docker endpoint",
            "is not a docker command",
            "unknown command",
        )
    )


def _run_compose_config(
    command: list[str],
    repository: Path,
    environment: dict[str, str],
    runner: Callable[..., subprocess.CompletedProcess[str]],
    report: Report,
    location: str,
) -> None:
    try:
        result = runner(
            command,
            cwd=repository,
            env=environment,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            shell=False,
        )
    except (FileNotFoundError, OSError):
        report.fatal(location, "tool-unavailable")
        return
    if result.returncode == 0:
        return
    stderr = result.stderr if isinstance(result.stderr, str) else ""
    if _compose_infrastructure_failure(stderr):
        report.fatal(location, "compose-unavailable")
    else:
        report.violation(location, "compose-config-invalid")


def validate_compose(
    repository: Path,
    wiki: Path,
    manifest_path: Path,
    *,
    runner: Callable[..., subprocess.CompletedProcess[str]] | None = None,
) -> Report:
    report = Report()
    if not repository.is_dir() or not wiki.is_dir():
        report.fatal("input", "source-unreadable")
        return report
    manifest = _load_manifest(manifest_path, report)
    if manifest is None:
        return report
    validated = _validate_manifest_structure(manifest, repository, report)
    if validated is None or report.violations or report.infrastructure:
        return report

    examples = validated.get("exemplosCompose")
    if not isinstance(examples, list) or not examples:
        report.violation("manifest.json.exemplosCompose", "compose-examples-missing")
        return report

    pages = validated.get("paginas", [])
    process_runner = runner or subprocess.run
    for index, example in enumerate(examples):
        location = f"manifest.json.exemplosCompose[{index}]"
        if not isinstance(example, dict):
            continue
        section = example.get("secao")
        compose_relative = example.get("arquivo")
        if not isinstance(section, str) or not isinstance(compose_relative, str):
            continue

        matches = [
            page
            for page in pages
            if isinstance(page, dict)
            and isinstance(page.get("secoes"), list)
            and section in page["secoes"]
        ]
        if not matches:
            report.violation(location, "compose-section-missing")
            continue
        if len(matches) > 1:
            report.violation(location, "compose-section-ambiguous")
            continue
        page_path = matches[0].get("caminho")
        if not isinstance(page_path, str):
            report.violation(location, "compose-page-invalid")
            continue
        page_file = _resolve_under(wiki, page_path, f"{location}.secao", report)
        compose_file = _resolve_under(repository, compose_relative, f"{location}.arquivo", report)
        if page_file is None or compose_file is None:
            continue
        page_text = _read_utf8(page_file, page_path, report)
        compose_text = _read_utf8(compose_file, compose_relative, report)
        if page_text is None or compose_text is None:
            continue
        example_violations = len(report.violations)
        section_text = _section_body(page_text, section)
        if section_text is None:
            report.violation(location, "compose-section-missing")
            continue
        blocks = _env_blocks(section_text)
        if len(blocks) != 1:
            rule = "compose-env-block-missing" if not blocks else "compose-env-block-ambiguous"
            report.violation(location, rule)
            continue
        values = _parse_env_block(blocks[0], location, report)
        variables = _compose_variables(compose_text)
        missing = [
            name
            for name, required in variables.items()
            if required and (name not in values or not values[name])
        ]
        for _ in missing:
            report.violation(location, "compose-variable-missing")
        if set(values) - set(variables):
            report.violation(location, "compose-variable-unknown")
        if len(report.violations) != example_violations:
            continue

        with tempfile.TemporaryDirectory(prefix="labon-compose-") as temporary:
            env_file = Path(temporary) / "example.env"
            env_file.write_text(
                "".join(f"{name}={value}\n" for name, value in values.items()),
                encoding="utf-8",
                newline="\n",
            )
            command = [
                "docker",
                "compose",
                "--env-file",
                str(env_file),
                "-f",
                str(compose_file),
                "config",
                "--quiet",
            ]
            _run_compose_config(
                command,
                repository,
                _isolated_compose_environment(set(variables)),
                process_runner,
                report,
                location,
            )
            if report.infrastructure:
                break
    return report


def validate_editorial(repository: Path, wiki: Path, manifest_path: Path) -> Report:
    report = Report()
    if not repository.is_dir() or not wiki.is_dir():
        report.fatal("input", "source-unreadable")
        return report
    manifest = _load_manifest(manifest_path, report)
    if manifest is None:
        return report
    validated = _validate_manifest_structure(manifest, repository, report)
    if validated is None:
        return report
    application_revision = validated.get("referenciaAplicacao")
    wiki_revision = validated.get("referenciaWiki")
    for source, location in ((repository, "repository"), (wiki, "wiki")):
        git_check = _run_git(source, ["rev-parse", "--is-inside-work-tree"], report, location)
        if git_check is not None and git_check[0] != 0:
            report.fatal(location, "git-unavailable")
    _validate_git_revision(repository, application_revision, "referenciaAplicacao", report)
    _validate_git_revision(wiki, wiki_revision, "referenciaWiki", report)
    pages = validated.get("paginas", [])
    page_text: dict[str, str] = {}
    if isinstance(pages, list):
        if isinstance(wiki_revision, str) and SHA_PATTERN.fullmatch(wiki_revision):
            _git_pages_exist(wiki, wiki_revision, pages, report)
        for index, page in enumerate(pages):
            if not isinstance(page, dict):
                continue
            relative = page.get("caminho")
            if not isinstance(relative, str) or _safe_relative(relative, f"paginas[{index}]", report) is None:
                continue
            path = _resolve_under(wiki, relative, relative, report)
            if path is None:
                continue
            if not path.exists() or not path.is_file():
                report.violation(relative, "page-missing")
                continue
            text = _read_utf8(path, relative, report)
            if text is None:
                continue
            page_text[relative] = text
            if isinstance(application_revision, str):
                _validate_page_content(page, relative, text, application_revision, report)
    _validate_links(page_text, repository, wiki, report)
    return report


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", required=True, help="raiz do repositório da aplicação")
    parser.add_argument("--wiki", required=True, help="raiz do checkout da Wiki")
    parser.add_argument("--manifest", required=True, help="manifesto documental")
    parser.add_argument("--mode", choices=("editorial", "compose"), required=True)
    return parser


def _cli_path(value: str, label: str, report: Report) -> Path | None:
    try:
        path = Path(value).resolve()
    except (OSError, RuntimeError):
        report.fatal(label, "path-invalid")
        return None
    if not path.exists():
        report.fatal(label, "source-unreadable")
        return None
    return path


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    report = Report()
    repository = _cli_path(args.repository, "repository", report)
    wiki = _cli_path(args.wiki, "wiki", report)
    manifest_path = _cli_path(args.manifest, "manifest", report)
    if repository is None or wiki is None or manifest_path is None:
        for diagnostic in report.infrastructure + report.violations:
            print(diagnostic)
        return report.exit_code
    try:
        manifest_path.relative_to(repository)
    except ValueError:
        report.fatal("manifest", "path-invalid")
    if not manifest_path.is_file():
        report.fatal("manifest", "source-unreadable")
    if report.infrastructure:
        for diagnostic in report.infrastructure + report.violations:
            print(diagnostic)
        return report.exit_code
    if args.mode == "compose":
        report = validate_compose(repository, wiki, manifest_path)
    else:
        report = validate_editorial(repository, wiki, manifest_path)
    for diagnostic in report.infrastructure + report.violations:
        print(diagnostic)
    return report.exit_code


if __name__ == "__main__":
    raise SystemExit(main())
