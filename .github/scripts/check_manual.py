"""Validate the local editorial contract for the LabOn user manual."""

from __future__ import annotations

import argparse
import datetime as date
import ipaddress
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path, PurePosixPath
from urllib.parse import parse_qsl, unquote, urljoin, urlsplit, urlunsplit


SCHEMA_VERSION = 1
CONTROL_FILES = frozenset({"manual.json", "manutencao.md"})
PUBLISHABLE_PAGE_SUFFIX = ".md"
IMAGE_SUFFIX = ".png"
MANIFEST_METADATA_FIELDS = ("versaoManual", "produtoValidado", "atualizadoEm", "responsavelRevisao")
CONTROL_FILE_KEYS = frozenset(name.casefold() for name in CONTROL_FILES)
PROFILES = frozenset({"Administrador", "Mentor", "Mentorado"})
EXPECTED_VARIANTS = {
    "J01": frozenset(PROFILES),
    "J02": frozenset({"Mentor", "Mentorado"}),
    "J03": frozenset({"Administrador", "Mentor"}),
    "J04": frozenset(PROFILES),
    "J05": frozenset(PROFILES),
    "J06": frozenset({"Administrador"}),
    "J07": frozenset(PROFILES),
    "J08": frozenset({"Mentor", "Mentorado"}),
    "J09": frozenset({"Administrador"}),
    "J10": frozenset(PROFILES),
    "J11": frozenset(PROFILES),
}
OPERATIONAL_LABELS = (
    "Quem pode executar",
    "Pré-requisitos",
    "Onde começar",
    "Passos",
    "Resultado esperado",
    "Erros comuns",
    "Saída segura",
)
METADATA_LABELS = {
    "versaoManual": "Versão do manual",
    "produtoValidado": "Produto validado",
    "atualizadoEm": "Atualizado em",
    "responsavelRevisao": "Responsável pela revisão",
}
VERSION_PATTERN = re.compile(r"^(\d{4}-\d{2}-\d{2})\.(\d+)$")
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ANCHOR_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
JOURNEY_PATTERN = re.compile(r"^J(?:0[1-9]|1[01])$")
EXPLICIT_ANCHOR_PATTERN = re.compile(
    r"<a\s+id\s*=\s*(['\"])([^'\"]*)\1\s*>\s*</a>", re.IGNORECASE
)
HTML_TAG_PATTERN = re.compile(r"</?[A-Za-z][^>\r\n]*>|<![^>\r\n]*>|<\?[^>\r\n]*>")
REFERENCE_LINK_PATTERN = re.compile(r"!?\[[^\]\r\n]+\]\s*\[[^\]\r\n]*\]")
REFERENCE_DEFINITION_PATTERN = re.compile(r"^\s{0,3}\[[^\]\r\n]+\]:\s*\S+.*$", re.MULTILINE)
EXTERNAL_TIMEOUT_SECONDS = 10
EXTERNAL_MAX_ATTEMPTS = 2
EXTERNAL_MAX_REDIRECTS = 5
EXTERNAL_GET_LIMIT = 4096
REDIRECT_STATUSES = frozenset({301, 302, 303, 307, 308})
HEAD_NOT_ALLOWED_STATUSES = frozenset({405, 501})
RECOVERY_URL_PATTERN = re.compile(
    r"(?:forgot|recover|recovery|reset|redefin|recuper)", re.IGNORECASE
)
RECOVERY_QUERY_KEYS = frozenset(
    {"token", "access_token", "reset_token", "recovery_token", "password_reset"}
)
NON_PUBLIC_HOST_SUFFIXES = frozenset(
    {"localhost", "local", "internal", "intranet", "test", "invalid", "example"}
)
INSTITUTIONAL_HOST_MARKERS = frozenset(
    {"institucional", "institution", "intranet", "internal", "private", "privado", "labon", "lab-solos"}
)


class ManualInputError(Exception):
    """An invalid CLI input or unreadable source, mapped to exit code 2."""


def _display(value: object) -> str:
    """Return a bounded, single-line diagnostic location without content values."""

    text = str(value).replace("\r", " ").replace("\n", " ").replace("\x00", " ")
    return text[:160] or "<entrada>"


def _issue(location: object, rule: str) -> str:
    return f"{_display(location)}: {rule}"


def _required_mapping(value: object, location: str, errors: list[str]) -> dict:
    if not isinstance(value, dict):
        errors.append(_issue(location, "deve ser um objeto"))
        return {}
    return value


def _required_text(mapping: dict, field: str, location: str, errors: list[str]) -> str | None:
    value = mapping.get(field)
    if not isinstance(value, str) or not value.strip():
        errors.append(_issue(f"{location}.{field}", "campo textual obrigatório inválido"))
        return None
    return value.strip()


def _manifest_relative_path(value: object, location: str, errors: list[str]) -> str | None:
    if not isinstance(value, str) or not value.strip():
        errors.append(_issue(location, "caminho relativo obrigatório inválido"))
        return None
    value = value.strip()
    posix_path = PurePosixPath(value)
    parts = value.split("/")
    if (
        "\\" in value
        or "\x00" in value
        or re.match(r"^[A-Za-z]:", value)
        or posix_path.is_absolute()
        or any(part in {"", ".", ".."} for part in parts)
    ):
        errors.append(_issue(location, "caminho deve permanecer relativo à fonte"))
        return None
    return value


def _actual_files(source: Path, errors: list[str]) -> dict[str, Path]:
    files: dict[str, Path] = {}
    root = source.resolve()
    try:
        candidates = list(root.rglob("*"))
    except OSError:
        errors.append(_issue("source", "não foi possível inventariar os arquivos"))
        return files

    for candidate in candidates:
        try:
            is_link = candidate.is_symlink()
            is_file = candidate.is_file()
        except OSError:
            errors.append(_issue("source", "não foi possível ler um arquivo"))
            continue
        if is_link:
            errors.append(_issue("source", "links simbólicos não são permitidos na fonte"))
            continue
        if not is_file:
            continue
        relative = candidate.relative_to(root).as_posix()
        files[relative] = candidate
    return files


def _read_utf8(path: Path, location: str, errors: list[str]) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeError):
        errors.append(_issue(location, "arquivo não pode ser lido como UTF-8"))
        return None


def _validate_metadata(manifest: dict, pages: list[dict], page_text: dict[str, str], errors: list[str]) -> None:
    metadata: dict[str, str] = {}
    for field in MANIFEST_METADATA_FIELDS:
        value = _required_text(manifest, field, "manual.json", errors)
        if value is not None:
            metadata[field] = value

    version = metadata.get("versaoManual")
    if version is not None:
        match = VERSION_PATTERN.fullmatch(version)
        if not match or not match.group(2).strip("0"):
            errors.append(_issue("manual.json.versaoManual", "deve usar AAAA-MM-DD.N com N positivo"))
        elif not _valid_date(match.group(1)):
            errors.append(_issue("manual.json.versaoManual", "contém uma data inválida"))

    updated = metadata.get("atualizadoEm")
    if updated is not None and (not DATE_PATTERN.fullmatch(updated) or not _valid_date(updated)):
        errors.append(_issue("manual.json.atualizadoEm", "deve ser uma data ISO válida"))

    reviewer = metadata.get("responsavelRevisao", "")
    if reviewer.casefold() in {"não definido", "nao definido", "n/a", "none"}:
        errors.append(_issue("manual.json.responsavelRevisao", "responsável efetivo é obrigatório"))

    for page in pages:
        origin = page.get("origem")
        if not isinstance(origin, str) or origin not in page_text:
            continue
        text = page_text[origin]
        for field, label in METADATA_LABELS.items():
            value = _metadata_value(text, label)
            if value is None:
                errors.append(_issue(origin, f"metadado visível ausente: {field}"))
            elif field in metadata and value != metadata[field]:
                errors.append(_issue(origin, f"metadado visível divergente: {field}"))


def _valid_date(value: str) -> bool:
    try:
        date.date.fromisoformat(value)
    except ValueError:
        return False
    return True


def _metadata_value(text: str, label: str) -> str | None:
    pattern = re.compile(
        rf"^\s*(?:\*\*)?{re.escape(label)}(?:\*\*)?\s*:\s*`?([^`\r\n]+?)`?\s*$",
        re.IGNORECASE | re.MULTILINE,
    )
    match = pattern.search(text)
    return match.group(1).strip() if match else None


def _blank_non_newlines(value: str) -> str:
    return "".join(char if char in "\r\n" else " " for char in value)


def _mask_fenced_code(text: str) -> tuple[str, bool]:
    """Blank fenced code while keeping offsets and line boundaries stable."""

    masked: list[str] = []
    fence: tuple[str, int] | None = None
    for line in text.splitlines(keepends=True):
        content = line.rstrip("\r\n")
        fence_match = re.match(r"^ {0,3}(`{3,}|~{3,})", content)
        if fence is not None:
            masked.append(_blank_non_newlines(line))
            character, minimum_length = fence
            if re.fullmatch(rf" {{0,3}}{re.escape(character)}{{{minimum_length},}}[ \t]*", content):
                fence = None
            continue
        if fence_match:
            marker = fence_match.group(1)
            fence = (marker[0], len(marker))
            masked.append(_blank_non_newlines(line))
        else:
            masked.append(line)
    return "".join(masked), fence is not None


def _mask_inline_code(text: str) -> tuple[str, bool]:
    """Blank backtick code spans and report an unterminated span."""

    characters = list(text)
    index = 0
    unterminated = False
    while index < len(text):
        if text[index] != "`":
            index += 1
            continue
        start = index
        while index < len(text) and text[index] == "`":
            index += 1
        length = index - start
        closing = text.find("`" * length, index)
        if closing < 0:
            unterminated = True
            for position in range(start, len(text)):
                if text[position] not in "\r\n":
                    characters[position] = " "
            break
        for position in range(start, closing + length):
            if text[position] not in "\r\n":
                characters[position] = " "
        index = closing + length
    return "".join(characters), unterminated


def _collect_explicit_anchors(text: str, origin: str, errors: list[str]) -> tuple[set[str], str]:
    anchors: set[str] = set()
    cleaned = list(text)
    for match in EXPLICIT_ANCHOR_PATTERN.finditer(text):
        anchor = match.group(2)
        if not ANCHOR_PATTERN.fullmatch(anchor):
            errors.append(_issue(origin, "âncora explícita deve usar minúsculas ASCII e hífens"))
        else:
            key = anchor.casefold()
            if key in anchors:
                errors.append(_issue(origin, "âncora explícita duplicada"))
            anchors.add(key)
        for position in range(match.start(), match.end()):
            if text[position] not in "\r\n":
                cleaned[position] = " "
    return anchors, "".join(cleaned)


def _masked_markdown(text: str, origin: str, errors: list[str]) -> str:
    masked, unclosed_fence = _mask_fenced_code(text)
    if unclosed_fence:
        errors.append(_issue(origin, "bloco de código cercado não encerrado"))
    masked, unclosed_span = _mask_inline_code(masked)
    if unclosed_span:
        errors.append(_issue(origin, "código inline não encerrado"))
    return masked


def _prepare_page(text: str, origin: str, errors: list[str]) -> tuple[set[str], str]:
    masked = _masked_markdown(text, origin, errors)
    return _collect_explicit_anchors(masked, origin, errors)


def _find_destination_end(text: str, start: int) -> int | None:
    depth = 0
    for index in range(start, len(text)):
        character = text[index]
        if character in "\r\n":
            return None
        if character == "(":
            depth += 1
        elif character == ")":
            if depth == 0:
                return index
            depth -= 1
    return None


def _parse_inline_tokens(text: str, origin: str, errors: list[str]) -> list[tuple[str, str, str]]:
    tokens: list[tuple[str, str, str]] = []
    if REFERENCE_LINK_PATTERN.search(text) or REFERENCE_DEFINITION_PATTERN.search(text):
        errors.append(_issue(origin, "links por referência não são suportados"))
    if HTML_TAG_PATTERN.search(text):
        errors.append(_issue(origin, "HTML ou sintaxe de marcação não suportada"))

    index = 0
    while index < len(text):
        image = text.startswith("![", index)
        if image or text[index] == "[":
            label_start = index + 2 if image else index + 1
            label_end = text.find("]", label_start)
            if label_end >= 0 and label_end + 1 < len(text) and text[label_end + 1] == "(":
                destination_start = label_end + 2
                destination_end = _find_destination_end(text, destination_start)
                if destination_end is None:
                    errors.append(_issue(origin, "link inline não encerrado"))
                    index = destination_start
                    continue
                destination = text[destination_start:destination_end]
                if not destination or any(character.isspace() for character in destination):
                    errors.append(_issue(origin, "destino inline não pode ser vazio ou conter espaços"))
                else:
                    tokens.append(("image" if image else "link", text[label_start:label_end], destination))
                index = destination_end + 1
                continue
        index += 1
    return tokens


def _decode_url_part(value: str) -> str:
    return unquote(value, encoding="utf-8", errors="strict")


def _canonical_external_url(destination: str) -> str:
    parsed = urlsplit(destination)
    hostname = parsed.hostname or ""
    try:
        port = parsed.port
    except ValueError:
        return urlunsplit(("https", parsed.netloc.casefold(), parsed.path or "", parsed.query, ""))
    netloc = hostname.casefold()
    if ":" in netloc and not netloc.startswith("["):
        netloc = f"[{netloc}]"
    if port is not None and port != 443:
        netloc = f"{netloc}:{port}"
    return urlunsplit(("https", netloc, parsed.path or "", parsed.query, ""))


def _external_url_error(destination: str) -> str | None:
    """Return a safe diagnostic rule when an external URL must not be fetched."""

    if any(character.isspace() for character in destination):
        return "URL externa possui sintaxe inválida"
    try:
        parsed = urlsplit(destination)
        hostname = parsed.hostname
        port = parsed.port
    except ValueError:
        return "URL externa possui sintaxe inválida"
    if parsed.scheme.casefold() != "https":
        return "links externos devem usar HTTPS"
    if not hostname or parsed.username is not None or parsed.password is not None or "@" in parsed.netloc:
        return "URL externa não pode conter credenciais"
    if port is not None and not 1 <= port <= 65535:
        return "URL externa possui porta inválida"

    host = hostname.rstrip(".").casefold()
    try:
        host_for_policy = host.encode("idna").decode("ascii")
    except UnicodeError:
        return "destino externo possui hostname inválido"
    try:
        address = ipaddress.ip_address(host_for_policy)
    except ValueError:
        address = None
    if address is not None and not address.is_global:
        return "destino externo não é público"
    labels = host_for_policy.split(".")
    if not host_for_policy or len(labels) < 2:
        return "destino externo não é público"
    if labels[-1] in NON_PUBLIC_HOST_SUFFIXES:
        return "destino externo não é público"
    if any(marker in label for label in labels for marker in INSTITUTIONAL_HOST_MARKERS):
        return "destino institucional não é verificado"

    try:
        path = _decode_url_part(parsed.path).casefold()
        query = _decode_url_part(parsed.query).casefold()
    except UnicodeDecodeError:
        return "URL externa possui percent-encoding inválido"
    if RECOVERY_URL_PATTERN.search(path):
        return "URLs de recuperação não são verificadas"
    try:
        query_keys = {key.casefold() for key, _ in parse_qsl(query, keep_blank_values=True)}
    except ValueError:
        return "URL externa possui consulta inválida"
    if query_keys & RECOVERY_QUERY_KEYS:
        return "URLs de recuperação não são verificadas"
    return None


def _resolve_local_destination(
    destination: str, origin: str, source: Path, errors: list[str]
) -> tuple[str, str] | None:
    try:
        parsed = urlsplit(destination)
    except ValueError:
        errors.append(_issue(origin, "destino de link possui URL inválida"))
        return None
    if parsed.scheme:
        if parsed.scheme.casefold() != "https":
            errors.append(_issue(origin, "links externos devem usar HTTPS"))
        return None
    if parsed.netloc:
        errors.append(_issue(origin, "destino de link não pode usar caminho local ou URL relativa à rede"))
        return None
    if parsed.query:
        errors.append(_issue(origin, "destinos locais não podem conter consulta"))
        return None
    try:
        decoded_path = _decode_url_part(parsed.path)
        fragment = _decode_url_part(parsed.fragment)
    except UnicodeDecodeError:
        errors.append(_issue(origin, "destino de link possui percent-encoding inválido"))
        return None
    if "\\" in destination or "\\" in decoded_path or "\x00" in decoded_path:
        errors.append(_issue(origin, "destino de link deve permanecer relativo à raiz da fonte"))
        return None
    if destination.endswith("#") or ("#" in destination and not fragment):
        errors.append(_issue(origin, "fragmento local não pode ser vazio"))
        return None
    if decoded_path.startswith("/") or re.match(r"^[A-Za-z]:", decoded_path):
        errors.append(_issue(origin, "destino de link não pode ser caminho absoluto"))
        return None

    root = source.resolve()
    candidate_path = root / Path(origin) if not decoded_path else root / Path(origin).parent / decoded_path
    candidate = candidate_path.resolve()
    try:
        relative = candidate.relative_to(root).as_posix()
    except ValueError:
        errors.append(_issue(origin, "destino de link escapa da raiz da fonte"))
        return None
    return relative, fragment


def _validate_markdown_links(
    manifest: dict, page_text: dict[str, str], source: Path, errors: list[str]
) -> dict[str, str]:
    """Validate the deliberately small, local Markdown subset used by the manual."""

    image_inventory = {
        image.get("arquivo")
        for image in manifest.get("imagens", [])
        if isinstance(image, dict) and isinstance(image.get("arquivo"), str)
    }
    anchors_by_page: dict[str, set[str]] = {}
    links_by_page: dict[str, set[str]] = {origin: set() for origin in page_text}
    external_urls: dict[str, str] = {}

    masked_pages: dict[str, str] = {}
    for origin, text in page_text.items():
        anchors, masked = _prepare_page(text, origin, errors)
        anchors_by_page[origin] = anchors
        masked_pages[origin] = masked

    for origin, masked in masked_pages.items():
        for kind, alt, destination in _parse_inline_tokens(masked, origin, errors):
            if kind == "image" and not alt.strip():
                errors.append(_issue(origin, "imagem inline deve ter alt não vazio"))
            try:
                parsed = urlsplit(destination)
            except ValueError:
                errors.append(_issue(origin, "destino de link possui URL inválida"))
                continue
            if parsed.scheme:
                if parsed.scheme.casefold() == "https":
                    if not parsed.netloc or "@" in parsed.netloc:
                        errors.append(_issue(origin, "URL HTTPS não pode conter credenciais"))
                    if kind == "image":
                        errors.append(_issue(origin, "imagem deve apontar para uma imagem inventariada local"))
                    elif parsed.netloc and "@" not in parsed.netloc:
                        try:
                            external_urls.setdefault(_canonical_external_url(destination), origin)
                        except ValueError:
                            pass
                else:
                    errors.append(_issue(origin, "links externos devem usar HTTPS"))
                continue
            if kind == "image" and parsed.fragment:
                errors.append(_issue(origin, "imagem local não pode conter fragmento"))
            resolved = _resolve_local_destination(destination, origin, source, errors)
            if resolved is None:
                continue
            target, fragment = resolved
            if kind == "image":
                image_path = source / Path(target)
                if target not in image_inventory:
                    errors.append(_issue(origin, "imagem usada não está no inventário"))
                if not image_path.is_file():
                    errors.append(_issue(origin, "imagem usada não existe"))
                continue
            if target not in page_text:
                errors.append(_issue(origin, "link local aponta para página inexistente ou não inventariada"))
                continue
            links_by_page[origin].add(target)
            if fragment and fragment.casefold() not in anchors_by_page.get(target, set()):
                errors.append(_issue(origin, "link local aponta para fragmento ou âncora inexistente"))

    if "README.md" in page_text:
        reachable = {"README.md"}
        pending = ["README.md"]
        while pending:
            current = pending.pop()
            for target in links_by_page.get(current, set()):
                if target not in reachable:
                    reachable.add(target)
                    pending.append(target)
        for origin in page_text:
            if origin not in reachable:
                errors.append(_issue(origin, "página funcional órfã; não é alcançável pelo índice"))
        for origin in page_text:
            if origin != "README.md" and "README.md" not in links_by_page[origin]:
                errors.append(_issue(origin, "página funcional deve oferecer retorno ao índice"))
    return external_urls


class _NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def _return_response(self, request, response, code, message, headers):
        return response

    http_error_301 = _return_response
    http_error_302 = _return_response
    http_error_303 = _return_response
    http_error_307 = _return_response
    http_error_308 = _return_response


def _default_transport(method: str, url: str, timeout: int, headers: dict[str, str]):
    request = urllib.request.Request(url, headers=headers, method=method)
    opener = urllib.request.build_opener(_NoRedirectHandler())
    try:
        return opener.open(request, timeout=timeout)
    except urllib.error.HTTPError as exc:
        return exc


def _close_response(response: object) -> None:
    close = getattr(response, "close", None)
    if close is not None:
        try:
            close()
        except OSError:
            pass


def _response_status(response: object) -> int:
    status = getattr(response, "status", None)
    if status is None:
        getcode = getattr(response, "getcode", None)
        status = getcode() if getcode is not None else None
    if not isinstance(status, int):
        raise ValueError("resposta HTTP sem status")
    return status


def _response_header(response: object, name: str) -> str | None:
    headers = getattr(response, "headers", None)
    if headers is not None:
        get = getattr(headers, "get", None)
        if get is not None:
            value = get(name)
            if value is not None:
                return str(value)
        items = getattr(headers, "items", None)
        if items is not None:
            for key, value in items():
                if str(key).casefold() == name.casefold():
                    return str(value)
    getheader = getattr(response, "getheader", None)
    if getheader is not None:
        value = getheader(name)
        if value is not None:
            return str(value)
    return None


def _call_transport(transport, method: str, url: str, headers: dict[str, str]):
    if transport is None:
        return _default_transport(method, url, EXTERNAL_TIMEOUT_SECONDS, headers)
    request = getattr(transport, "request", None)
    if request is not None:
        return request(method, url, EXTERNAL_TIMEOUT_SECONDS, headers)
    return transport(method, url, EXTERNAL_TIMEOUT_SECONDS, headers)


def _request_with_retries(
    method: str, url: str, headers: dict[str, str], transport
) -> tuple[object | None, str | None]:
    for attempt in range(EXTERNAL_MAX_ATTEMPTS):
        try:
            response = _call_transport(transport, method, url, headers)
            status = _response_status(response)
        except (TimeoutError, OSError, urllib.error.URLError):
            if attempt + 1 < EXTERNAL_MAX_ATTEMPTS:
                continue
            return None, "falha transitória de transporte"
        if status in {408, 429} or 500 <= status <= 599:
            _close_response(response)
            if attempt + 1 < EXTERNAL_MAX_ATTEMPTS:
                continue
            return None, f"resposta HTTP {status} indisponível"
        return response, None
    return None, "falha transitória de transporte"


def _classify_response(response: object) -> tuple[str, str | None]:
    status = _response_status(response)
    if status in REDIRECT_STATUSES:
        return "redirect", None
    if status in {401, 403} or _response_header(response, "WWW-Authenticate"):
        return "inconclusive", "destino exige autenticação"
    if status in {404, 410}:
        return "error", f"resposta HTTP {status} indica link inválido"
    if 200 <= status < 400:
        return "ok", None
    if 400 <= status < 500:
        return "error", f"resposta HTTP {status} indica link inválido"
    return "error", f"resposta HTTP {status} indica link inválido"


def _verify_external_link(url: str, origin: str, transport) -> tuple[str, str]:
    current_url = url
    redirects = 0
    while True:
        policy_error = _external_url_error(current_url)
        if policy_error is not None:
            return "error", policy_error

        response, failure = _request_with_retries("HEAD", current_url, {}, transport)
        if response is None:
            return "inconclusive", failure or "falha externa inconclusiva"
        method = "HEAD"
        if _response_status(response) in HEAD_NOT_ALLOWED_STATUSES:
            _close_response(response)
            method = "GET"
            response, failure = _request_with_retries(
                method,
                current_url,
                {"Range": f"bytes=0-{EXTERNAL_GET_LIMIT - 1}"},
                transport,
            )
            if response is None:
                return "inconclusive", failure or "falha externa inconclusiva"

        classification, detail = _classify_response(response)
        if classification == "redirect":
            location = _response_header(response, "Location")
            _close_response(response)
            if not location:
                return "error", "redirecionamento sem destino"
            if redirects >= EXTERNAL_MAX_REDIRECTS:
                return "error", "redirecionamentos excedem o limite permitido"
            next_url = urljoin(current_url, location)
            next_error = _external_url_error(next_url)
            if next_error is not None:
                return "error", next_error
            redirects += 1
            current_url = _canonical_external_url(next_url)
            continue

        if classification == "ok" and method == "GET":
            try:
                response.read(EXTERNAL_GET_LIMIT)
            except (TimeoutError, OSError, urllib.error.URLError):
                _close_response(response)
                return "inconclusive", "falha ao ler resposta limitada"
        _close_response(response)
        return classification, detail or "falha externa inconclusiva"


def _validate_external_links(external_urls: dict[str, str], transport) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    inconclusive: list[str] = []
    for url, origin in sorted(external_urls.items()):
        classification, detail = _verify_external_link(url, origin, transport)
        if classification == "error":
            errors.append(_issue(origin, detail))
        elif classification == "inconclusive":
            inconclusive.append(_issue(origin, f"link externo inconclusivo: {detail}"))
    return errors, inconclusive


def _validate_pages(manifest: dict, files: dict[str, Path], errors: list[str]) -> tuple[list[dict], dict[str, str]]:
    raw_pages = manifest.get("paginas")
    if not isinstance(raw_pages, list) or not raw_pages:
        errors.append(_issue("manual.json.paginas", "lista ordenada obrigatória"))
        return [], {}

    pages: list[dict] = []
    origins: dict[str, str] = {}
    destinations: dict[str, str] = {}
    page_text: dict[str, str] = {}
    for index, raw_page in enumerate(raw_pages):
        location = f"manual.json.paginas[{index}]"
        page = _required_mapping(raw_page, location, errors)
        if not isinstance(raw_page, dict):
            continue
        origin = _manifest_relative_path(page.get("origem"), f"{location}.origem", errors)
        destination = _manifest_relative_path(page.get("destinoWiki"), f"{location}.destinoWiki", errors)
        title = _required_text(page, "titulo", location, errors)
        if origin is None or destination is None:
            continue
        origin_key = origin.casefold()
        destination_key = destination.casefold()
        if origin_key in origins:
            errors.append(_issue(origin, "origem duplicada sem distinção de caixa"))
        else:
            origins[origin_key] = origin
        if destination_key in destinations:
            errors.append(_issue(destination, "destino Wiki duplicado sem distinção de caixa"))
        else:
            destinations[destination_key] = destination

        if not destination.casefold().endswith(".md"):
            errors.append(_issue(destination, "destino Wiki deve ser uma página Markdown"))
        if origin.casefold() in CONTROL_FILE_KEYS or Path(origin).name.casefold() in CONTROL_FILE_KEYS:
            errors.append(_issue(origin, "arquivo de controle não pode ser página publicável"))
        if origin == "README.md" and destination != "Manual-do-Usuario.md":
            errors.append(_issue(origin, "README.md deve mapear para Manual-do-Usuario.md"))
        elif origin != "README.md" and destination != f"Manual-do-Usuario-{Path(origin).stem}.md":
            errors.append(_issue(origin, "destino Wiki não corresponde ao mapa editorial"))

        file_path = files.get(origin)
        if file_path is None:
            errors.append(_issue(origin, "arquivo inventariado não existe"))
            continue
        if Path(origin).suffix.casefold() != PUBLISHABLE_PAGE_SUFFIX:
            errors.append(_issue(origin, "página publicável deve ser Markdown"))
            continue
        text = _read_utf8(file_path, origin, errors)
        if text is None:
            continue
        page_text[origin] = text
        if title is not None:
            h1_titles = re.findall(r"^#\s+(.+?)\s*$", text, re.MULTILINE)
            if len(h1_titles) != 1:
                errors.append(_issue(origin, "deve conter exatamente um título principal"))
            elif h1_titles[0].strip() != title:
                errors.append(_issue(origin, "título principal diverge do manifesto"))
        pages.append(page)

    listed_origins = {origin for origin in origins.values()}
    for filename in files:
        if filename in CONTROL_FILES:
            continue
        if filename.casefold().endswith(PUBLISHABLE_PAGE_SUFFIX) and filename not in listed_origins:
            errors.append(_issue(filename, "arquivo publicável fora do inventário de páginas"))
    return pages, page_text


def _validate_images(manifest: dict, files: dict[str, Path], errors: list[str]) -> None:
    raw_images = manifest.get("imagens")
    if not isinstance(raw_images, list):
        errors.append(_issue("manual.json.imagens", "lista obrigatória"))
        raw_images = []

    listed: set[str] = set()
    for index, raw_image in enumerate(raw_images):
        location = f"manual.json.imagens[{index}]"
        image = _required_mapping(raw_image, location, errors)
        if not isinstance(raw_image, dict):
            continue
        filename = _manifest_relative_path(image.get("arquivo"), f"{location}.arquivo", errors)
        journey = _required_text(image, "jornada", location, errors)
        _required_text(image, "descricao", location, errors)
        product = _required_text(image, "produtoValidado", location, errors)
        privacy = image.get("revisaoPrivacidade")
        privacy = _required_mapping(privacy, f"{location}.revisaoPrivacidade", errors)
        _required_text(privacy, "responsavel", f"{location}.revisaoPrivacidade", errors)
        privacy_date = _required_text(privacy, "data", f"{location}.revisaoPrivacidade", errors)
        if filename is None:
            continue
        filename_key = filename.casefold()
        if filename_key in listed:
            errors.append(_issue(filename, "imagem duplicada sem distinção de caixa"))
        listed.add(filename_key)
        if not filename.casefold().endswith(IMAGE_SUFFIX):
            errors.append(_issue(filename, "imagem deve ser PNG"))
        if not filename.casefold().startswith("imagens/"):
            errors.append(_issue(filename, "imagem deve estar em imagens/"))
        if filename not in files:
            errors.append(_issue(filename, "imagem inventariada não existe"))
        if journey is not None and journey not in EXPECTED_VARIANTS:
            errors.append(_issue(f"{location}.jornada", "jornada de imagem desconhecida"))
        if product is not None and product != manifest.get("produtoValidado"):
            errors.append(_issue(filename, "produto validado da imagem diverge do manifesto"))
        if privacy_date is not None and (not DATE_PATTERN.fullmatch(privacy_date) or not _valid_date(privacy_date)):
            errors.append(_issue(f"{location}.revisaoPrivacidade.data", "deve ser uma data ISO válida"))
    for filename in files:
        if filename.casefold().endswith(IMAGE_SUFFIX) and filename.casefold() not in listed:
            errors.append(_issue(filename, "imagem fora do inventário"))


def _section_body(text: str, anchor: str) -> str | None:
    marker = re.compile(rf"<a\s+id=[\"']{re.escape(anchor)}[\"']\s*>\s*</a>")
    match = marker.search(text)
    if not match:
        return None
    next_marker = re.search(r"<a\s+id=[\"'][^\"']+[\"']\s*>\s*</a>", text[match.end() :])
    end = match.end() + next_marker.start() if next_marker else len(text)
    return text[match.end() : end]


def _label_value(section: str, label: str) -> str | None:
    pattern = re.compile(
        rf"^\s*(?:\*\*)?{re.escape(label)}(?:\*\*)?\s*:\s*([^\r\n]*)$",
        re.IGNORECASE | re.MULTILINE,
    )
    match = pattern.search(section)
    return match.group(1).strip() if match else None


def _validate_journeys(manifest: dict, page_text: dict[str, str], errors: list[str]) -> None:
    raw_journeys = manifest.get("jornadas")
    if not isinstance(raw_journeys, list):
        errors.append(_issue("manual.json.jornadas", "lista obrigatória"))
        return

    journeys: dict[str, dict] = {}
    anchors: dict[str, str] = {}
    for index, raw_journey in enumerate(raw_journeys):
        location = f"manual.json.jornadas[{index}]"
        journey = _required_mapping(raw_journey, location, errors)
        if not isinstance(raw_journey, dict):
            continue
        journey_id = _required_text(journey, "id", location, errors)
        page = _required_text(journey, "pagina", location, errors)
        anchor = _required_text(journey, "ancora", location, errors)
        profiles = journey.get("perfis")
        evidence = journey.get("evidencias")
        if not isinstance(profiles, list) or not profiles:
            errors.append(_issue(f"{location}.perfis", "lista de variantes obrigatória"))
            profiles = []
        if not isinstance(evidence, list) or not evidence or not all(
            isinstance(item, str) and item.strip() for item in evidence
        ):
            errors.append(_issue(f"{location}.evidencias", "referência de evidência obrigatória"))
        if journey_id is None:
            continue
        if not JOURNEY_PATTERN.fullmatch(journey_id):
            errors.append(_issue(f"{location}.id", "deve ser um ID J01–J11"))
        elif journey_id in journeys:
            errors.append(_issue(journey_id, "ID de jornada duplicado"))
        else:
            journeys[journey_id] = journey
        valid_profiles = [profile for profile in profiles if isinstance(profile, str)]
        if len(valid_profiles) != len(profiles):
            errors.append(_issue(f"{location}.perfis", "perfil deve ser textual"))
        if profiles:
            invalid_profiles = [profile for profile in valid_profiles if profile not in PROFILES]
            if invalid_profiles:
                errors.append(_issue(f"{location}.perfis", "perfil não pertence ao contrato"))
            if len(set(valid_profiles)) != len(valid_profiles):
                errors.append(_issue(f"{location}.perfis", "variante de perfil duplicada"))
        if journey_id in EXPECTED_VARIANTS and set(valid_profiles) != set(EXPECTED_VARIANTS[journey_id]):
            errors.append(_issue(journey_id, "variantes de perfil não cobrem o conjunto aplicável"))
        if page is not None and page not in page_text:
            errors.append(_issue(f"{location}.pagina", "página não pertence ao inventário"))
        if anchor is not None:
            if not ANCHOR_PATTERN.fullmatch(anchor):
                errors.append(_issue(f"{location}.ancora", "âncora deve usar minúsculas ASCII e hífens"))
            anchor_key = anchor.casefold()
            if anchor_key in anchors:
                errors.append(_issue(anchor, "âncora duplicada"))
            else:
                anchors[anchor_key] = journey_id
        if page not in page_text or anchor is None:
            continue
        section = _section_body(page_text[page], anchor)
        if section is None:
            errors.append(_issue(page, f"seção da jornada {journey_id} não possui a âncora declarada"))
            continue
        for label in OPERATIONAL_LABELS:
            value = _label_value(section, label)
            if value is None:
                errors.append(_issue(page, f"jornada {journey_id}: seção sem {label}"))
            elif label != "Passos" and not value:
                errors.append(_issue(page, f"jornada {journey_id}: {label} não pode ser vazio"))
        if not re.search(r"^\s*\d+[.)]\s+\S+", section, re.MULTILINE):
            errors.append(_issue(page, f"jornada {journey_id}: Passos deve conter lista numerada"))
        profile_value = _label_value(section, "Quem pode executar") or ""
        for profile in EXPECTED_VARIANTS.get(journey_id, ()):  # unknown IDs already have an error
            if not re.search(rf"(?<!\w){re.escape(profile)}(?!\w)", profile_value):
                errors.append(_issue(page, f"jornada {journey_id}: variante de perfil não aparece na seção"))

    for journey_id in EXPECTED_VARIANTS:
        if journey_id not in journeys:
            errors.append(_issue(journey_id, "jornada obrigatória ausente"))


def _validate_inventory(manifest: dict, source: Path, errors: list[str]) -> tuple[list[dict], dict[str, str]]:
    files = _actual_files(source, errors)
    allowed_known = set(CONTROL_FILES)
    pages, page_text = _validate_pages(manifest, files, errors)
    for page in pages:
        origin = page.get("origem")
        if isinstance(origin, str):
            allowed_known.add(origin)
    raw_images = manifest.get("imagens")
    if isinstance(raw_images, list):
        for image in raw_images:
            if isinstance(image, dict) and isinstance(image.get("arquivo"), str):
                allowed_known.add(image["arquivo"])
    _validate_images(manifest, files, errors)
    for filename in files:
        if filename not in allowed_known:
            errors.append(_issue(filename, "arquivo fora do inventário do manual"))
    return pages, page_text


def _validate_manifest_report(
    manifest: object, source: Path, external: bool = False, transport=None
) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    if not isinstance(manifest, dict):
        return [_issue("manual.json", "raiz deve ser um objeto JSON")], []
    if type(manifest.get("versaoEsquema")) is not int or manifest.get("versaoEsquema") != SCHEMA_VERSION:
        errors.append(_issue("manual.json.versaoEsquema", "deve ser exatamente 1"))
    pages, page_text = _validate_inventory(manifest, source, errors)
    _validate_metadata(manifest, pages, page_text, errors)
    _validate_journeys(manifest, page_text, errors)
    external_urls = _validate_markdown_links(manifest, page_text, source, errors)
    if not external:
        return errors, []
    external_errors, inconclusive = _validate_external_links(external_urls, transport)
    return errors + external_errors, inconclusive


def _validate_manifest(manifest: object, source: Path) -> list[str]:
    errors, _ = _validate_manifest_report(manifest, source)
    return errors


def _read_source_manifest(source: str | Path) -> tuple[Path, object]:
    source_path = Path(source)
    if not source_path.exists() or not source_path.is_dir():
        raise ManualInputError("source: source directory does not exist")
    manifest_path = source_path / "manual.json"
    try:
        with manifest_path.open("r", encoding="utf-8") as manifest_file:
            manifest = json.load(manifest_file)
    except FileNotFoundError as exc:
        raise ManualInputError("manual.json: manifest is missing") from exc
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ManualInputError("manual.json: JSON input could not be read") from exc
    return source_path, manifest


def _validate_source_report(
    source: str | Path, external: bool = False, transport=None
) -> tuple[list[str], list[str]]:
    source_path, manifest = _read_source_manifest(source)
    return _validate_manifest_report(manifest, source_path, external, transport)


def validate_source(
    source: str | Path, external: bool = False, transport=None
) -> list[str]:
    """Validate a source directory and return sanitized diagnostics."""

    errors, inconclusive = _validate_source_report(source, external, transport)
    return errors + inconclusive


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Valida o contrato local do manual do LabOn.")
    parser.add_argument("--source", required=True, help="diretório da fonte docs/manual")
    parser.add_argument(
        "--external",
        action="store_true",
        help="verifica links HTTPS públicos com o transporte externo",
    )
    return parser


def _configure_output() -> None:
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is not None:
            reconfigure(encoding="utf-8", errors="replace")


def main(argv: list[str] | None = None) -> int:
    _configure_output()
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        errors, inconclusive = _validate_source_report(args.source, args.external)
    except ManualInputError as exc:
        print(_display(exc), file=sys.stderr)
        return 2
    except Exception:
        print("source: falha operacional durante a validação", file=sys.stderr)
        return 2

    if errors:
        print(f"Manual reprovado: {len(errors)} regra(s) violada(s).", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    if inconclusive:
        print(
            f"Verificacao externa inconclusiva: {len(inconclusive)} link(s) requer(em) conferencia.",
            file=sys.stderr,
        )
        for diagnostic in inconclusive:
            print(f"- {diagnostic}", file=sys.stderr)
        return 3
    print("Manual aprovado: manifesto e páginas coerentes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
