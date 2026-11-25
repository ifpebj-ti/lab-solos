from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from types import ModuleType


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
PUBLISHER_PATH = REPOSITORY_ROOT / ".github" / "scripts" / "publish_coverage_badges.py"


def load_publisher() -> ModuleType:
    if not PUBLISHER_PATH.is_file():
        raise AssertionError(f"coverage badge publisher is missing: {PUBLISHER_PATH}")
    spec = importlib.util.spec_from_file_location("publish_coverage_badges", PUBLISHER_PATH)
    if spec is None or spec.loader is None:
        raise AssertionError("coverage badge publisher could not be loaded")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def report(module: str, lines: tuple[int, int], branches: tuple[int, int], sha: str = "a" * 40) -> dict:
    return {
        "schemaVersion": 2,
        "module": module,
        "sha": sha,
        "run_id": "12345",
        "run_attempt": 2,
        "metrics": {
            "lines": {"covered": lines[0], "total": lines[1]},
            "branches": {"covered": branches[0], "total": branches[1]},
        },
    }


class CoverageBadgeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.publisher = load_publisher()

    def invoke(
        self,
        directory: Path,
        frontend: dict | None,
        backend: dict | None,
    ) -> tuple[Path, Path, Path]:
        frontend_path = directory / "frontend.json"
        backend_path = directory / "backend.json"
        if frontend is not None:
            frontend_path.write_text(json.dumps(frontend), encoding="utf-8")
        if backend is not None:
            backend_path.write_text(json.dumps(backend), encoding="utf-8")
        output = directory / "badges"
        result = self.publisher.main(
            [
                "--frontend", str(frontend_path),
                "--backend", str(backend_path),
                "--output-directory", str(output),
                "--sha", "a" * 40,
                "--run-id", "12345",
                "--run-attempt", "2",
            ]
        )
        self.assertEqual(result, 0)
        return (
            output / "coverage-lines.svg",
            output / "coverage-branches.svg",
            output / "coverage-summary.json",
        )

    def test_badges_show_the_lower_module_and_summary_identity(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            lines, branches, summary_path = self.invoke(
                root,
                report("frontend", (80, 100), (70, 100)),
                report("backend", (61, 100), (92, 100)),
            )

            lines_svg = lines.read_text(encoding="utf-8")
            branches_svg = branches.read_text(encoding="utf-8")
            self.assertIn("coverage-lines", lines_svg)
            self.assertIn("61.00%", lines_svg)
            self.assertNotIn("80.00%", lines_svg)
            self.assertIn("coverage-branches", branches_svg)
            self.assertIn("70.00%", branches_svg)
            self.assertIn("#2e7d32", branches_svg)

            summary = json.loads(summary_path.read_text(encoding="utf-8"))
            self.assertEqual(summary["sha"], "a" * 40)
            self.assertEqual(summary["run_id"], "12345")
            self.assertEqual(summary["run_attempt"], 2)
            self.assertEqual(summary["metrics"]["lines"]["percent"], 61.0)
            self.assertEqual(summary["metrics"]["branches"]["percent"], 70.0)

    def test_lines_are_informative_and_below_threshold_branches_are_red(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            lines, branches, _summary = self.invoke(
                Path(temporary),
                report("frontend", (40, 100), (69, 100)),
                report("backend", (75, 100), (90, 100)),
            )
            lines_svg = lines.read_text(encoding="utf-8")
            branches_svg = branches.read_text(encoding="utf-8")
            self.assertIn("40.00%", lines_svg)
            self.assertIn("#2563eb", lines_svg)
            self.assertIn("69.00%", branches_svg)
            self.assertIn("#b91c1c", branches_svg)

    def test_unrounded_branch_ratio_below_threshold_remains_red(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            _lines, branches, _summary = self.invoke(
                Path(temporary),
                report("frontend", (80, 100), (69_999, 100_000)),
                report("backend", (80, 100), (80, 100)),
            )
            svg = branches.read_text(encoding="utf-8")
            self.assertIn("70.00%", svg)
            self.assertIn("#b91c1c", svg)

    def test_missing_input_overwrites_stale_badges_with_unavailable_state(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            output = root / "badges"
            output.mkdir()
            for name in ("coverage-lines.svg", "coverage-branches.svg"):
                (output / name).write_text("99.99%", encoding="utf-8")

            lines, branches, summary_path = self.invoke(
                root, report("frontend", (99, 100), (99, 100)), None
            )
            for path in (lines, branches):
                svg = path.read_text(encoding="utf-8")
                self.assertIn("indisponível", svg)
                self.assertIn("#9ca3af", svg)
                self.assertNotIn("99.99%", svg)
            summary = json.loads(summary_path.read_text(encoding="utf-8"))
            self.assertEqual(summary["status"], "unavailable")

    def test_identity_mismatch_invalidates_badges_instead_of_reusing_values(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            bad_backend = report("backend", (95, 100), (95, 100), sha="b" * 40)
            lines, branches, summary_path = self.invoke(
                Path(temporary),
                report("frontend", (95, 100), (95, 100)),
                bad_backend,
            )
            self.assertIn("indisponível", lines.read_text(encoding="utf-8"))
            self.assertIn("indisponível", branches.read_text(encoding="utf-8"))
            summary = json.loads(summary_path.read_text(encoding="utf-8"))
            self.assertIn("identity", summary["reason"])

    def test_invalid_branches_only_make_the_branch_badge_unavailable(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            invalid = report("frontend", (80, 100), (0, 0))
            lines, branches, summary_path = self.invoke(
                Path(temporary),
                invalid,
                report("backend", (75, 100), (80, 100)),
            )
            self.assertIn("75.00%", lines.read_text(encoding="utf-8"))
            self.assertIn("indisponível", branches.read_text(encoding="utf-8"))
            summary = json.loads(summary_path.read_text(encoding="utf-8"))
            self.assertEqual(summary["metrics"]["lines"]["status"], "available")
            self.assertEqual(summary["metrics"]["branches"]["status"], "unavailable")


if __name__ == "__main__":
    unittest.main()
