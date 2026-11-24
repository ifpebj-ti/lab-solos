"""Normalize one complete .NET solution Cobertura report for the shared coverage gate."""

from __future__ import annotations

import argparse
import json
import os
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path


SERVER_ROOT = Path("backend") / "LabSolos-Server-DotNet8"
EXCLUDED_DIRECTORIES = {"bin", "obj", "generated", "__generated__", "migrations"}
EXCLUDED_SUFFIXES = (".designer.cs", ".generated.cs")
EXCLUDED_BASENAMES = {"globalusings.g.cs", "assemblyinfo.cs"}


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


def _read_counts(path: Path, repository_root: Path) -> tuple[int, int]:
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

    if not source_lines:
        raise ValueError("no eligible backend source files found in Cobertura report")
    denominator = sum(len(lines) for lines in source_lines.values())
    numerator = sum(
        sum(hits > 0 for hits in lines.values()) for lines in source_lines.values()
    )
    if denominator <= 0:
        raise ValueError("eligible backend source files have no executable lines")
    return numerator, denominator


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
    parser.add_argument("--output", type=Path, required=True, help="normalized backend coverage JSON")
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

        numerator, denominator = _read_counts(coverage_file, repository_root)
        report = {
            "module": "backend",
            "metric": "lines",
            "numerator": numerator,
            "denominator": denominator,
            "sha": args.sha,
            "run_id": args.run_id,
            "run_attempt": args.run_attempt,
        }
        _write_report(output, report)
    except (OSError, ValueError) as error:
        parser.exit(2, f"backend coverage collection failed: {error}\n")

    print(
        f"backend coverage normalized: {numerator}/{denominator} lines, "
        f"sha={args.sha} run_id={args.run_id} run_attempt={args.run_attempt}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
