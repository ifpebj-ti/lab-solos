#!/usr/bin/env python3
"""Plan safe release-channel recovery from read-only observations.

This module never queries or changes GitHub or a registry. The workflow supplies
observations and a proof manifest, then executes only the returned actions.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
from typing import Any

from resolve_container_version import REPOSITORY_PATTERN, RUN_ID_PATTERN, SHA_PATTERN, SEMVER_PATTERN
from validate_container_manifest import DIGEST_PATTERN, EXPECTED_PLATFORMS


CHANNELS = ("git", "release", "frontend", "backend")
LATEST_COMPONENTS = ("frontend", "backend")
CHANNEL_STATES = {"consistent", "missing", "draft", "conflict", "inconclusive", "unverifiable"}
LATEST_STATES = {"present", "missing", "conflict", "inconclusive"}


class PlanError(ValueError):
    """Input observations cannot safely determine a publication sequence."""


def _matches(pattern: re.Pattern[str], value: Any) -> bool:
    return isinstance(value, str) and pattern.fullmatch(value) is not None


def _identity_valid(identity: Any) -> bool:
    if not isinstance(identity, dict):
        return False
    if not _matches(REPOSITORY_PATTERN, identity.get("repository")):
        return False
    if not _matches(RUN_ID_PATTERN, identity.get("run_id")):
        return False
    if not _matches(SHA_PATTERN, identity.get("sha")):
        return False
    if identity.get("event") not in ("pull_request", "workflow_dispatch"):
        return False
    if identity.get("release") not in ("true", "false"):
        return False
    if identity["release"] == "false":
        return identity.get("change_type") == "outros" and identity.get("version") == ""
    return _matches(SEMVER_PATTERN, identity.get("version")) and isinstance(
        identity.get("change_type"), str
    )


def _version_key(value: str | None) -> tuple[int, int, int] | None:
    if value is None:
        return None
    if not _matches(SEMVER_PATTERN, value):
        raise PlanError("latest stable release version is invalid")
    return tuple(int(part) for part in value.split("."))


def _channel_states(observations: Any) -> dict[str, str]:
    if not isinstance(observations, dict) or not isinstance(observations.get("channels"), dict):
        raise PlanError("channel observations are missing")
    channels = observations["channels"]
    states: dict[str, str] = {}
    for name in CHANNELS:
        channel = channels.get(name)
        state = channel.get("status") if isinstance(channel, dict) else None
        if state not in CHANNEL_STATES:
            raise PlanError(f"{name} channel observation is invalid")
        states[name] = state
    return states


def _validate_proof(proof: Any, identity: dict[str, Any]) -> None:
    if not isinstance(proof, dict):
        raise PlanError("release proof is invalid")
    for key in ("repository", "run_id", "event", "version", "sha", "change_type", "release"):
        if proof.get(key) != identity.get(key):
            raise PlanError(f"release proof identity mismatch: {key}")
    images = proof.get("images")
    if not isinstance(images, dict):
        raise PlanError("release proof images are missing")
    for component in LATEST_COMPONENTS:
        image = images.get(component)
        if not isinstance(image, dict):
            raise PlanError(f"release proof for {component} is missing")
        if not _matches(DIGEST_PATTERN, image.get("index_digest")):
            raise PlanError(f"release proof for {component} has an invalid index digest")
        platforms = image.get("platforms")
        if (
            not isinstance(platforms, dict)
            or set(platforms) != set(EXPECTED_PLATFORMS)
            or not all(_matches(DIGEST_PATTERN, digest) for digest in platforms.values())
        ):
            raise PlanError(f"release proof for {component} has invalid platform digests")


def _latest_states(observations: Any) -> dict[str, dict[str, Any]]:
    latest = observations.get("latest") if isinstance(observations, dict) else None
    if not isinstance(latest, dict):
        raise PlanError("latest tag observations are missing")
    result: dict[str, dict[str, Any]] = {}
    for component in LATEST_COMPONENTS:
        item = latest.get(component)
        state = item.get("status") if isinstance(item, dict) else None
        if state not in LATEST_STATES:
            raise PlanError(f"latest {component} observation is invalid")
        if state == "present" and not _matches(DIGEST_PATTERN, item.get("index_digest")):
            raise PlanError(f"latest {component} digest is incomplete")
        result[component] = item
    return result


def _stopped(reason: str) -> dict[str, Any]:
    return {
        "mode": "stop",
        "reason": reason,
        "recover_channels": [],
        "release_action": "none",
        "latest_action": "none",
        "promote_latest": [],
    }


def plan_publication(
    identity: dict[str, Any], observations: dict[str, Any], proof: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Return a fail-closed plan based only on channel and proof observations."""
    if not _identity_valid(identity):
        raise PlanError("release intent is invalid")
    if identity["release"] == "false":
        return {
            "mode": "skip",
            "reason": "change type does not publish a release",
            "recover_channels": [],
            "release_action": "none",
            "latest_action": "none",
            "promote_latest": [],
        }

    states = _channel_states(observations)
    blockers = [name for name, state in states.items() if state in {"conflict", "inconclusive", "unverifiable"}]
    if blockers:
        details = ", ".join(f"{name}={states[name]}" for name in blockers)
        return _stopped(f"channel evidence is not conclusive: {details}")

    all_missing = all(state == "missing" for state in states.values())
    if proof is None:
        if not all_missing:
            return _stopped("existing channel references require a matching release proof")
        mode = "publish"
    else:
        try:
            _validate_proof(proof, identity)
        except PlanError as error:
            return _stopped(str(error))
        mode = "verify" if all(state == "consistent" for state in states.values()) else "resume"

    target_key = _version_key(identity["version"])
    latest_version = observations.get("latest_version")
    latest_key = _version_key(latest_version)
    latest_observed = _latest_states(observations)
    if any(item["status"] in {"conflict", "inconclusive"} for item in latest_observed.values()):
        return _stopped("latest tag evidence is not conclusive")

    if proof is None and latest_key is not None and latest_key >= target_key:
        return _stopped("new release cannot be older than or equal to the latest stable release")

    recover = [name for name in CHANNELS if states[name] == "missing"] if proof is not None else []
    if states["release"] == "draft":
        release_action = "publish-draft"
    elif states["release"] == "missing":
        release_action = "create-draft"
    else:
        release_action = "none"

    if latest_key is not None and latest_key > target_key:
        # A verified older release may be re-run, but must never roll back `latest`.
        if proof is None or states["release"] == "missing":
            return _stopped("older release has no verified release record")
        if any(item["status"] != "present" for item in latest_observed.values()):
            return _stopped("newer latest tags must be present before they can be preserved")
        latest_action = "preserve-newer"
        promote: list[str] = []
    elif latest_key is not None and latest_key == target_key:
        if proof is None:
            return _stopped("latest release identity requires a matching release proof")
        divergent = [
            component for component, item in latest_observed.items()
            if item["status"] == "present"
            and item.get("index_digest") != proof["images"][component]["index_digest"]
        ]
        if divergent:
            return _stopped("latest tag conflicts with its stable release: " + ", ".join(divergent))
        promote = [
            component for component, item in latest_observed.items()
            if item["status"] == "missing"
        ]
        latest_action = "promote" if promote else "verify"
    else:
        if latest_key is None and any(item["status"] != "missing" for item in latest_observed.values()):
            if proof is None or states["release"] != "draft":
                return _stopped("latest tags exist without a confirmed stable release version")
            divergent = [
                component for component, item in latest_observed.items()
                if item["status"] == "present"
                and item.get("index_digest") != proof["images"][component]["index_digest"]
            ]
            if divergent:
                return _stopped("latest tag conflicts with the draft release: " + ", ".join(divergent))
        promote = [
            component for component, item in latest_observed.items()
            if item["status"] == "missing"
            or proof is None
            or item.get("index_digest") != proof["images"][component]["index_digest"]
        ]
        latest_action = "promote" if promote else "verify"

    return {
        "mode": mode,
        "reason": "read-only evidence permits this sequence",
        "recover_channels": recover,
        "release_action": release_action,
        "latest_action": latest_action,
        "promote_latest": promote,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    try:
        request = json.loads(args.input.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        parser.error("could not read release sequence input")
    if not isinstance(request, dict):
        parser.error("release sequence input must be an object")
    try:
        plan = plan_publication(request.get("intent"), request.get("observations"), request.get("proof"))
    except PlanError as error:
        parser.error(str(error))
    try:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")
    except OSError:
        parser.error("could not write release sequence plan")
    print(json.dumps(plan))
    return 0 if plan["mode"] != "stop" else 1


if __name__ == "__main__":
    raise SystemExit(main())
