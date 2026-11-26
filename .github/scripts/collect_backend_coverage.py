"""Collect backend coverage for one complete .NET test run.

When supplied, ReportGenerator's Summary.json is the source of truth so the
gate and badges use the same branch counts shown by the backend HTML artifact.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path


SERVER_ROOT = Path("backend") / "LabSolos-Server-DotNet8"
EXCLUDED_DIRECTORIES = {"bin", "obj", "generated", "__generated__", "migrations"}
EXCLUDED_SUFFIXES = (".designer.cs", ".generated.cs")
EXCLUDED_BASENAMES = {"globalusings.g.cs", "assemblyinfo.cs"}


def _unique_json_fields(pairs: list[tuple[str, object]]) -> dict[str, object]:
    fields: dict[str, object] = {}
    for key, value in pairs:
        if key in fields:
            raise ValueError(f"duplicate JSON field {ascii(key)}")
        fields[key] = value
    return fields


def _summary_metric(
    summary: dict[str, object], covered_name: str, total_name: str
) -> tuple[int, int]:
    covered = summary.get(covered_name)
    total = summary.get(total_name)
    if type(covered) is not int or type(total) is not int:
        raise ValueError(f"ReportGenerator {covered_name}/{total_name} must be integer counts")
    if total <= 0 or covered < 0 or covered > total:
        raise ValueError(f"ReportGenerator {covered_name}/{total_name} counts are inconsistent")
    return covered, total


def _read_reportgenerator_counts(path: Path) -> tuple[int, int, int, int]:
    try:
        content = path.read_text(encoding="utf-8")
    except FileNotFoundError as error:
        raise ValueError(f"ReportGenerator summary is missing: {path}") from error
    except (OSError, UnicodeError) as error:
        raise ValueError(f"cannot read ReportGenerator summary: {path}") from error
    if not content.strip():
        raise ValueError(f"ReportGenerator summary is empty: {path}")
    try:
        report = json.loads(content, object_pairs_hook=_unique_json_fields)
    except (ValueError, RecursionError) as error:
        raise ValueError(f"invalid ReportGenerator summary JSON in {path}: {error}") from error
    if not isinstance(report, dict):
        raise ValueError(f"expected a JSON object in ReportGenerator summary: {path}")
    summary = report.get("summary")
    if not isinstance(summary, dict):
        raise ValueError("ReportGenerator summary object is missing")
    if summary.get("parser") != "Cobertura":
        raise ValueError("ReportGenerator summary must be generated from Cobertura")
    lines_covered, lines_total = _summary_metric(
        summary, "coveredlines", "coverablelines"
    )
    branches_covered, branches_total = _summary_metric(
        summary, "coveredbranches", "totalbranches"
    )
    return lines_covered, lines_total, branches_covered, branches_total


def _line_identity(raw_number: str, raw_hits: str, filename: str) -> tuple[int, int]:
    try:
        number = int(raw_number)
    except (TypeError, ValueError) as error:
        raise ValueError(f"line number must be a positive integer: {filename}") from error
    try:
        hits = int(raw_hits)
    except (TypeError, ValueError) as error:
        raise ValueError(f"line hits must be a nonnegative integer: {filename}") from error
    if number <= 0:
        raise ValueError(f"line number must be a positive integer: {filename}")
    if hits < 0:
        raise ValueError(f"line hits must be a nonnegative integer: {filename}")
    return number, hits


def _candidate_paths(
    filename: str, sources: list[str], repository_root: Path
) -> list[Path]:
    normalized = filename.replace("\\", "/")
    candidate = Path(normalized)
    if candidate.is_absolute():
        return [candidate]

    paths: list[Path] = []
    for source in sources:
        if not source.strip():
            continue
        source_path = Path(source.replace("\\", "/"))
        if not source_path.is_absolute():
            source_path = repository_root / source_path
        paths.append(source_path / candidate)
    paths.append(repository_root / candidate)
    return paths


def _source_relative_path(
    filename: str, sources: list[str], repository_root: Path
) -> Path | None:
    for candidate in _candidate_paths(filename, sources, repository_root):
        try:
            relative = candidate.resolve(strict=False).relative_to(repository_root)
        except (OSError, ValueError):
            continue
        if relative.parts[: len(SERVER_ROOT.parts)] != SERVER_ROOT.parts:
            continue
        source_parts = relative.parts[len(SERVER_ROOT.parts) :]
        if len(source_parts) < 2:
            continue
        if any(part.lower() in EXCLUDED_DIRECTORIES for part in source_parts[:-1]):
            continue
        basename = source_parts[-1].lower()
        if not basename.endswith(".cs") or basename.endswith(EXCLUDED_SUFFIXES):
            continue
        if basename in EXCLUDED_BASENAMES or basename.endswith((".tests.cs", ".test.cs")):
            continue
        return relative
    return None


def _condition_identity(condition: ET.Element, filename: str, line_number: int) -> tuple[str, str, bool]:
    number = (condition.get("number") or "").strip()
    condition_type = (condition.get("type") or "").strip()
    if not number or not condition_type:
        raise ValueError(
            f"branch condition is missing its number or type: {filename}:{line_number}"
        )
    raw_coverage = (condition.get("coverage") or "").strip()
    match = re.fullmatch(r"(\d+(?:\.\d+)?)%", raw_coverage)
    if match is None:
        raise ValueError(
            f"branch condition has invalid coverage metadata: {filename}:{line_number}"
        )
    coverage = float(match.group(1))
    if not 0 <= coverage <= 100:
        raise ValueError(
            f"branch condition coverage must be between 0% and 100%: {filename}:{line_number}"
        )
    return number, condition_type, coverage > 0


def _read_counts(path: Path, repository_root: Path) -> tuple[int, int, int, int]:
    try:
        content = path.read_bytes()
    except FileNotFoundError as error:
        raise ValueError(f"coverage report is missing: {path}") from error
    except OSError as error:
        raise ValueError(f"cannot read coverage report: {path}") from error
    if not content.strip():
        raise ValueError(f"coverage report is empty: {path}")
    if b"<!DOCTYPE" in content.upper() or b"<!ENTITY" in content.upper():
        raise ValueError("DTD and entity declarations are not accepted in coverage reports")
    try:
        root = ET.fromstring(content)
    except (ET.ParseError, ValueError, RecursionError) as error:
        raise ValueError(f"invalid Cobertura XML in {path}: {error}") from error
    if root.tag != "coverage":
        raise ValueError(f"expected Cobertura <coverage> root in {path}")

    sources_element = root.find("sources")
    sources = [
        (source.text or "").strip()
        for source in (sources_element.findall("source") if sources_element is not None else [])
    ]
    source_lines: dict[Path, dict[int, int]] = {}
    source_branches: dict[tuple[Path, int, str, str], bool] = {}
    for class_element in root.findall(".//class"):
        filename = class_element.get("filename")
        if not filename:
            raise ValueError("Cobertura class is missing its filename")
        relative = _source_relative_path(filename, sources, repository_root)
        if relative is None:
            continue
        lines_element = class_element.find("lines")
        if lines_element is None:
            continue
        line_counts = source_lines.setdefault(relative, {})
        for line_element in lines_element.findall("line"):
            number, hits = _line_identity(
                line_element.get("number", ""), line_element.get("hits", ""), filename
            )
            # Partial classes and methods can report one source line more than once.
            # Count the line once and treat it as visited if any report observed a hit.
            line_counts[number] = max(hits, line_counts.get(number, 0))

            branch_flag = (line_element.get("branch") or "false").strip().lower()
            if branch_flag not in {"true", "false"}:
                raise ValueError(
                    f"line branch flag must be true or false: {filename}:{number}"
                )
            conditions_element = line_element.find("conditions")
            conditions = (
                conditions_element.findall("condition")
                if conditions_element is not None
                else []
            )
            if branch_flag == "false":
                if conditions:
                    raise ValueError(
                        f"non-branch line contains branch conditions: {filename}:{number}"
                    )
                continue
            if not conditions:
                raise ValueError(
                    f"branch line is missing condition metadata: {filename}:{number}"
                )

            seen_conditions: set[tuple[str, str]] = set()
            for condition in conditions:
                condition_number, condition_type, covered = _condition_identity(
                    condition, filename, number
                )
                identity = (condition_number, condition_type)
                if identity in seen_conditions:
                    raise ValueError(
                        f"duplicate branch condition metadata: {filename}:{number}"
                    )
                seen_conditions.add(identity)
                branch_identity = (relative, number, condition_type, condition_number)
                source_branches[branch_identity] = (
                    covered or source_branches.get(branch_identity, False)
                )

    if not source_lines:
        raise ValueError("no eligible backend source files found in Cobertura report")
    denominator = sum(len(lines) for lines in source_lines.values())
    numerator = sum(
        sum(hits > 0 for hits in lines.values()) for lines in source_lines.values()
    )
    if denominator <= 0:
        raise ValueError("eligible backend source files have no executable lines")
    if not source_branches:
        raise ValueError("no eligible backend branch conditions found in Cobertura report")
    branch_numerator = sum(source_branches.values())
    branch_denominator = len(source_branches)
    return numerator, denominator, branch_numerator, branch_denominator


def _write_report(path: Path, report: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as output:
            json.dump(report, output, ensure_ascii=False, indent=2)
            output.write("\n")
        Path(temporary_name).replace(path)
    except OSError:
        try:
            Path(temporary_name).unlink(missing_ok=True)
        except OSError:
            pass
        raise


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--coverage-file",
        type=Path,
        required=True,
        help="Cobertura report from one full solution run",
    )
    parser.add_argument(
        "--reportgenerator-summary",
        type=Path,
        help="ReportGenerator Summary.json from this run's backend HTML artifact",
    )
    parser.add_argument("--output", type=Path, required=True, help="backend coverage JSON")
    parser.add_argument("--repository-root", type=Path, required=True, help="repository root")
    parser.add_argument(
        "--results-directory",
        type=Path,
        required=True,
        help="exclusive results directory for this complete solution run, named <run-id>/<attempt>",
    )
    parser.add_argument("--sha", required=True, help="SHA of the tested revision")
    parser.add_argument("--run-id", required=True, help="workflow run identifier")
    parser.add_argument("--run-attempt", type=int, required=True, help="workflow run attempt")
    args = parser.parse_args(argv)
    if not all(value.strip() for value in (args.sha, args.run_id)):
        parser.error("--sha and --run-id must be nonempty")
    if args.run_attempt <= 0:
        parser.error("--run-attempt must be positive")

    try:
        repository_root = args.repository_root.resolve(strict=True)
        results_directory = args.results_directory.resolve(strict=True)
        if not results_directory.is_dir():
            raise ValueError(f"coverage results directory is not a directory: {results_directory}")
        if (
            results_directory.name != str(args.run_attempt)
            or results_directory.parent.name != args.run_id
        ):
            raise ValueError(
                "coverage results directory must be dedicated to the selected run and attempt"
            )

        coverage_file = args.coverage_file.resolve(strict=False)
        output = args.output.resolve(strict=False)
        try:
            coverage_location = coverage_file.relative_to(results_directory)
        except ValueError as error:
            raise ValueError(
                "coverage report is outside this full solution run's results directory"
            ) from error
        if (
            len(coverage_location.parts) != 2
            or coverage_location.name.lower() != "coverage.cobertura.xml"
        ):
            raise ValueError(
                "coverage report must come directly from the VSTest results folder for this full solution run"
            )
        try:
            output.relative_to(results_directory)
        except ValueError as error:
            raise ValueError(
                "normalized report is outside this full solution run's results directory"
            ) from error

        if args.reportgenerator_summary is not None:
            if not coverage_file.is_file():
                raise ValueError(f"coverage report is missing: {coverage_file}")
            reportgenerator_summary = args.reportgenerator_summary.resolve(strict=False)
            try:
                summary_location = reportgenerator_summary.relative_to(results_directory)
            except ValueError as error:
                raise ValueError(
                    "ReportGenerator summary is outside this full solution run's results directory"
                ) from error
            if summary_location.parts != ("html", "Summary.json"):
                raise ValueError(
                    "ReportGenerator summary must be html/Summary.json from this full solution run"
                )
            lines_covered, lines_total, branches_covered, branches_total = (
                _read_reportgenerator_counts(reportgenerator_summary)
            )
            measurement_source = "ReportGenerator Summary.json"
        else:
            lines_covered, lines_total, branches_covered, branches_total = _read_counts(
                coverage_file, repository_root
            )
            measurement_source = "Cobertura normalization"
        report = {
            "schemaVersion": 2,
            "module": "backend",
            "metrics": {
                "lines": {"covered": lines_covered, "total": lines_total},
                "branches": {"covered": branches_covered, "total": branches_total},
            },
            "sha": args.sha,
            "run_id": args.run_id,
            "run_attempt": args.run_attempt,
        }
        _write_report(output, report)
    except (OSError, ValueError) as error:
        parser.exit(2, f"backend coverage collection failed: {error}\n")

    print(
        f"backend coverage ({measurement_source}): lines={lines_covered}/{lines_total}, "
        f"branches={branches_covered}/{branches_total}, "
        f"sha={args.sha} run_id={args.run_id} run_attempt={args.run_attempt}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
