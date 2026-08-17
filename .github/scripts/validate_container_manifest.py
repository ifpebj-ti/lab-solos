#!/usr/bin/env python3
"""Valida a composição de um índice OCI obtido por ``imagetools inspect --raw``."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import sys
from typing import Any


EXPECTED_PLATFORMS = ("linux/amd64", "linux/arm64")
EXECUTABLE_MEDIA_TYPES = {
    "application/vnd.docker.distribution.manifest.v2+json",
    "application/vnd.oci.image.manifest.v1+json",
}
INDEX_MEDIA_TYPES = {
    "application/vnd.docker.distribution.manifest.list.v2+json",
    "application/vnd.oci.image.index.v1+json",
}
DIGEST_PATTERN = re.compile(r"^sha256:[0-9a-f]{64}$")


class InputError(Exception):
    """Indica que o arquivo não pode ser interpretado com segurança."""


class ContractViolation(Exception):
    """Indica que um índice válido não cumpre o contrato de publicação."""


def read_json(path: Path) -> Any:
    try:
        contents = path.read_text(encoding="utf-8")
    except OSError as error:
        raise InputError(f"não foi possível ler {path}: {error.strerror}") from error
    except UnicodeError as error:
        raise InputError(f"conteúdo de {path} não é UTF-8 válido") from error

    try:
        return json.loads(contents)
    except json.JSONDecodeError as error:
        raise InputError(f"JSON inválido em {path}: {error}") from error


def _required_string(mapping: dict[str, Any], key: str, location: str) -> str:
    value = mapping.get(key)
    if not isinstance(value, str) or not value:
        raise InputError(f"{location}: campo {key!r} deve ser uma string não vazia")
    return value


def normalize_manifest(payload: Any, source: Path) -> dict[str, str]:
    if not isinstance(payload, dict):
        raise InputError(f"{source}: o JSON raiz deve ser um objeto")
    if payload.get("schemaVersion") != 2:
        raise InputError(f"{source}: schemaVersion deve ser 2")

    media_type = _required_string(payload, "mediaType", str(source))
    if media_type not in INDEX_MEDIA_TYPES:
        raise InputError(f"{source}: mediaType de índice não suportado: {media_type}")

    manifests = payload.get("manifests")
    if not isinstance(manifests, list):
        raise InputError(f"{source}: manifests deve ser uma lista")

    normalized: dict[str, str] = {}
    for position, raw_descriptor in enumerate(manifests):
        location = f"{source}: manifests[{position}]"
        if not isinstance(raw_descriptor, dict):
            raise InputError(f"{location}: descriptor deve ser um objeto")

        descriptor_media_type = _required_string(
            raw_descriptor, "mediaType", location
        )
        digest = _required_string(raw_descriptor, "digest", location)
        if not DIGEST_PATTERN.fullmatch(digest):
            raise InputError(f"{location}: digest SHA-256 inválido")

        platform = raw_descriptor.get("platform")
        if not isinstance(platform, dict):
            raise InputError(f"{location}: platform deve ser um objeto")
        os_name = _required_string(platform, "os", f"{location}.platform")
        architecture = _required_string(
            platform, "architecture", f"{location}.platform"
        )
        platform_name = f"{os_name}/{architecture}"

        if (
            descriptor_media_type not in EXECUTABLE_MEDIA_TYPES
            or platform_name == "unknown/unknown"
        ):
            raise ContractViolation(
                f"{location}: descriptor não executável inesperado ({platform_name})"
            )
        if platform_name in normalized:
            raise ContractViolation(f"plataforma duplicada: {platform_name}")
        normalized[platform_name] = digest

    actual = set(normalized)
    expected = set(EXPECTED_PLATFORMS)
    if actual != expected:
        missing = sorted(expected - actual)
        extra = sorted(actual - expected)
        details = []
        if missing:
            details.append(f"ausentes: {', '.join(missing)}")
        if extra:
            details.append(f"extras: {', '.join(extra)}")
        raise ContractViolation("conjunto de plataformas inválido; " + "; ".join(details))

    return normalized


def compare_manifests(primary: dict[str, str], comparison: dict[str, str]) -> None:
    divergent = [
        platform
        for platform in EXPECTED_PLATFORMS
        if primary[platform] != comparison[platform]
    ]
    if divergent:
        raise ContractViolation(
            "composição diverge para: " + ", ".join(divergent)
        )


def validate_file(path: Path) -> dict[str, str]:
    return normalize_manifest(read_json(path), path)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Valida que um índice OCI contém exatamente linux/amd64 e "
            "linux/arm64, sem descritores adicionais."
        )
    )
    parser.add_argument("manifest", type=Path, help="JSON bruto do manifesto")
    parser.add_argument(
        "--compare",
        type=Path,
        metavar="JSON",
        help="índice cuja composição deve ter os mesmos digests",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        primary = validate_file(args.manifest)
        if args.compare is not None:
            compare_manifests(primary, validate_file(args.compare))
    except InputError as error:
        print(f"erro de entrada: {error}", file=sys.stderr)
        return 2
    except ContractViolation as error:
        print(f"violação de contrato: {error}", file=sys.stderr)
        return 1

    print("\n".join(EXPECTED_PLATFORMS))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
