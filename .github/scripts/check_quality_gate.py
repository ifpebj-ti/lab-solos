"""Evaluate the required GitHub Actions results for the final quality gate."""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Iterable, Mapping
from pathlib import Path


VALID_RESULTS = {"success", "failure", "cancelled", "skipped"}


def _parse_job(value: str) -> tuple[str, str]:
    if "=" not in value:
        raise ValueError(f"job must use NAME=RESULT: {value}")
    name, result = value.split("=", 1)
    name, result = name.strip(), result.strip().lower()
    if not name:
        raise ValueError("job name cannot be empty")
    if result not in VALID_RESULTS:
        raise ValueError(f"invalid result for {name}: {result}")
    return name, result


def _load_results(path: Path) -> dict[str, str]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise ValueError(f"invalid gate results JSON: {path}") from error

    if isinstance(payload, Mapping) and isinstance(payload.get("jobs"), Mapping):
        payload = payload["jobs"]
    if not isinstance(payload, Mapping):
        raise ValueError("gate results must be an object of job results")

    results: dict[str, str] = {}
    for name, value in payload.items():
        if isinstance(value, Mapping):
            value = value.get("result")
        if not isinstance(name, str) or not isinstance(value, str):
            raise ValueError("gate result entries must contain string names and results")
        parsed_name, parsed_result = _parse_job(f"{name}={value}")
        results[parsed_name] = parsed_result
    return results


def evaluate_gate(required: Iterable[str], results: Mapping[str, str]) -> tuple[int, list[str]]:
    """Return 0 only when every required job is present and successful."""

    errors: list[str] = []
    for name in required:
        if name not in results:
            errors.append(f"required job is missing: {name}")
            continue
        result = str(results[name]).strip().lower()
        if result != "success":
            errors.append(f"required job {name} finished with {result}")
    return (0 if not errors else 1), errors


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Evaluate the required quality jobs.")
    parser.add_argument("--required", nargs="+", required=True)
    parser.add_argument("--job", action="append", default=[])
    parser.add_argument("--results", type=Path)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    try:
        results: dict[str, str] = {}
        if args.results is not None:
            results.update(_load_results(args.results))
        for raw_job in args.job:
            name, result = _parse_job(raw_job)
            results[name] = result
        exit_code, errors = evaluate_gate(args.required, results)
    except (OSError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 2
    for error in errors:
        print(f"ERROR: {error}", file=sys.stderr)
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
