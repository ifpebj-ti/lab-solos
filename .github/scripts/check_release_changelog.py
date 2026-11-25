#!/usr/bin/env python3
"""Check the release heading in a changelog from the selected revision."""

from __future__ import annotations

import argparse
import re
import sys
from collections.abc import Iterator, Sequence
from datetime import date
from pathlib import Path

from resolve_container_version import parse_semver


RELEASE_URL_PREFIX = "https://github.com/ifpebj-ti/lab-solos/releases/tag/"
SECOND_LEVEL_HEADING = re.compile(r"##[ \t]+(.+)")
OPENING_FENCE = re.compile(r" {0,3}(`{3,}|~{3,})(.*)")
RELEASE_TITLE_START = re.compile(r"\[?v?[0-9]+\.[0-9]+\.[0-9]+")
LINK_DESTINATION = re.compile(r"(?<=\])\([^)]*\)")


def second_level_headings(content: str) -> Iterator[str]:
    closing_fence = None
    in_comment = False
    for line in content.split("\n"):
        if closing_fence is not None:
            if closing_fence.fullmatch(line):
                closing_fence = None
            continue
        if in_comment:
            in_comment = "-->" not in line
            continue

        opening_fence = OPENING_FENCE.fullmatch(line)
        if opening_fence is not None:
            marker, info = opening_fence.groups()
            if marker[0] == "~" or "`" not in info:
                closing_fence = re.compile(rf" {{0,3}}{marker[0]}{{{len(marker)},}}[ \t]*")
                continue
        if line.lstrip(" ").startswith("<!--"):
            in_comment = "-->" not in line
            continue

        heading = SECOND_LEVEL_HEADING.fullmatch(line)
        if heading is not None:
            yield heading[1]


def check_release_heading(content: str, version: str) -> None:
    """Require one top-level heading in the form ## [X.Y.Z](release URL) — YYYY-MM-DD."""
    parse_semver(version, label="version")
    escaped_version = re.escape(version)
    version_token = re.compile(rf"(?<![\w.+-]){escaped_version}(?![\w.+-])")
    # Count malformed titles alongside exact matches to catch ambiguity.
    headings = [
        heading
        for heading in second_level_headings(content)
        if RELEASE_TITLE_START.match(heading)
        and version_token.search(LINK_DESTINATION.sub("", heading))
    ]
    if not headings:
        raise ValueError("no release heading in changelog")
    if len(headings) > 1:
        raise ValueError("multiple release headings in changelog")

    expected_url = f"{RELEASE_URL_PREFIX}{version}"
    expected_heading = re.compile(
        rf"\[{escaped_version}\]\({re.escape(expected_url)}\)"
        r"[ \t]+—[ \t]+([0-9]{4}-[0-9]{2}-[0-9]{2})[ \t]*"
    )
    match = expected_heading.fullmatch(headings[0])
    if match is None:
        raise ValueError("invalid release heading: expected the official release link and an ISO date")
    try:
        date.fromisoformat(match[1])
    except ValueError as error:
        raise ValueError("invalid release heading: date is not a valid calendar date") from error


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", required=True, help="canonical version to publish")
    parser.add_argument("--sha", required=True, help="commit selected for publication")
    parser.add_argument(
        "--changelog", required=True, type=Path, help="file from the selected revision"
    )
    arguments = parser.parse_args(argv)
    context = f"Release {arguments.version!r} (SHA {arguments.sha!r})"
    try:
        content = arguments.changelog.read_text(encoding="utf-8-sig")
        check_release_heading(content, arguments.version)
    except (OSError, UnicodeError):
        diagnostic = "could not read changelog as UTF-8"
    except ValueError as error:
        diagnostic = str(error)
    else:
        print(f"{context}: changelog release heading verified")
        return 0

    print(f"{context}: {diagnostic}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
