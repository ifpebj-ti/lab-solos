"""Normalize Vitest's coverage summary for the shared coverage gate."""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from pathlib import Path
from typing import NoReturn


SOURCE_ROOT = Path("frontend") / "src"
SOURCE_SUFFIXES = {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".mts", ".cts"}
EXCLUDED_DIRECTORIES = {
    "__generated__",
    "__mocks__",
    "__tests__",
    "coverage",
    "fixtures",
    "generated",
    "test",
    "tests",
}
EXCLUDED_SUFFIXES = (".d.ts", ".d.tsx", ".generated.js", ".generated.jsx", ".generated.ts", ".generated.tsx")
EXCLUDED_STEMS = {"vite-env"}


def _unique_fields(pairs: list[tuple[str, object]]) -> dict[str, object]:
    fields: dict[str, object] = {}
    for key, value in pairs:
        if key in fields:
            raise ValueError(f"duplicate JSON field {ascii(key)}")
        fields[key] = value
    return fields


def _reject_nonfinite(constant: str) -> NoReturn:
    raise ValueError(f"invalid JSON number {constant}")


def _read_summary(path: Path) -> dict[str, object]:
    try:
        content = path.read_text(encoding="utf-8")
    except FileNotFoundError as error:
        raise ValueError(f"coverage summary is missing: {path}") from error
    except (OSError, UnicodeError) as error:
        raise ValueError(f"cannot read coverage summary: {path}") from error
    if not content.strip():
        raise ValueError(f"coverage summary is empty: {path}")
    try:
        summary = json.loads(
            content,
            object_pairs_hook=_unique_fields,
            parse_constant=_reject_nonfinite,
        )
    except (ValueError, RecursionError) as error:
        raise ValueError(f"invalid coverage summary in {path}: {error}") from error
    if not isinstance(summary, dict):
        raise ValueError(f"expected a JSON object in coverage summary: {path}")
    return summary


def _source_relative_path(filename: str, repository_root: Path) -> Path | None:
    candidate = Path(filename)
    if not candidate.is_absolute():
        candidate = repository_root / candidate
    try:
        relative = candidate.resolve(strict=False).relative_to(repository_root)
    except (OSError, ValueError):
        return None

    if relative.parts[:2] != SOURCE_ROOT.parts or not relative.parts[2:]:
        return None
    source_parts = relative.parts[2:]
    if any(part.lower() in EXCLUDED_DIRECTORIES for part in source_parts[:-1]):
        return None

    basename = source_parts[-1].lower()
    path = Path(basename)
    if path.suffix not in SOURCE_SUFFIXES:
        return None
    if path.stem.endswith((".test", ".spec", ".stories")):
        return None
    if basename in EXCLUDED_STEMS or basename.endswith(EXCLUDED_SUFFIXES):
        return None
    return relative


def _line_counts(coverage: object, filename: str) -> tuple[int, int]:
    if not isinstance(coverage, dict):
        raise ValueError(f"coverage entry must be an object: {filename}")
    lines = coverage.get("lines")
    if not isinstance(lines, dict):
        raise ValueError(f"line counts are missing: {filename}")

    total = lines.get("total")
    covered = lines.get("covered")
    if type(total) is not int or total < 0:
        raise ValueError(f"total line count must be a nonnegative integer: {filename}")
    if type(covered) is not int or covered < 0:
        raise ValueError(f"covered line count must be a nonnegative integer: {filename}")
    if covered > total:
        raise ValueError(f"covered line count exceeds total line count: {filename}")
    return covered, total


def _collect_counts(summary: dict[str, object], repository_root: Path) -> tuple[int, int]:
    numerator = 0
    denominator = 0
    seen: set[Path] = set()

    for filename, coverage in summary.items():
        if filename == "total":
            continue
        if not isinstance(filename, str):
            raise ValueError("coverage summary file paths must be strings")
        relative = _source_relative_path(filename, repository_root)
        if relative is None:
            continue
        if relative in seen:
            raise ValueError(f"duplicate normalized source path: {relative.as_posix()}")
        seen.add(relative)
        covered, total = _line_counts(coverage, filename)
        numerator += covered
        denominator += total

    if not seen:
        raise ValueError("no eligible frontend source files found in coverage summary")
    if denominator <= 0:
        raise ValueError("eligible frontend source files have no executable lines")
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
            # Preserve the original report-write error; removing its temporary file is best effort.
            pass
        raise


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--summary", type=Path, required=True, help="Vitest JSON summary")
    parser.add_argument("--output", type=Path, required=True, help="normalized coverage JSON")
    parser.add_argument("--repository-root", type=Path, required=True, help="repository root")
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
        summary = _read_summary(args.summary)
        numerator, denominator = _collect_counts(summary, repository_root)
        report = {
            "module": "frontend",
            "metric": "lines",
            "numerator": numerator,
            "denominator": denominator,
            "sha": args.sha,
            "run_id": args.run_id,
            "run_attempt": args.run_attempt,
        }
        _write_report(args.output, report)
    except (OSError, ValueError) as error:
        parser.exit(2, f"coverage collection failed: {error}\n")

    print(
        f"frontend coverage normalized: {numerator}/{denominator} lines, "
        f"sha={args.sha} run_id={args.run_id} run_attempt={args.run_attempt}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
