"""Generate current coverage badges from matching frontend and backend reports."""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import tempfile
from fractions import Fraction
from pathlib import Path
from typing import NoReturn


MODULES = ("frontend", "backend")
METRICS = ("lines", "branches")
EXPECTED_SHA = re.compile(r"^[0-9a-f]{40}$")
COLORS = {
    "available-lines": "#2563eb",
    "available-branches": "#2e7d32",
    "below-threshold": "#b91c1c",
    "unavailable": "#9ca3af",
    "label": "#555",
}


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
        raise ValueError("coverage report is missing") from error
    except (OSError, UnicodeError) as error:
        raise ValueError("coverage report cannot be read") from error
    if not content.strip():
        raise ValueError("coverage report is empty")
    try:
        report = json.loads(
            content,
            object_pairs_hook=_unique_fields,
            parse_constant=_reject_nonfinite,
        )
    except (ValueError, RecursionError) as error:
        raise ValueError(f"coverage report is invalid: {error}") from error
    if not isinstance(report, dict):
        raise ValueError("coverage report must be an object")
    return report


def _validate_identity(
    report: dict[str, object],
    module: str,
    identity: dict[str, str | int],
) -> dict[str, object]:
    if type(report.get("schemaVersion")) is not int or report["schemaVersion"] != 2:
        raise ValueError("schemaVersion must be integer 2")
    if report.get("module") != module:
        raise ValueError(f"module mismatch for {module}")
    for field, expected in identity.items():
        actual = report.get(field)
        if type(actual) is not type(expected) or actual != expected:
            raise ValueError(f"identity mismatch for {field} in {module}")
    metrics = report.get("metrics")
    if not isinstance(metrics, dict):
        raise ValueError(f"metrics object is missing for {module}")
    return metrics


def _validate_metric(value: object, name: str, module: str) -> tuple[int, int]:
    if not isinstance(value, dict):
        raise ValueError(f"{name} metric is missing for {module}")
    covered = value.get("covered")
    total = value.get("total")
    if type(covered) is not int or type(total) is not int:
        raise ValueError(f"{name} counts must be integers for {module}")
    if total <= 0:
        raise ValueError(f"{name} denominator must be positive for {module}")
    if covered < 0 or covered > total:
        raise ValueError(f"{name} counts are inconsistent for {module}")
    return covered, total


def _load_reports(
    paths: dict[str, Path], identity: dict[str, str | int]
) -> tuple[dict[str, dict[str, tuple[int, int]]], dict[str, str]]:
    results: dict[str, dict[str, tuple[int, int]]] = {}
    module_errors: dict[str, str] = {}
    for module, path in paths.items():
        try:
            report = _read_report(path)
            raw_metrics = _validate_identity(report, module, identity)
        except ValueError as error:
            module_errors[module] = str(error)
            results[module] = {}
            continue

        module_metrics: dict[str, tuple[int, int]] = {}
        for metric in METRICS:
            try:
                module_metrics[metric] = _validate_metric(
                    raw_metrics.get(metric), metric, module
                )
            except ValueError as error:
                module_errors[f"{module}.{metric}"] = str(error)
        results[module] = module_metrics
    return results, module_errors


def _summarize_metric(
    metric: str,
    reports: dict[str, dict[str, tuple[int, int]]],
) -> dict[str, object]:
    modules: dict[str, dict[str, int | float]] = {}
    for module in MODULES:
        counts = reports.get(module, {}).get(metric)
        if counts is None:
            return {"status": "unavailable", "modules": modules}
        covered, total = counts
        ratio = Fraction(covered, total)
        modules[module] = {
            "covered": covered,
            "total": total,
            "percent": round(float(ratio * 100), 2),
        }
    limiting_module = min(
        MODULES, key=lambda module: Fraction(*reports[module][metric])
    )
    covered, total = reports[limiting_module][metric]
    minimum = Fraction(covered, total)
    return {
        "status": "available",
        "covered": covered,
        "total": total,
        "percent": round(float(minimum * 100), 2),
        "limiting_module": limiting_module,
        "modules": modules,
    }


def _message(metric: str, result: dict[str, object]) -> tuple[str, str]:
    if result["status"] != "available":
        return "indisponível", COLORS["unavailable"]
    percent = float(result["percent"])
    if metric == "lines":
        color = COLORS["available-lines"]
    else:
        covered = int(result["covered"])
        total = int(result["total"])
        color = (
            COLORS["available-branches"]
            if covered * 100 >= total * 70
            else COLORS["below-threshold"]
        )
    return f"{percent:.2f}%", color


def _svg_badge(label: str, message: str, message_color: str) -> str:
    label_width = max(68, len(label) * 6 + 12)
    message_width = max(40, len(message) * 6 + 12)
    total_width = label_width + message_width
    accessible_text = html.escape(f"{label}: {message}")
    escaped_label = html.escape(label)
    escaped_message = html.escape(message)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{total_width}" height="20" '
        f'role="img" aria-label="{accessible_text}" viewBox="0 0 {total_width} 20">'
        f"<title>{accessible_text}</title>"
        f'<rect width="{total_width}" height="20" rx="3" fill="{COLORS["label"]}"/>'
        f'<rect x="{label_width}" width="{message_width}" height="20" '
        f'rx="3" fill="{message_color}"/>'
        '<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" '
        'font-size="11">'
        f'<text x="{label_width / 2:g}" y="14">{escaped_label}</text>'
        f'<text x="{label_width + message_width / 2:g}" y="14">{escaped_message}</text>'
        "</g></svg>\n"
    )


def _write_atomically(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as output:
            output.write(content)
        Path(temporary_name).replace(path)
    except OSError:
        try:
            Path(temporary_name).unlink(missing_ok=True)
        except OSError:
            pass
        raise


def _write_json_atomically(path: Path, value: dict[str, object]) -> None:
    _write_atomically(path, json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--frontend", type=Path, required=True, help="frontend schema v2 report")
    parser.add_argument("--backend", type=Path, required=True, help="backend schema v2 report")
    parser.add_argument("--output-directory", type=Path, required=True, help="directory for current SVGs and summary")
    parser.add_argument("--sha", required=True, help="full SHA of the trusted develop revision")
    parser.add_argument("--run-id", required=True, help="workflow run identifier")
    parser.add_argument("--run-attempt", type=int, required=True, help="workflow run attempt")
    args = parser.parse_args(argv)
    if not EXPECTED_SHA.fullmatch(args.sha):
        parser.error("--sha must be a full 40-character hexadecimal SHA")
    if not args.run_id.isdecimal() or args.run_attempt <= 0:
        parser.error("--run-id and --run-attempt must be positive decimal identifiers")

    identity: dict[str, str | int] = {
        "sha": args.sha,
        "run_id": args.run_id,
        "run_attempt": args.run_attempt,
    }
    reports, errors = _load_reports(
        {"frontend": args.frontend, "backend": args.backend}, identity
    )
    metric_results = {
        metric: _summarize_metric(metric, reports) for metric in METRICS
    }
    summary: dict[str, object] = {
        "schemaVersion": 1,
        "status": "available"
        if all(value["status"] == "available" for value in metric_results.values())
        else "unavailable",
        **identity,
        "metrics": metric_results,
        "reason": "; ".join(f"{name}: {reason}" for name, reason in sorted(errors.items()))
        or None,
    }

    try:
        args.output_directory.mkdir(parents=True, exist_ok=True)
        for metric in METRICS:
            message, color = _message(metric, metric_results[metric])
            _write_atomically(
                args.output_directory / f"coverage-{metric}.svg",
                _svg_badge(f"coverage-{metric}", message, color),
            )
        _write_json_atomically(args.output_directory / "coverage-summary.json", summary)
    except OSError as error:
        parser.exit(2, f"coverage badge generation failed: {error}\n")

    print(
        f"coverage badges {summary['status']}: "
        f"lines={_message('lines', metric_results['lines'])[0]}, "
        f"branches={_message('branches', metric_results['branches'])[0]}, "
        f"sha={args.sha} run_id={args.run_id} run_attempt={args.run_attempt}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
