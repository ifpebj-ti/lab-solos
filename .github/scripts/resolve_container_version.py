#!/usr/bin/env python3
"""Resolve container release metadata from a pull request or manual dispatch."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tempfile
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
REPOSITORY_PATTERN = re.compile(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+")
RUN_ID_PATTERN = re.compile(r"[1-9][0-9]*")
SHA_PATTERN = re.compile(r"[0-9a-fA-F]{40}")


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
    keys = ("release", "version", "change_type")
    if "sha" in result:
        keys += ("sha",)
    return "".join(f"{key}={result[key]}\n" for key in keys)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--event", required=True, choices=("pull_request", "workflow_dispatch"))
    parser.add_argument("--pr-body", help="pull request body for pull_request events")
    parser.add_argument("--latest-tag", help="latest canonical release tag; omit for first release")
    parser.add_argument("--version", help="canonical version for workflow_dispatch")
    parser.add_argument("--ref", help="Git ref for workflow_dispatch")
    parser.add_argument("--repository", help="owner and repository for the release intent")
    parser.add_argument("--run-id", help="ID of the original workflow run")
    parser.add_argument("--run-attempt", type=int, help="current attempt of the original run")
    parser.add_argument("--sha", help="full SHA of the selected commit")
    parser.add_argument(
        "--intent-file",
        type=Path,
        help="JSON array of persisted candidate records, or a new path on the first attempt",
    )
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


def read_intent(
    path: Path, identity: Mapping[str, str], dispatch_version: str | None
) -> dict[str, str]:
    try:
        records = json.loads(path.read_text(encoding="utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError("invalid release intent JSON") from error
    if not isinstance(records, list) or any(not isinstance(record, dict) for record in records):
        raise ValueError("release intent file must contain a JSON array of records")

    matches = [
        record for record in records
        if record.get("repository") == identity["repository"]
        and record.get("run_id") == identity["run_id"]
    ]
    if not matches:
        raise ValueError("no persisted release intent matches this repository and run")
    if len(matches) != 1:
        raise ValueError("multiple persisted release intents match this repository and run")

    record = matches[0]
    if record.get("event") != identity["event"] or record.get("sha") != identity["sha"]:
        raise ValueError("persisted release intent has a conflicting event or SHA")
    release, version, change_type = (
        record.get("release"), record.get("version"), record.get("change_type")
    )
    allowed_change_types = ("dispatch",) if dispatch_version is not None else CHANGE_TYPES
    if change_type not in allowed_change_types or not isinstance(version, str):
        raise ValueError("persisted release intent has invalid release metadata")
    if change_type == "outros":
        if release != "false" or version:
            raise ValueError("persisted skipped release has an invalid version or release flag")
    else:
        if release != "true":
            raise ValueError("persisted release intent has an invalid release flag")
        parse_semver(version, label="persisted version")
    if dispatch_version is not None and version != dispatch_version:
        raise ValueError("dispatch version conflicts with the persisted release intent")
    return {"release": release, "version": version, "change_type": change_type, "sha": identity["sha"]}


def create_intent(path: Path, record: Mapping[str, str]) -> None:
    temporary = tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", newline="\n", dir=path.parent, delete=False
    )
    temporary_path = Path(temporary.name)
    try:
        with temporary:
            json.dump([dict(record)], temporary, indent=2)
            temporary.write("\n")
            temporary.flush()
            os.fsync(temporary.fileno())
        # Link a complete file without replacing another writer's record.
        os.link(temporary_path, path)
    finally:
        temporary_path.unlink(missing_ok=True)


def resolve_with_intent(arguments: argparse.Namespace) -> dict[str, str]:
    inputs = (
        arguments.repository, arguments.run_id, arguments.run_attempt,
        arguments.sha, arguments.intent_file,
    )
    if all(value is None for value in inputs):
        return resolve_arguments(arguments)
    if any(value is None for value in inputs):
        raise ValueError("release intent requires --repository, --run-id, --run-attempt, --sha and --intent-file")
    if REPOSITORY_PATTERN.fullmatch(arguments.repository) is None:
        raise ValueError("repository must be in owner/name format")
    if RUN_ID_PATTERN.fullmatch(arguments.run_id) is None or arguments.run_attempt < 1:
        raise ValueError("run ID and attempt must be positive integers")
    if SHA_PATTERN.fullmatch(arguments.sha) is None:
        raise ValueError("SHA must be the full 40-digit Git commit SHA")
    path = arguments.intent_file
    if arguments.github_output is not None and path.resolve() == arguments.github_output.resolve():
        raise ValueError("release intent file and output must be different files")

    identity = {
        "repository": arguments.repository.lower(),
        "run_id": arguments.run_id,
        "event": arguments.event,
        "sha": arguments.sha.lower(),
    }
    dispatch_result = (
        resolve_arguments(arguments) if arguments.event == "workflow_dispatch" else None
    )
    dispatch_version = dispatch_result["version"] if dispatch_result is not None else None
    try:
        return read_intent(path, identity, dispatch_version)
    except FileNotFoundError:
        if arguments.run_attempt != 1:
            raise ValueError("no persisted release intent for this reexecution") from None

    result = dispatch_result if dispatch_result is not None else resolve_arguments(arguments)
    result["sha"] = identity["sha"]
    try:
        create_intent(path, {**identity, **result})
    except FileExistsError:
        return read_intent(path, identity, dispatch_version)
    return result


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    arguments = parser.parse_args(argv)
    try:
        output = serialize_output(resolve_with_intent(arguments))
    except ValueError as error:
        parser.error(str(error))
    except OSError:
        parser.error("could not read or persist the release intent")
    if arguments.github_output is None:
        sys.stdout.write(output)
    else:
        with arguments.github_output.open("a", encoding="utf-8", newline="\n") as output_file:
            output_file.write(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
