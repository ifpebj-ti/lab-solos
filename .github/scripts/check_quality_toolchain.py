"""Validate the pinned tools used by the quality toolchain.

The checker intentionally executes each version command without a shell.  That
keeps the same invocation usable on Windows and Linux and makes the command
boundary straightforward to replace in unit tests.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Mapping, Sequence


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG_PATH = REPOSITORY_ROOT / ".github" / "quality" / "toolchain.json"
CONCRETE_VERSION = re.compile(r"^\d+\.\d+\.\d+$")
VERSION_IN_OUTPUT = re.compile(r"(?<!\d)v?(\d+\.\d+\.\d+)(?![\d.])")
CHROMIUM_VERSION = re.compile(r"^\d+\.\d+\.\d+\.\d+$")


class ToolchainError(ValueError):
    """An invalid toolchain manifest or an unusable version result."""


@dataclass(frozen=True)
class ToolObservation:
    name: str
    required: str
    observed: str


@dataclass
class CheckResult:
    exit_code: int
    errors: list[str]
    observations: list[ToolObservation]


CommandRunner = Callable[[list[str]], subprocess.CompletedProcess[str]]


def _is_concrete_version(value: object) -> bool:
    return isinstance(value, str) and CONCRETE_VERSION.fullmatch(value) is not None


def _require_mapping(value: object, name: str) -> Mapping[str, object]:
    if not isinstance(value, dict):
        raise ToolchainError(f"configuração deve conter o objeto '{name}'")
    return value


def _validate_tool(name: str, specification: object) -> None:
    tool = _require_mapping(specification, f"tools.{name}")
    required = tool.get("required")
    if not _is_concrete_version(required):
        raise ToolchainError(
            f"versão requerida de '{name}' deve ser concreta no formato X.Y.Z"
        )

    command = tool.get("command")
    if (
        not isinstance(command, list)
        or not command
        or not all(isinstance(argument, str) and argument for argument in command)
    ):
        raise ToolchainError(f"comando de '{name}' deve ser uma lista não vazia")

    parser = tool.get("parser", name)
    if not isinstance(parser, str) or not parser:
        raise ToolchainError(f"parser de '{name}' deve ser um nome não vazio")


def _validate_manifest(data: object) -> Mapping[str, object]:
    manifest = _require_mapping(data, "raiz")
    if manifest.get("schemaVersion") != 1:
        raise ToolchainError("schemaVersion da configuração deve ser 1")

    tools = manifest.get("tools")
    if not isinstance(tools, dict) or not tools:
        raise ToolchainError("configuração deve conter um objeto 'tools' não vazio")
    for name, specification in tools.items():
        if not isinstance(name, str) or not name:
            raise ToolchainError("cada ferramenta deve ter um nome não vazio")
        _validate_tool(name, specification)

    runner = _require_mapping(manifest.get("runner"), "runner")
    required_runner = _require_mapping(runner.get("required"), "runner.required")
    observed_runner = _require_mapping(runner.get("observed"), "runner.observed")
    if not isinstance(required_runner.get("image"), str) or not required_runner["image"]:
        raise ToolchainError("runner.required.image deve ser informado")
    if not isinstance(observed_runner.get("revision"), str) or not observed_runner["revision"]:
        raise ToolchainError("runner.observed.revision deve ser informado")

    playwright = _require_mapping(manifest.get("playwright"), "playwright")
    if not _is_concrete_version(playwright.get("package")):
        raise ToolchainError("playwright.package deve ser uma versão concreta")
    chromium = _require_mapping(playwright.get("chromium"), "playwright.chromium")
    if not isinstance(chromium.get("revision"), str) or not chromium["revision"]:
        raise ToolchainError("playwright.chromium.revision deve ser informado")
    if (
        not isinstance(chromium.get("version"), str)
        or CHROMIUM_VERSION.fullmatch(chromium["version"]) is None
    ):
        raise ToolchainError(
            "playwright.chromium.version deve conter quatro componentes numéricos"
        )

    return manifest


def load_toolchain(path: Path) -> Mapping[str, object]:
    """Load and validate a toolchain manifest without executing commands."""

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise ToolchainError("manifesto de toolchain não encontrado") from error
    except (OSError, UnicodeError) as error:
        raise ToolchainError("não foi possível ler o manifesto de toolchain") from error
    except json.JSONDecodeError as error:
        raise ToolchainError("manifesto de toolchain contém JSON inválido") from error

    return _validate_manifest(data)


def parse_version(tool: str, output: str) -> str:
    """Extract a complete X.Y.Z version from a tool's human-readable output."""

    if not isinstance(output, str):
        raise ToolchainError(f"{tool}: saída de versão inválida")
    match = VERSION_IN_OUTPUT.search(output)
    if match is None:
        raise ToolchainError(f"{tool}: saída não contém uma versão concreta X.Y.Z")
    return match.group(1)


def resolve_command(
    command: list[str],
    *,
    lookup: Callable[[str], str | None] = shutil.which,
) -> list[str]:
    """Resolve an executable while preserving the argument-list invocation."""

    executable = lookup(command[0])
    if executable is None:
        executable = lookup(f"{command[0]}.cmd")
    if executable is None:
        return list(command)
    return [executable, *command[1:]]


def _run_command(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        resolve_command(command),
        cwd=REPOSITORY_ROOT,
        capture_output=True,
        check=False,
        text=True,
    )


def check_toolchain(
    config_path: Path = DEFAULT_CONFIG_PATH,
    *,
    runner: CommandRunner = _run_command,
) -> CheckResult:
    """Run and compare all commands in a validated manifest.

    Exit code 0 means every required version matched.  Exit code 1 means a
    tool ran but reported a different version.  Exit code 2 means the manifest
    or the environment could not be evaluated.
    """

    try:
        manifest = load_toolchain(config_path)
    except ToolchainError as error:
        return CheckResult(exit_code=2, errors=[str(error)], observations=[])

    tools = manifest["tools"]
    assert isinstance(tools, dict)
    errors: list[str] = []
    observations: list[ToolObservation] = []
    has_mismatch = False
    has_operational_error = False

    for name, raw_specification in tools.items():
        assert isinstance(name, str)
        specification = _require_mapping(raw_specification, f"tools.{name}")
        command = list(specification["command"])
        required = specification["required"]
        parser_name = specification.get("parser", name)
        assert isinstance(required, str)
        assert isinstance(parser_name, str)

        try:
            completed = runner(command)
        except FileNotFoundError:
            has_operational_error = True
            errors.append(f"{name}: executável não encontrado")
            continue
        except OSError:
            has_operational_error = True
            errors.append(f"{name}: não foi possível executar o comando configurado")
            continue

        if completed.returncode != 0:
            has_operational_error = True
            errors.append(f"{name}: comando terminou com código {completed.returncode}")
            continue

        stdout = completed.stdout or ""
        stderr = completed.stderr or ""
        try:
            observed = parse_version(parser_name, f"{stdout}\n{stderr}")
        except ToolchainError as error:
            has_operational_error = True
            errors.append(str(error))
            continue

        observations.append(
            ToolObservation(name=name, required=required, observed=observed)
        )
        if observed != required:
            has_mismatch = True
            errors.append(
                f"{name}: versão incompatível; requerida {required}, observada {observed}"
            )

    if has_operational_error:
        return CheckResult(exit_code=2, errors=errors, observations=observations)
    if has_mismatch:
        return CheckResult(exit_code=1, errors=errors, observations=observations)
    return CheckResult(exit_code=0, errors=[], observations=observations)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Verifica as versões fixadas da esteira de qualidade."
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=DEFAULT_CONFIG_PATH,
        help="manifesto JSON a validar (padrão: .github/quality/toolchain.json)",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    result = check_toolchain(args.config)
    if result.exit_code == 0:
        for observation in result.observations:
            print(f"{observation.name}: {observation.observed}")
        print("Quality toolchain OK")
        return 0

    for error in result.errors:
        print(f"ERROR: {error}", file=sys.stderr)
    return result.exit_code


if __name__ == "__main__":
    raise SystemExit(main())
