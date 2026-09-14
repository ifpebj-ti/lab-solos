"""Prepare the LabOn user manual for a deterministic local Wiki publication."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path, PurePosixPath
from urllib.parse import quote, urlsplit

from check_manual import (
    ManualInputError,
    _find_destination_end,
    _masked_markdown,
    _resolve_local_destination,
    validate_source,
)


GENERATOR_VERSION = "1"
PUBLICATION_SCHEMA_VERSION = 1
SHA_PATTERN = re.compile(r"^[0-9a-fA-F]{40}$")
SHA256_PATTERN = re.compile(r"^[0-9a-fA-F]{64}$")
EDITORIAL_VERSION_PATTERN = re.compile(r"^(\d{4}-\d{2}-\d{2})\.(\d+)$")
REPOSITORY_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
PUBLICATION_MANIFEST = "manual-publicacao.json"
PUBLICATION_FOOTER = "\n\n---\n\n## Metadados da publicação"
PROTECTED_WIKI_NAMES = frozenset(
    {"home.md", "_sidebar.md", "product-requirements-document-(prd).md"}
)


class PublicationInputError(Exception):
    """An input or local-operation problem that maps to exit code 2."""


class PublicationDocumentError(Exception):
    """A source document that violates the local manual contract."""

    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__("documento do manual inválido")


def _display(value: object) -> str:
    text = str(value).replace("\r", " ").replace("\n", " ").replace("\x00", " ")
    return text[:160] or "<entrada>"


def _run_git(repository: Path, *arguments: str, text: bool = False) -> str | bytes:
    try:
        result = subprocess.run(
            ["git", "-C", str(repository), *arguments],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=text,
            encoding="utf-8" if text else None,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        raise PublicationInputError("Git local não conseguiu ler a fonte rastreada") from exc
    return result.stdout


def _resolve_directory(path_value: str, label: str, *, reject_symlink: bool = False) -> Path:
    path = Path(path_value)
    try:
        if reject_symlink and path.is_symlink():
            raise PublicationInputError(f"{label}: links simbólicos não são permitidos")
        resolved = path.resolve(strict=True)
    except PublicationInputError:
        raise
    except (OSError, RuntimeError) as exc:
        raise PublicationInputError(f"{label}: diretório não pôde ser resolvido") from exc
    if not resolved.is_dir():
        raise PublicationInputError(f"{label}: diretório não existe")
    return resolved


def _require_within(path: Path, root: Path, label: str) -> Path:
    try:
        resolved = path.resolve(strict=False)
        resolved.relative_to(root.resolve(strict=True))
    except (OSError, RuntimeError, ValueError) as exc:
        raise PublicationInputError(f"{label}: caminho escapa da raiz permitida") from exc
    return resolved


def _reject_symlink_components(path: Path, root: Path, label: str) -> None:
    root = root.resolve(strict=True)
    try:
        relative = path.relative_to(root)
    except ValueError as exc:
        raise PublicationInputError(f"{label}: caminho escapa da raiz permitida") from exc
    current = root
    for part in relative.parts:
        current /= part
        try:
            if current.is_symlink():
                raise PublicationInputError(f"{label}: links simbólicos não são permitidos")
        except OSError as exc:
            raise PublicationInputError(f"{label}: caminho não pôde ser inspecionado") from exc


def _safe_relative(value: object, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise PublicationInputError(f"{label}: caminho relativo inválido")
    pure = PurePosixPath(value)
    if (
        "\\" in value
        or "\x00" in value
        or re.match(r"^[A-Za-z]:", value)
        or pure.is_absolute()
        or any(part in {"", ".", ".."} for part in pure.parts)
    ):
        raise PublicationInputError(f"{label}: caminho deve permanecer relativo à raiz")
    return value


def _reject_protected_wiki_path(relative: str) -> None:
    name = PurePosixPath(relative).name.casefold()
    if name in PROTECTED_WIKI_NAMES or name.startswith("prd-"):
        raise PublicationInputError(
            "wiki: páginas institucionais e PRDs não pertencem ao conjunto gerenciado"
        )


def _source_files(source: Path) -> dict[str, Path]:
    files: dict[str, Path] = {}
    try:
        candidates = list(source.rglob("*"))
    except OSError as exc:
        raise PublicationInputError("source: não foi possível inventariar os arquivos") from exc
    for candidate in candidates:
        try:
            is_symlink = candidate.is_symlink()
            is_file = candidate.is_file()
            relative = candidate.relative_to(source).as_posix()
        except (OSError, ValueError) as exc:
            raise PublicationInputError("source: não foi possível ler um arquivo") from exc
        if is_symlink:
            raise PublicationInputError("source: links simbólicos não são permitidos")
        if is_file:
            files[relative] = candidate
    return files


def _tree_files(repository: Path, commit: str, source_relative: str) -> dict[str, str]:
    output = _run_git(
        repository,
        "ls-tree",
        "-r",
        "-z",
        "--full-tree",
        commit,
        "--",
        source_relative,
        text=False,
    )
    assert isinstance(output, bytes)
    tree: dict[str, str] = {}
    prefix = source_relative.rstrip("/") + "/"
    for record in output.split(b"\0"):
        if not record:
            continue
        try:
            metadata, encoded_path = record.split(b"\t", 1)
            mode, object_type, object_id = metadata.split(b" ", 2)
            path = encoded_path.decode("utf-8")
            if object_type != b"blob" or not path.startswith(prefix):
                raise PublicationInputError("source: commit contém entrada não regular na fonte")
            relative = path[len(prefix) :]
            if not relative or not re.fullmatch(r"[0-9a-f]{40}", object_id.decode("ascii")):
                raise PublicationInputError("source: árvore Git inválida")
            if mode not in {b"100644", b"100755"}:
                raise PublicationInputError("source: arquivo rastreado possui modo não suportado")
            tree[relative] = object_id.decode("ascii")
        except (UnicodeDecodeError, ValueError) as exc:
            raise PublicationInputError("source: não foi possível interpretar a árvore Git") from exc
    if not tree:
        raise PublicationInputError("source: commit não contém arquivos na fonte")
    return tree


def _assert_tracked_source(source: Path, ref: str) -> tuple[Path, str]:
    if not SHA_PATTERN.fullmatch(ref):
        raise PublicationInputError("ref: informe o SHA completo do commit, não uma branch")

    root_text = _run_git(source, "rev-parse", "--show-toplevel", text=True)
    assert isinstance(root_text, str)
    repository = Path(root_text.strip()).resolve()
    try:
        source_relative = source.relative_to(repository).as_posix()
    except ValueError as exc:
        raise PublicationInputError("source: diretório não pertence a um repositório Git") from exc
    if not source_relative or source_relative == ".":
        raise PublicationInputError("source: a raiz do repositório não é uma fonte de manual")

    resolved_text = _run_git(repository, "rev-parse", "--verify", f"{ref}^{{commit}}", text=True)
    assert isinstance(resolved_text, str)
    resolved_commit = resolved_text.strip().lower()
    if resolved_commit != ref.lower():
        raise PublicationInputError("ref: o SHA informado não identifica exatamente o commit solicitado")

    expected = _tree_files(repository, resolved_commit, source_relative)
    actual_paths = _source_files(source)
    if set(actual_paths) != set(expected):
        raise PublicationInputError("source: arquivos locais diferem da fonte rastreada no commit informado")

    for relative, path in actual_paths.items():
        object_bytes = _run_git(repository, "cat-file", "blob", expected[relative], text=False)
        assert isinstance(object_bytes, bytes)
        try:
            local_bytes = path.read_bytes()
        except OSError as exc:
            raise PublicationInputError("source: arquivo rastreado não pôde ser lido") from exc
        if local_bytes != object_bytes:
            raise PublicationInputError("source: arquivo local diverge do conteúdo do commit informado")
    return repository, resolved_commit


def _read_manifest(source: Path) -> dict:
    try:
        with (source / "manual.json").open("r", encoding="utf-8") as stream:
            value = json.load(stream)
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise PublicationInputError("manual.json: manifesto não pôde ser lido") from exc
    if not isinstance(value, dict):
        raise PublicationInputError("manual.json: manifesto deve ser um objeto")
    return value


def _read_publication_manifest(wiki: Path) -> dict | None:
    marker = _safe_destination(wiki, PUBLICATION_MANIFEST)
    if not marker.exists():
        return None
    if not marker.is_file():
        raise PublicationInputError("wiki: manual-publicacao.json não é um arquivo regular")
    try:
        raw = marker.read_bytes()
        value = json.loads(raw.decode("utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise PublicationInputError("wiki: manifesto anterior não pôde ser lido") from exc
    if not isinstance(value, dict):
        raise PublicationInputError("wiki: manifesto anterior deve ser um objeto")
    canonical = (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")
    if raw != canonical:
        raise PublicationInputError("wiki: manifesto anterior foi editado diretamente")
    return value


def _editorial_key(value: object, label: str) -> tuple[str, int]:
    if not isinstance(value, str):
        raise PublicationInputError(f"{label}: revisão editorial inválida")
    match = EDITORIAL_VERSION_PATTERN.fullmatch(value)
    if not match or not int(match.group(2)):
        raise PublicationInputError(f"{label}: revisão editorial inválida")
    return match.group(1), int(match.group(2))


def _required_manifest_text(mapping: dict, field: str, label: str) -> str:
    value = mapping.get(field)
    if not isinstance(value, str) or not value:
        raise PublicationInputError(f"{label}.{field}: campo textual inválido")
    return value


def _validate_previous_publication(value: dict) -> dict:
    if value.get("versaoEsquema") != PUBLICATION_SCHEMA_VERSION:
        raise PublicationInputError("wiki: esquema do manifesto anterior incompatível")
    if value.get("versaoGerador") != GENERATOR_VERSION:
        raise PublicationInputError("wiki: versão do gerador anterior incompatível")
    commit = value.get("commitFonte")
    if not isinstance(commit, str) or not SHA_PATTERN.fullmatch(commit):
        raise PublicationInputError("wiki: manifesto anterior possui commit da fonte inválido")
    repository = value.get("repositorio")
    if not isinstance(repository, str) or not REPOSITORY_PATTERN.fullmatch(repository):
        raise PublicationInputError("wiki: manifesto anterior possui repositório inválido")

    metadata = value.get("metadados")
    if not isinstance(metadata, dict):
        raise PublicationInputError("wiki: metadados do manifesto anterior inválidos")
    for field in ("versaoManual", "produtoValidado", "atualizadoEm", "responsavelRevisao"):
        _required_manifest_text(metadata, field, "wiki.manifesto.metadados")
    _editorial_key(metadata["versaoManual"], "wiki.manifesto.metadados.versaoManual")

    raw_pages = value.get("paginas")
    if not isinstance(raw_pages, list) or not raw_pages:
        raise PublicationInputError("wiki: páginas do manifesto anterior inválidas")
    pages: dict[str, dict] = {}
    page_keys: set[str] = set()
    for index, raw_page in enumerate(raw_pages):
        if not isinstance(raw_page, dict):
            raise PublicationInputError(f"wiki.manifesto.paginas[{index}]: registro inválido")
        origin = _safe_relative(raw_page.get("origem"), f"wiki.manifesto.paginas[{index}].origem")
        destination = _safe_relative(
            raw_page.get("destinoWiki"), f"wiki.manifesto.paginas[{index}].destinoWiki"
        )
        _reject_protected_wiki_path(destination)
        if not destination.casefold().endswith(".md"):
            raise PublicationInputError("wiki: manifesto anterior possui destino não Markdown")
        if not isinstance(raw_page.get("titulo"), str) or not raw_page["titulo"]:
            raise PublicationInputError(f"wiki.manifesto.paginas[{index}].titulo: campo inválido")
        page_hash = raw_page.get("sha256")
        if not isinstance(page_hash, str) or not SHA256_PATTERN.fullmatch(page_hash):
            raise PublicationInputError(f"wiki.manifesto.paginas[{index}].sha256: hash inválido")
        key = destination.casefold()
        if key in page_keys:
            raise PublicationInputError("wiki: destinos do manifesto anterior colidem por caixa")
        page_keys.add(key)
        pages[destination] = {
            "origem": origin,
            "destinoWiki": destination,
            "titulo": raw_page["titulo"],
            "sha256": page_hash.lower(),
        }

    managed = value.get("arquivosGerenciados")
    if not isinstance(managed, list) or not all(isinstance(item, str) for item in managed):
        raise PublicationInputError("wiki: arquivos gerenciados do manifesto anterior inválidos")
    managed_paths: list[str] = []
    managed_keys: set[str] = set()
    for index, item in enumerate(managed):
        relative = _safe_relative(item, f"wiki.manifesto.arquivosGerenciados[{index}]")
        _reject_protected_wiki_path(relative)
        key = relative.casefold()
        if key in managed_keys:
            raise PublicationInputError("wiki: arquivos gerenciados colidem por caixa")
        managed_keys.add(key)
        managed_paths.append(relative)
    expected_managed = set(pages) | {PUBLICATION_MANIFEST}
    if set(managed_paths) != expected_managed or PUBLICATION_MANIFEST not in managed_paths:
        raise PublicationInputError("wiki: manifesto anterior não corresponde aos arquivos gerenciados")

    raw_images = value.get("imagens")
    if not isinstance(raw_images, list):
        raise PublicationInputError("wiki: imagens do manifesto anterior inválidas")
    images: dict[str, str] = {}
    for index, raw_image in enumerate(raw_images):
        if not isinstance(raw_image, dict):
            raise PublicationInputError(f"wiki.manifesto.imagens[{index}]: registro inválido")
        relative = _safe_relative(raw_image.get("arquivo"), f"wiki.manifesto.imagens[{index}].arquivo")
        if not relative.casefold().startswith("imagens/"):
            raise PublicationInputError("wiki: caminho de imagem do manifesto anterior inválido")
        image_hash = raw_image.get("sha256")
        if not isinstance(image_hash, str) or not SHA256_PATTERN.fullmatch(image_hash):
            raise PublicationInputError(f"wiki.manifesto.imagens[{index}].sha256: hash inválido")
        key = relative.casefold()
        if key in images:
            raise PublicationInputError("wiki: imagens do manifesto anterior colidem por caixa")
        images[key] = image_hash.lower()
    return {
        "commitFonte": commit.lower(),
        "repositorio": repository,
        "metadados": metadata,
        "paginas": pages,
        "imagens": images,
        "arquivosGerenciados": managed_paths,
    }


def _normalise_markdown(value: str) -> str:
    return value.replace("\r\n", "\n").replace("\r", "\n")


def _safe_destination(wiki: Path, relative: str) -> Path:
    relative = _safe_relative(relative, "destino Wiki")
    pure = PurePosixPath(relative)
    target = wiki.joinpath(*pure.parts)
    _reject_symlink_components(target, wiki, "destino Wiki")
    return _require_within(target, wiki, "destino Wiki")


def _iter_replacements(text: str, origin: str, source: Path, page_map: dict[str, str], commit: str, repository: str):
    masked = _masked_markdown(text, origin, [])
    index = 0
    while index < len(masked):
        image = masked.startswith("![", index)
        if image or masked[index] == "[":
            label_start = index + 2 if image else index + 1
            label_end = masked.find("]", label_start)
            if label_end >= 0 and label_end + 1 < len(masked) and masked[label_end + 1] == "(":
                destination_start = label_end + 2
                destination_end = _find_destination_end(masked, destination_start)
                if destination_end is None:
                    index = destination_start
                    continue
                destination = text[destination_start:destination_end]
                parsed = urlsplit(destination)
                replacement: str | None = None
                if not parsed.scheme:
                    errors: list[str] = []
                    resolved = _resolve_local_destination(destination, origin, source, errors)
                    if resolved is None or errors:
                        raise PublicationInputError("source: destino local não pôde ser transformado")
                    target, fragment = resolved
                    if image:
                        image_path = quote(f"docs/manual/{target}", safe="/-_.~")
                        replacement = (
                            f"https://raw.githubusercontent.com/{repository}/{commit}/{image_path}"
                        )
                    else:
                        try:
                            wiki_page = page_map[target]
                        except KeyError as exc:
                            raise PublicationInputError("source: link local não pertence ao mapa editorial") from exc
                        replacement = f"https://github.com/{repository}/wiki/{wiki_page[:-3]}"
                        if fragment:
                            replacement += f"#{fragment}"
                if replacement is not None:
                    yield destination_start, destination_end, replacement
                index = destination_end + 1
                continue
        index += 1


def _transform_page(
    text: str,
    origin: str,
    source: Path,
    page_map: dict[str, str],
    commit: str,
    repository: str,
    metadata: dict[str, str],
    source_relative: str,
) -> bytes:
    normalised = _normalise_markdown(text)
    replacements = list(_iter_replacements(normalised, origin, source, page_map, commit, repository))
    for start, end, replacement in reversed(replacements):
        normalised = normalised[:start] + replacement + normalised[end:]

    origin_url = f"https://github.com/{repository}/blob/{commit}/{source_relative}/{origin}"
    footer = (
        "\n\n---\n\n"
        "## Metadados da publicação\n\n"
        f"- Versão do manual: `{metadata['versaoManual']}`\n"
        f"- Produto validado: `{metadata['produtoValidado']}`\n"
        f"- Atualizado em: `{metadata['atualizadoEm']}`\n"
        f"- Responsável pela revisão: `{metadata['responsavelRevisao']}`\n"
        f"- Commit da fonte: `{commit}`\n"
        f"- Origem: [ver esta página no repositório principal]({origin_url})\n\n"
        "Correções devem ser feitas no repositório principal, na fonte versionada do manual.\n"
    )
    return (normalised.rstrip("\n") + footer).encode("utf-8")


def _sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _prepare_publication(
    source: Path, wiki: Path, repository: str, commit: str, git_root: Path
) -> dict[str, bytes]:
    validation_errors = validate_source(source)
    if validation_errors:
        raise PublicationDocumentError(validation_errors)
    manifest = _read_manifest(source)

    metadata = {
        field: manifest[field]
        for field in ("versaoManual", "produtoValidado", "atualizadoEm", "responsavelRevisao")
    }
    pages = manifest["paginas"]
    images = manifest["imagens"]
    page_map = {page["origem"]: page["destinoWiki"] for page in pages}
    source_relative = source.relative_to(git_root).as_posix()

    prepared_pages: list[tuple[str, bytes, str, str]] = []
    for page in pages:
        origin = page["origem"]
        destination = page["destinoWiki"]
        try:
            text = (source / Path(origin)).read_text(encoding="utf-8")
        except (OSError, UnicodeError) as exc:
            raise PublicationInputError("source: página não pôde ser lida para publicação") from exc
        content = _transform_page(
            text,
            origin,
            source,
            page_map,
            commit,
            repository,
            metadata,
            source_relative,
        )
        prepared_pages.append((destination, content, origin, page["titulo"]))

    prepared_images = []
    for image in sorted(images, key=lambda item: item["arquivo"]):
        relative = image["arquivo"]
        try:
            image_bytes = (source / Path(relative)).read_bytes()
        except OSError as exc:
            raise PublicationInputError("source: imagem não pôde ser lida para publicação") from exc
        prepared_images.append(
            {
                "arquivo": relative,
                "sha256": _sha256(image_bytes),
                "url": f"https://raw.githubusercontent.com/{repository}/{commit}/"
                f"{quote(f'docs/manual/{relative}', safe='/-_.~')}",
            }
        )

    page_records = [
        {
            "origem": origin,
            "destinoWiki": destination,
            "sha256": _sha256(content),
            "titulo": title,
        }
        for destination, content, origin, title in prepared_pages
    ]
    managed = sorted([destination for destination, *_ in prepared_pages] + [PUBLICATION_MANIFEST])
    publication = {
        "versaoEsquema": PUBLICATION_SCHEMA_VERSION,
        "versaoGerador": GENERATOR_VERSION,
        "commitFonte": commit,
        "repositorio": repository,
        "metadados": metadata,
        "arquivosGerenciados": managed,
        "paginas": page_records,
        "imagens": prepared_images,
    }
    manifest_bytes = (json.dumps(publication, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")
    prepared: dict[str, bytes] = {destination: content for destination, content, *_ in prepared_pages}
    prepared[PUBLICATION_MANIFEST] = manifest_bytes

    for relative in prepared:
        if relative != PUBLICATION_MANIFEST:
            _reject_protected_wiki_path(relative)
        _safe_destination(wiki, relative)
    return prepared


def _preflight_destination(wiki: Path, prepared: dict[str, bytes]) -> None:
    marker = _safe_destination(wiki, PUBLICATION_MANIFEST)
    if marker.exists() or marker.is_symlink():
        raise PublicationInputError(
            "wiki: destino já possui manual-publicacao.json; atualização é responsabilidade da T006"
        )
    for relative in sorted(prepared):
        target = _safe_destination(wiki, relative)
        if target.exists() or target.is_symlink():
            raise PublicationInputError("wiki: colisão com arquivo existente; geração inicial interrompida")


def _owned_page_bytes(wiki: Path, destination: str, expected_hash: str) -> bytes:
    target = _safe_destination(wiki, destination)
    if not target.exists() or not target.is_file():
        raise PublicationInputError(f"wiki: página gerenciada removida inesperadamente: {destination}")
    try:
        content = target.read_bytes()
    except OSError as exc:
        raise PublicationInputError("wiki: página gerenciada não pôde ser lida") from exc
    if _sha256(content) != expected_hash:
        raise PublicationInputError(f"wiki: edição direta detectada em página gerenciada: {destination}")
    return content


def _publication_body(content: bytes) -> bytes:
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        return content
    text = text.split(PUBLICATION_FOOTER, 1)[0]
    text = re.sub(
        r"https://raw\.githubusercontent\.com/[^\s/)]+/[^\s/)]+/[0-9a-fA-F]{40}/",
        "https://raw.githubusercontent.com/<commit>/",
        text,
    )
    return text.encode("utf-8")


def _content_or_image_changed(wiki: Path, prepared: dict[str, bytes], previous: dict) -> bool:
    try:
        current_manifest = json.loads(prepared[PUBLICATION_MANIFEST].decode("utf-8"))
    except (KeyError, UnicodeError, json.JSONDecodeError) as exc:
        raise PublicationInputError("wiki: manifesto preparado não pôde ser comparado") from exc

    current_pages = {page["origem"]: page for page in current_manifest.get("paginas", [])}
    previous_pages = previous["paginas"]
    previous_origins = {page["origem"] for page in previous_pages.values()}
    if set(current_pages) != previous_origins:
        return True
    for origin, current_page in current_pages.items():
        previous_page = next(page for page in previous_pages.values() if page["origem"] == origin)
        destination = current_page["destinoWiki"]
        if destination != previous_page["destinoWiki"]:
            return True
        previous_content = _owned_page_bytes(
            wiki, previous_page["destinoWiki"], previous_page["sha256"]
        )
        if _publication_body(previous_content) != _publication_body(prepared[destination]):
            return True

    current_images = {
        image["arquivo"].casefold(): (image["arquivo"], image["sha256"])
        for image in current_manifest.get("imagens", [])
    }
    previous_images = previous["imagens"]
    if set(current_images) != set(previous_images):
        return True
    return any(current_images[key][1].lower() != previous_images[key] for key in current_images)


def _git_is_ancestor(repository: Path, ancestor: str, descendant: str) -> bool:
    try:
        result = subprocess.run(
            ["git", "-C", str(repository), "merge-base", "--is-ancestor", ancestor, descendant],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
    except OSError as exc:
        raise PublicationInputError("Git local não conseguiu verificar a reversão compatível") from exc
    if result.returncode not in {0, 1}:
        raise PublicationInputError("Git local não conseguiu verificar a reversão compatível")
    return result.returncode == 0


def _version_text(value: tuple[str, int]) -> str:
    return f"{value[0]}.{value[1]}"


def _is_compatible_rollback(
    git_root: Path,
    source: Path,
    commit: str,
    current_version: tuple[str, int],
    previous: dict,
) -> bool:
    previous_version = _editorial_key(
        previous["metadados"]["versaoManual"], "wiki.manifesto.metadados.versaoManual"
    )
    if current_version > previous_version:
        return False
    previous_commit = previous["commitFonte"]
    if not _git_is_ancestor(git_root, previous_commit, commit):
        return False
    try:
        source_relative = source.relative_to(git_root).as_posix()
        current_tree = _tree_files(git_root, commit, source_relative)
        history = _run_git(git_root, "rev-list", commit, text=True)
    except PublicationInputError:
        return False
    assert isinstance(history, str)
    for candidate in history.splitlines():
        candidate = candidate.strip().lower()
        if not candidate or candidate == commit.lower():
            continue
        try:
            if _tree_files(git_root, candidate, source_relative) != current_tree:
                continue
            manifest_bytes = _run_git(
                git_root, "show", f"{candidate}:{source_relative}/manual.json", text=False
            )
            assert isinstance(manifest_bytes, bytes)
            candidate_manifest = json.loads(manifest_bytes.decode("utf-8"))
        except (PublicationInputError, UnicodeError, json.JSONDecodeError):
            continue
        if isinstance(candidate_manifest, dict) and candidate_manifest.get("versaoManual") == _version_text(current_version):
            return True
    return False


def _preflight_managed_update(
    wiki: Path,
    prepared: dict[str, bytes],
    previous: dict,
    source: Path,
    git_root: Path,
    commit: str,
) -> list[str]:
    previous_pages = previous["paginas"]
    for destination, page in previous_pages.items():
        _owned_page_bytes(wiki, destination, page["sha256"])

    current_pages = {destination for destination in prepared if destination != PUBLICATION_MANIFEST}
    previous_by_key = {destination.casefold(): destination for destination in previous_pages}
    for destination in current_pages:
        target = _safe_destination(wiki, destination)
        previous_destination = previous_by_key.get(destination.casefold())
        if previous_destination is not None and previous_destination != destination:
            raise PublicationInputError("wiki: destino gerenciado colide por diferença de caixa")
        if target.exists() or target.is_symlink():
            if previous_destination is None:
                raise PublicationInputError("wiki: colisão com arquivo sem posse comprovada")

    current_manifest = json.loads(prepared[PUBLICATION_MANIFEST].decode("utf-8"))
    current_version = _editorial_key(
        current_manifest["metadados"]["versaoManual"], "manual.versaoManual"
    )
    previous_version = _editorial_key(
        previous["metadados"]["versaoManual"], "wiki.manifesto.metadados.versaoManual"
    )
    if _content_or_image_changed(wiki, prepared, previous) and current_version <= previous_version:
        if not _is_compatible_rollback(git_root, source, commit, current_version, previous):
            raise PublicationInputError(
                "manual: alteração de conteúdo/imagem exige avanço da revisão editorial"
            )
    return sorted(set(previous_pages) - current_pages)


def _apply_publication(wiki: Path, prepared: dict[str, bytes], stale: list[str]) -> None:
    affected = sorted(set(prepared) | set(stale))
    snapshots: dict[str, bytes] = {}
    for relative in affected:
        target = _safe_destination(wiki, relative)
        if target.exists():
            if not target.is_file():
                raise PublicationInputError("wiki: arquivo gerenciado não é regular")
            try:
                snapshots[relative] = target.read_bytes()
            except OSError as exc:
                raise PublicationInputError("wiki: arquivo gerenciado não pôde ser lido") from exc

    created_directories: list[Path] = []
    for relative in prepared:
        parent = _safe_destination(wiki, relative).parent
        missing: list[Path] = []
        while parent != wiki and not parent.exists():
            missing.append(parent)
            parent = parent.parent
        created_directories.extend(reversed(missing))

    staging: Path | None = None
    try:
        staging = Path(tempfile.mkdtemp(prefix=".manual-publicacao-", dir=wiki))
        for relative in sorted(prepared):
            staged = staging.joinpath(*PurePosixPath(relative).parts)
            staged.parent.mkdir(parents=True, exist_ok=True)
            with staged.open("wb") as stream:
                stream.write(prepared[relative])
                stream.flush()
                os.fsync(stream.fileno())
        for relative in stale:
            _safe_destination(wiki, relative).unlink()
        for relative in sorted(prepared, key=lambda item: (item == PUBLICATION_MANIFEST, item)):
            target = _safe_destination(wiki, relative)
            target.parent.mkdir(parents=True, exist_ok=True)
            os.replace(staging.joinpath(*PurePosixPath(relative).parts), target)
    except (OSError, RuntimeError) as exc:
        for relative in affected:
            target = _safe_destination(wiki, relative)
            try:
                if target.is_file() or target.is_symlink():
                    target.unlink()
            except OSError:
                pass
        for relative, content in snapshots.items():
            target = _safe_destination(wiki, relative)
            try:
                target.parent.mkdir(parents=True, exist_ok=True)
                with tempfile.NamedTemporaryFile(mode="wb", dir=target.parent, delete=False) as stream:
                    stream.write(content)
                    stream.flush()
                    os.fsync(stream.fileno())
                    rollback_path = Path(stream.name)
                os.replace(rollback_path, target)
            except OSError:
                pass
        for directory in reversed(created_directories):
            try:
                directory.rmdir()
            except OSError:
                pass
        raise PublicationInputError(
            "wiki: falha ao gravar a publicação; nenhum conjunto parcial foi mantido"
        ) from exc
    finally:
        if staging is not None:
            shutil.rmtree(staging, ignore_errors=True)


def _write_initial_publication(wiki: Path, prepared: dict[str, bytes]) -> None:
    _apply_publication(wiki, prepared, [])


def _check_publication(wiki: Path, prepared: dict[str, bytes]) -> int:
    raw_previous = _read_publication_manifest(wiki)
    if raw_previous is None:
        return 1
    previous = _validate_previous_publication(raw_previous)

    for destination, page in previous["paginas"].items():
        target = _safe_destination(wiki, destination)
        if not target.exists() or not target.is_file():
            return 1
        try:
            observed = target.read_bytes()
        except OSError as exc:
            raise PublicationInputError("wiki: página gerenciada não pôde ser lida") from exc
        if _sha256(observed) != page["sha256"]:
            return 1

    current_pages = {relative for relative in prepared if relative != PUBLICATION_MANIFEST}
    stale = set(previous["paginas"]) - current_pages
    for destination in stale:
        target = _safe_destination(wiki, destination)
        if target.exists():
            return 1

    for relative, expected in prepared.items():
        target = _safe_destination(wiki, relative)
        if not target.exists() or not target.is_file():
            return 1
        try:
            if target.read_bytes() != expected:
                return 1
        except OSError as exc:
            raise PublicationInputError("wiki: arquivo gerenciado não pôde ser lido") from exc
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Gera localmente as páginas do manual do LabOn para uma Wiki."
    )
    parser.add_argument("--source", required=True, help="diretório versionado docs/manual")
    parser.add_argument("--wiki", required=True, help="diretório local da Wiki")
    parser.add_argument("--repository", required=True, help="repositório no formato dono/nome")
    parser.add_argument("--ref", required=True, help="SHA completo do commit da fonte")
    parser.add_argument("--mode", choices=("generate", "check"), required=True)
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
    if not REPOSITORY_PATTERN.fullmatch(args.repository):
        print("repository: use o formato seguro dono/nome", file=sys.stderr)
        return 2

    try:
        source = _resolve_directory(args.source, "source", reject_symlink=True)
        wiki = _resolve_directory(args.wiki, "wiki", reject_symlink=True)
        git_root, commit = _assert_tracked_source(source, args.ref)
        prepared = _prepare_publication(source, wiki, args.repository, commit, git_root)
        if args.mode == "check":
            result = _check_publication(wiki, prepared)
            if result == 0:
                print("check: equivalência confirmada.")
            else:
                print("check: divergência detectada.", file=sys.stderr)
            return result

        raw_previous = _read_publication_manifest(wiki)
        if raw_previous is None:
            _preflight_destination(wiki, prepared)
            _write_initial_publication(wiki, prepared)
        else:
            previous = _validate_previous_publication(raw_previous)
            stale = _preflight_managed_update(wiki, prepared, previous, source, git_root, commit)
            _apply_publication(wiki, prepared, stale)
    except PublicationDocumentError as exc:
        print(f"Manual reprovado: {len(exc.errors)} regra(s) violada(s).", file=sys.stderr)
        for error in exc.errors:
            print(f"- {_display(error)}", file=sys.stderr)
        return 1
    except (ManualInputError, PublicationInputError) as exc:
        print(_display(exc), file=sys.stderr)
        return 2
    except (OSError, UnicodeError) as exc:
        print("publicação: falha operacional local", file=sys.stderr)
        return 2

    print(f"Publicação preparada: {len(prepared) - 1} página(s) e manifesto determinístico.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
