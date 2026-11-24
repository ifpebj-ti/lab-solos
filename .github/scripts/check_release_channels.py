#!/usr/bin/env python3
"""Confere observações dos canais de release sem executar consultas.

Cada canal observado informa status present, missing ou unavailable. O coletor
deve usar missing só para ausência confirmada. Os índices OCI e os rótulos são
lidos pelo digest observado. Uma tag anotada informa peeled_type e peeled_id
para o objeto final. --proof recebe um registro independente repository,
version, sha e images. Cada módulo em images informa index_digest e platforms
com os digests por plataforma. O JSON de saída contém status por canal. O código
é 0 se todos correspondem, 2 se alguma comprovação é inconclusiva ou 1 para
ausências e conflitos restantes.
"""

from __future__ import annotations

import argparse
from datetime import datetime
import json
from pathlib import Path
import re
from typing import Any

from resolve_container_version import SEMVER_PATTERN
from validate_container_manifest import (
    ContractViolation,
    DIGEST_PATTERN,
    EXPECTED_PLATFORMS,
    InputError,
    compare_manifests,
    normalize_manifest,
    read_json,
)

SHA_PATTERN = re.compile(r"[0-9a-f]{40}")
REPOSITORY_PATTERN = re.compile(r"[A-Za-z0-9-]+/[A-Za-z0-9_.-]+")
REVISION_LABEL = "org.opencontainers.image.revision"
IMAGE_MODULES = ("frontend", "backend")


def result(status: str, reason: str, reference: str, **details: Any) -> dict[str, Any]:
    return {"status": status, "reason": reason, "reference": reference, **details}


def query_failure(observation: dict[str, Any], reference: str) -> dict[str, Any] | None:
    status = observation.get("status")
    if status == "present":
        return None
    if status == "missing":
        return result("missing", "reference_missing", reference)
    return result("inconclusive", "query_incomplete", reference)


def object_value(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def matches(pattern: re.Pattern[str], value: Any) -> bool:
    return isinstance(value, str) and pattern.fullmatch(value) is not None


def verify_git(observation: dict[str, Any], reference: str, sha: str) -> dict[str, Any]:
    if failure := query_failure(observation, reference):
        return failure
    if not isinstance(observation.get("ref"), str):
        return result("inconclusive", "tag_metadata_incomplete", reference)
    if observation["ref"] != reference:
        return result("conflict", "reference_mismatch", reference)

    object_type = observation.get("object_type")
    object_id = observation.get("object_id")
    if not isinstance(object_type, str) or not matches(SHA_PATTERN, object_id):
        return result("inconclusive", "tag_metadata_incomplete", reference)
    if object_type == "tag":
        object_type = observation.get("peeled_type")
        object_id = observation.get("peeled_id")
        if not isinstance(object_type, str) or not matches(SHA_PATTERN, object_id):
            return result("inconclusive", "tag_peel_incomplete", reference)
    if object_type != "commit":
        return result("conflict", "not_commit", reference)
    if object_id != sha:
        return result("conflict", "commit_mismatch", reference, commit=object_id)
    return result("consistent", "matched", reference, commit=object_id)


def published(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    try:
        return datetime.fromisoformat(value).tzinfo is not None
    except ValueError:
        return False


def verify_release(
    observation: dict[str, Any],
    repository: str,
    version: str,
    git_result: dict[str, Any],
) -> dict[str, Any]:
    if failure := query_failure(observation, version):
        return failure
    if not isinstance(observation.get("tagName"), str):
        return result("inconclusive", "release_metadata_incomplete", version)
    if observation["tagName"] != version:
        return result("conflict", "reference_mismatch", version)

    if observation.get("isDraft") is True:
        return result("conflict", "draft", version)
    if observation.get("isPrerelease") is True:
        return result("conflict", "prerelease", version)
    if (
        observation.get("isDraft") is not False
        or observation.get("isPrerelease") is not False
        or not published(observation.get("publishedAt"))
    ):
        return result("inconclusive", "publication_unconfirmed", version)

    url = f"https://github.com/{repository}/releases/tag/{version}"
    if observation.get("url") != url:
        return result("inconclusive", "release_url_unconfirmed", version)
    if git_result["status"] in ("missing", "conflict"):
        return result("conflict", "tag_unmatched", version, url=url)
    if git_result["status"] != "consistent":
        return result("inconclusive", "tag_unconfirmed", version, url=url)
    return result("consistent", "matched", version, url=url)


def compare_image_proof(
    proof: dict[str, Any] | None,
    repository: str,
    version: str,
    sha: str,
    module: str,
    reference: str,
    index_digest: str,
    platforms: dict[str, str],
) -> dict[str, Any]:
    details = {"index_digest": index_digest, "platforms": platforms}
    if proof is None:
        return result("unverifiable", "proof_missing", reference, **details)
    identity = (proof.get("repository"), proof.get("version"), proof.get("sha"))
    if not all(isinstance(field, str) for field in identity):
        return result("inconclusive", "proof_incomplete", reference, **details)
    if identity != (repository, version, sha) or proof.get("release", "true") != "true":
        return result("conflict", "proof_identity_mismatch", reference, **details)

    expected = object_value(object_value(proof.get("images")).get(module))
    expected_platforms = object_value(expected.get("platforms"))
    if (
        not matches(DIGEST_PATTERN, expected.get("index_digest"))
        or set(expected_platforms) != set(EXPECTED_PLATFORMS)
        or not all(matches(DIGEST_PATTERN, digest) for digest in expected_platforms.values())
    ):
        return result("inconclusive", "proof_incomplete", reference, **details)
    if expected["index_digest"] != index_digest:
        return result("conflict", "index_digest_mismatch", reference, **details)
    try:
        compare_manifests(platforms, expected_platforms)
    except ContractViolation:
        return result("conflict", "platform_digest_mismatch", reference, **details)
    return result("consistent", "matched", reference, **details)


def verify_image(
    observation: dict[str, Any],
    proof: dict[str, Any] | None,
    repository: str,
    version: str,
    sha: str,
    module: str,
) -> dict[str, Any]:
    reference = f"ghcr.io/{repository.lower()}-{module}:{version}"
    if failure := query_failure(observation, reference):
        return failure
    index_digest = observation.get("index_digest")
    if not isinstance(observation.get("reference"), str) or not matches(DIGEST_PATTERN, index_digest):
        return result("inconclusive", "image_metadata_incomplete", reference)
    if observation["reference"] != reference:
        return result("conflict", "reference_mismatch", reference)
    try:
        platforms = normalize_manifest(observation.get("manifest"), Path(reference))
    except InputError:
        return result("inconclusive", "manifest_unreadable", reference, index_digest=index_digest)
    except ContractViolation:
        return result("conflict", "invalid_platforms", reference, index_digest=index_digest)

    details = {"index_digest": index_digest, "platforms": platforms}
    labels = object_value(observation.get("labels"))
    for platform in EXPECTED_PLATFORMS:
        digest = platforms[platform]
        if not isinstance(labels.get(digest), dict):
            return result(
                "inconclusive", "labels_unavailable", reference, platform=platform, **details,
            )
        if labels[digest].get(REVISION_LABEL) != sha:
            return result("conflict", "revision_mismatch", reference, platform=platform, **details)
    return compare_image_proof(
        proof, repository, version, sha, module, reference, index_digest, platforms,
    )


def verify_channels(
    repository: str,
    version: str,
    sha: str,
    observations: dict[str, Any],
    proof: dict[str, Any] | None,
) -> dict[str, dict[str, Any]]:
    git = verify_git(object_value(observations.get("git")), f"refs/tags/{version}", sha)
    return {
        "git": git,
        "release": verify_release(object_value(observations.get("release")), repository, version, git),
        **{
            module: verify_image(
                object_value(observations.get(module)), proof, repository, version, sha, module,
            )
            for module in IMAGE_MODULES
        },
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--sha", required=True)
    parser.add_argument(
        "--observations", type=Path, required=True,
        help="JSON das consultas git, release, frontend e backend",
    )
    parser.add_argument("--proof", type=Path, help="registro independente de digests")
    args = parser.parse_args(argv)
    if not matches(REPOSITORY_PATTERN, args.repository):
        parser.error("repositório deve estar no formato proprietário/nome")
    if not matches(SEMVER_PATTERN, args.version):
        parser.error("versão deve estar no formato canônico X.Y.Z")
    if not matches(SHA_PATTERN, args.sha):
        parser.error("SHA deve ser um commit completo de 40 dígitos hexadecimais")
    try:
        observations = read_json(args.observations)
        proof = read_json(args.proof) if args.proof else None
    except InputError:
        parser.error("não foi possível ler o JSON de observações ou de prova")
    if not isinstance(observations, dict) or (args.proof and not isinstance(proof, dict)):
        parser.error("observações e prova devem ser objetos JSON")

    channels = verify_channels(args.repository, args.version, args.sha, observations, proof)
    print(json.dumps({
        "repository": args.repository,
        "version": args.version,
        "sha": args.sha,
        "channels": channels,
    }))
    statuses = {channel["status"] for channel in channels.values()}
    if statuses == {"consistent"}:
        return 0
    if statuses & {"inconclusive", "unverifiable"}:
        return 2
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
