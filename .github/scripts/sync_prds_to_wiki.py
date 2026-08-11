#!/usr/bin/env python3
"""Publish versioned PRDs as sections of one deterministic GitHub Wiki page."""

from __future__ import annotations

import argparse
import re
from pathlib import Path


SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
TITLE_PATTERN = re.compile(r"^#\s+PRD:\s*(.+?)\s*$", re.MULTILINE)


def metadata(content: str, label: str, fallback: str = "—") -> str:
    match = re.search(rf"^-\s+{re.escape(label)}:\s*(.+?)\s*$", content, re.MULTILINE)
    return match.group(1).strip() if match else fallback


def prd_slugs(source: Path) -> list[str]:
    return sorted(
        directory.name
        for directory in source.iterdir()
        if directory.is_dir() and (directory / "prd.md").is_file()
    )


def demote_headings(content: str) -> str:
    """Move source headings one level down so each PRD fits under the wiki page."""
    return re.sub(
        r"^(#{1,5})(\s+)",
        lambda match: f"#{match.group(1)}{match.group(2)}",
        content,
        flags=re.MULTILINE,
    )


def publish(source: Path, wiki: Path, repository: str, ref: str) -> int:
    if not source.is_dir():
        raise FileNotFoundError(f"Diretório de PRDs não encontrado: {source}")
    if not wiki.is_dir():
        raise FileNotFoundError(f"Diretório da wiki não encontrado: {wiki}")

    slugs = prd_slugs(source)
    if not slugs:
        raise RuntimeError(f"Nenhum PRD encontrado em {source}")

    for old_page in wiki.glob("PRD-*.md"):
        old_page.unlink()

    rows: list[str] = []
    sections: list[str] = []
    for slug in slugs:
        if not SLUG_PATTERN.fullmatch(slug):
            raise ValueError(f"Slug inválido para página da wiki: {slug}")

        prd_path = source / slug / "prd.md"
        content = prd_path.read_text(encoding="utf-8-sig").strip()
        title_match = TITLE_PATTERN.search(content)
        if not title_match:
            raise ValueError(f"Título '# PRD:' não encontrado em {prd_path}")

        title = title_match.group(1).strip()
        status = metadata(content, "Status")
        updated = metadata(content, "Atualizado em")
        source_url = (
            f"https://github.com/{repository}/blob/{ref}/"
            f".codex/docs/specs/{slug}/prd.md"
        )
        sections.append(
            "\n".join(
                [
                    "---",
                    "",
                    f'<a id="prd-{slug}"></a>',
                    "",
                    demote_headings(content),
                    "",
                    f"> Fonte: [PRD versionado no repositório principal]({source_url}).",
                ]
            )
        )
        rows.append(f"| [{title}](#prd-{slug}) | {status} | {updated} |")

    index = "\n".join(
        [
            "# Product Requirements Document (PRD)",
            "",
            "Esta página reúne os documentos de requisitos do produto do LabOn. "
            "As seções são publicadas automaticamente a partir dos PRDs versionados "
            "no repositório principal.",
            "",
            "| PRD | Status | Atualizado em |",
            "| --- | --- | --- |",
            *rows,
            "",
            "<!-- Página gerada automaticamente. Edite os PRDs no repositório principal. -->",
            "",
            *sections,
            "",
        ]
    )
    (wiki / "Product-Requirements-Document-(PRD).md").write_text(
        index, encoding="utf-8", newline="\n"
    )
    return len(slugs)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--wiki", type=Path, required=True)
    parser.add_argument("--repository", default="ifpebj-ti/lab-solos")
    parser.add_argument("--ref", default="main")
    args = parser.parse_args()

    count = publish(args.source, args.wiki, args.repository, args.ref)
    print(f"{count} PRD(s) publicado(s) na wiki.")


if __name__ == "__main__":
    main()
