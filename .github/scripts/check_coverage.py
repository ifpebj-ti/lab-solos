"""Validate line and branch coverage reports for the same test run.

The branch threshold is evaluated independently for the frontend and backend.
Line coverage is printed for information and never changes the exit status.
Exit codes: 0 passed, 1 below branch threshold, 2 invalid measurements/inputs.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import NoReturn


MINIMUM_PERCENT = 70
MODULES = ("frontend", "backend")
STATUS_LABELS = ("passed", "below threshold", "invalid measurement")


def _unique_fields(pairs: list[tuple[str, object]]) -> dict[str, object]:
    fields: dict[str, object] = {}
    for key, value in pairs:
        if key in fields:
            raise ValueError(f"duplicate JSON field {ascii(key)}")
        fields[key] = value
    return fields


def _reject_nonfinite(constant: str) -> NoReturn:
    raise ValueError(f"invalid JSON number {constant}")


def _read_report(path: Path) -> dict[str, object]:
    try:
        content = path.read_text(encoding="utf-8")
    except FileNotFoundError as error:
        raise ValueError(f"report file is missing: {path}") from error
    except (OSError, UnicodeError) as error:
        raise ValueError(f"cannot read report: {path}") from error
    if not content.strip():
        raise ValueError(f"report is empty: {path}")
    try:
        report = json.loads(
            content,
            object_pairs_hook=_unique_fields,
            parse_constant=_reject_nonfinite,
        )
    except (ValueError, RecursionError) as error:
        raise ValueError(f"invalid JSON in {path}: {error}") from error
    if not isinstance(report, dict):
        raise ValueError(f"expected a JSON object: {path}")
    return report


def _display_value(value: object) -> str:
    if value is None or type(value) in (str, int, float, bool):
        return ascii(value)
    return f"<{type(value).__name__}>"


def _validate_metric(name: str, value: object) -> tuple[int, int]:
    if not isinstance(value, dict):
        raise ValueError(f"{name} metric must be an object")
    covered = value.get("covered")
    total = value.get("total")
    if type(covered) is not int:
        raise ValueError(f"{name} covered must be an integer, found {_display_value(covered)}")
    if type(total) is not int:
        raise ValueError(f"{name} total must be an integer, found {_display_value(total)}")
    if total <= 0:
        raise ValueError(f"{name} total must be positive, found {total}")
    if covered < 0:
        raise ValueError(f"{name} covered must be nonnegative, found {covered}")
    if covered > total:
        raise ValueError(f"{name} covered exceeds total ({covered}/{total})")
    return covered, total


def _validate_report(
    module: str,
    report: dict[str, object],
    identity: dict[str, str | int],
    declared_modules: list[object],
) -> dict[str, tuple[int, int]]:
    schema_version = report.get("schemaVersion")
    if type(schema_version) is not int or schema_version != 2:
        raise ValueError(f"schemaVersion must be integer 2, found {_display_value(schema_version)}")

    reported_module = report.get("module")
    if reported_module != module:
        raise ValueError(
            f"expected module {module}, found {_display_value(reported_module)}"
        )
    if declared_modules.count(module) > 1:
        raise ValueError(f"duplicate module {module}")

    for field, expected in identity.items():
        actual = report.get(field)
        if type(actual) is not type(expected) or actual != expected:
            raise ValueError(
                f"{field} mismatch: expected {_display_value(expected)}, "
                f"found {_display_value(actual)}"
            )

    metrics = report.get("metrics")
    if not isinstance(metrics, dict):
        raise ValueError("metrics must be an object")
    return {
        name: _validate_metric(name, metrics.get(name))
        for name in ("lines", "branches")
    }


def _format_coverage(covered: int, total: int) -> str:
    hundredths = (covered * 10_000 + total // 2) // total
    whole, fraction = divmod(hundredths, 100)
    return f"{covered}/{total}, {whole}.{fraction:02d}%"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--frontend", type=Path, required=True, help="frontend report JSON")
    parser.add_argument("--backend", type=Path, required=True, help="backend report JSON")
    parser.add_argument("--sha", required=True, help="expected SHA of the tested revision")
    parser.add_argument("--run-id", required=True, help="expected run identifier")
    parser.add_argument(
        "--run-attempt", type=int, required=True, help="expected positive run attempt"
    )
    args = parser.parse_args(argv)
    if not all(value.strip() for value in (args.sha, args.run_id)):
        parser.error("--sha and --run-id must be nonempty")
    if args.run_attempt <= 0:
        parser.error("--run-attempt must be positive")

    identity: dict[str, str | int] = {
        "sha": args.sha,
        "run_id": args.run_id,
        "run_attempt": args.run_attempt,
    }
    print(
        f"Coverage sha={args.sha} run_id={args.run_id} run_attempt={args.run_attempt} "
        f"minimum branches={MINIMUM_PERCENT}%"
    )

    reports: dict[str, dict[str, object]] = {}
    results: dict[str, tuple[int, str]] = {}
    for module in MODULES:
        try:
            reports[module] = _read_report(getattr(args, module))
        except ValueError as error:
            results[module] = (2, str(error))

    declared_modules = [report.get("module") for report in reports.values()]
    for module, report in reports.items():
        try:
            metrics = _validate_report(module, report, identity, declared_modules)
        except ValueError as error:
            results[module] = (2, str(error))
            continue

        lines = _format_coverage(*metrics["lines"])
        branches = _format_coverage(*metrics["branches"])
        branch_covered, branch_total = metrics["branches"]
        if branch_covered * 100 < branch_total * MINIMUM_PERCENT:
            results[module] = (
                1,
                f"lines {lines}; branches {branches}, minimum {MINIMUM_PERCENT}%",
            )
        else:
            results[module] = (0, f"lines {lines}; branches {branches}")

    for module in MODULES:
        status, details = results[module]
        label = STATUS_LABELS[status]
        print(f"{module}: {label} ({details})")
    return max(status for status, _ in results.values())


if __name__ == "__main__":
    raise SystemExit(main())
