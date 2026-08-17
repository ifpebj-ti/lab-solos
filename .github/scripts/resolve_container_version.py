#!/usr/bin/env python3
"""Resolve container release metadata from a pull request or manual dispatch."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Mapping, Sequence


CHANGE_TYPES = (
    "novo-marco",
    "nova-feature-refactor",
    "bug-fix",
    "outros",
)
SEMVER_PATTERN = re.compile(r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\Z")
CHECKBOX_PATTERN = re.compile(
    r"^\s*-\s*\[[xX]\]\s*(novo-marco|nova-feature-refactor|bug-fix|outros)\s*$",
    re.MULTILINE,
)


def parse_semver(value: str, *, label: str) -> tuple[int, int, int]:
    match = SEMVER_PATTERN.fullmatch(value)
    if match is None:
        raise ValueError(f"{label} must be canonical SemVer without a v prefix")
    major, minor, patch = value.split(".")
    try:
        return int(major), int(minor), int(patch)
    except ValueError as error:
        raise ValueError(f"{label} is too large to process safely") from error


def selected_change_type(pr_body: str) -> str:
    selected = CHECKBOX_PATTERN.findall(pr_body)
    if len(selected) != 1:
        raise ValueError("pull request body must select exactly one supported change type")
    return selected[0]


def increment_version(version: tuple[int, int, int], change_type: str) -> str:
    major, minor, patch = version
    if change_type == "novo-marco":
        version = (major + 1, 0, 0)
    elif change_type == "nova-feature-refactor":
        version = (major, minor + 1, 0)
    elif change_type == "bug-fix":
        version = (major, minor, patch + 1)
    else:
        raise ValueError("unsupported release change type")
    return ".".join(str(part) for part in version)


def resolve_pull_request(pr_body: str, latest_tag: str | None) -> dict[str, str]:
    current_version = (
        (0, 0, 0)
        if not latest_tag
        else parse_semver(latest_tag, label="latest version")
    )
    change_type = selected_change_type(pr_body)
    if change_type == "outros":
        return {"release": "false", "version": "", "change_type": change_type}
    return {
        "release": "true",
        "version": increment_version(current_version, change_type),
        "change_type": change_type,
    }


def resolve_dispatch(version: str, ref: str) -> dict[str, str]:
    if ref != "refs/heads/main":
        raise ValueError("workflow dispatch is allowed only from refs/heads/main")
    parse_semver(version, label="version")
    return {"release": "true", "version": version, "change_type": "dispatch"}


def serialize_output(result: Mapping[str, str]) -> str:
    return "".join(f"{key}={result[key]}\n" for key in ("release", "version", "change_type"))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--event", required=True, choices=("pull_request", "workflow_dispatch"))
    parser.add_argument("--pr-body", help="pull request body for pull_request events")
    parser.add_argument("--latest-tag", help="latest canonical release tag; omit for first release")
    parser.add_argument("--version", help="canonical version for workflow_dispatch")
    parser.add_argument("--ref", help="Git ref for workflow_dispatch")
    parser.add_argument("--github-output", type=Path, help="path supplied by GITHUB_OUTPUT")
    return parser


def resolve_arguments(arguments: argparse.Namespace) -> dict[str, str]:
    if arguments.event == "pull_request":
        if arguments.pr_body is None:
            raise ValueError("--pr-body is required for pull_request")
        return resolve_pull_request(arguments.pr_body, arguments.latest_tag)
    if arguments.version is None or arguments.ref is None:
        raise ValueError("--version and --ref are required for workflow_dispatch")
    return resolve_dispatch(arguments.version, arguments.ref)


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    arguments = parser.parse_args(argv)
    try:
        output = serialize_output(resolve_arguments(arguments))
    except ValueError as error:
        parser.error(str(error))
    if arguments.github_output is None:
        sys.stdout.write(output)
    else:
        with arguments.github_output.open("a", encoding="utf-8", newline="\n") as output_file:
            output_file.write(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
