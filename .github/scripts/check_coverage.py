"""Check normalized JSON coverage counts for the expected test run.

Each file contains module, metric, numerator, denominator, sha, run_id and
run_attempt. The counts and attempt are integers, and the other fields are
strings. Exit codes are 0 for success, 1 for coverage below the threshold and
2 for invalid measurements or arguments.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import NoReturn


MINIMUM_PERCENT = 70
MODULES = ("frontend", "backend")
STATUSES = ("passed", "below threshold", "invalid measurement")


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
            content, object_pairs_hook=_unique_fields, parse_constant=_reject_nonfinite
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


def _validate_report(
    module: str,
    report: dict[str, object],
    identity: dict[str, str | int],
    declared_modules: list[object],
) -> tuple[int, int]:
    reported_module = report.get("module")
    if reported_module != module:
        raise ValueError(f"expected module {module}, found {_display_value(reported_module)}")
    if declared_modules.count(module) > 1:
        raise ValueError(f"duplicate module {module}")

    for field, expected in identity.items():
        actual = report.get(field)
        if type(actual) is not type(expected) or actual != expected:
            raise ValueError(
                f"{field} mismatch: expected {_display_value(expected)}, found {_display_value(actual)}"
            )

    numerator = report.get("numerator")
    denominator = report.get("denominator")
    if type(numerator) is not int:
        reason = "numerator must be an integer"
    elif type(denominator) is not int:
        reason = "denominator must be an integer"
    elif denominator <= 0:
        reason = "denominator must be positive"
    elif numerator < 0:
        reason = "numerator must be nonnegative"
    elif numerator > denominator:
        reason = "numerator exceeds denominator"
    else:
        return numerator, denominator
    raise ValueError(
        f"{reason} (numerator={_display_value(numerator)}, denominator={_display_value(denominator)})"
    )


def _format_coverage(numerator: int, denominator: int) -> str:
    # Round the percentage to two decimal places for display.
    hundredths = (numerator * 10_000 + denominator // 2) // denominator
    whole, fraction = divmod(hundredths, 100)
    return f"{numerator}/{denominator}, {whole}.{fraction:02d}%"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--frontend", type=Path, required=True, help="frontend report JSON")
    parser.add_argument("--backend", type=Path, required=True, help="backend report JSON")
    parser.add_argument("--metric", required=True, help="expected coverage metric")
    parser.add_argument("--sha", required=True, help="expected SHA of the tested revision")
    parser.add_argument("--run-id", required=True, help="expected run identifier")
    parser.add_argument("--run-attempt", type=int, required=True, help="expected positive run attempt")
    args = parser.parse_args(argv)
    if not all(value.strip() for value in (args.metric, args.sha, args.run_id)):
        parser.error("--metric, --sha and --run-id must be nonempty")
    if args.run_attempt <= 0:
        parser.error("--run-attempt must be positive")

    identity = {
        "metric": args.metric,
        "sha": args.sha,
        "run_id": args.run_id,
        "run_attempt": args.run_attempt,
    }
    print(
        f"Coverage metric={args.metric} sha={args.sha} run_id={args.run_id} "
        f"run_attempt={args.run_attempt} minimum={MINIMUM_PERCENT}%"
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
            numerator, denominator = _validate_report(module, report, identity, declared_modules)
        except ValueError as error:
            results[module] = (2, str(error))
            continue

        below_threshold = numerator * 100 < denominator * MINIMUM_PERCENT
        details = _format_coverage(numerator, denominator)
        if below_threshold:
            results[module] = (1, f"{details}, minimum {MINIMUM_PERCENT}%")
        else:
            results[module] = (0, details)

    for module in MODULES:
        status, details = results[module]
        print(f"{module}: {STATUSES[status]} ({details})")
    return max(status for status, _ in results.values())


if __name__ == "__main__":
    raise SystemExit(main())
