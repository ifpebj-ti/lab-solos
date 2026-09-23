"""Tests for the design coverage validator.

The fixtures are copied to a temporary repository so these tests never mutate
the initiative's real inventory.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
VALID_FIXTURE = (
    Path(__file__).resolve().parent / "fixtures" / "design-coverage" / "valid"
)
VALIDATOR = REPOSITORY_ROOT / "scripts" / "check_design_coverage.py"


class DesignCoverageValidatorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.repo = Path(self.temp_dir.name)
        shutil.copytree(VALID_FIXTURE, self.repo, dirs_exist_ok=True)
        self.spec = self.repo / "spec"

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def run_validator(self, *extra_args: str) -> subprocess.CompletedProcess[str]:
        if not VALIDATOR.exists():
            return subprocess.CompletedProcess(
                args=[sys.executable, str(VALIDATOR)],
                returncode=127,
                stdout="",
                stderr="validator script is missing",
            )
        return subprocess.run(
            [
                sys.executable,
                str(VALIDATOR),
                "--spec",
                str(self.spec),
                "--repo-root",
                str(self.repo),
                *extra_args,
            ],
            cwd=REPOSITORY_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )

    def read_inventory(self) -> dict:
        return json.loads((self.spec / "cobertura.json").read_text(encoding="utf-8"))

    def write_inventory(self, inventory: dict) -> None:
        (self.spec / "cobertura.json").write_text(
            json.dumps(inventory, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    def surface(self) -> dict:
        return self.read_inventory()["superficies"][0]

    def test_valid_progressive_inventory_passes(self) -> None:
        result = self.run_validator()

        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("OK", result.stdout)

    def test_final_rejects_pending_inventory(self) -> None:
        result = self.run_validator("--final")

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("FINAL_INCOMPLETE", result.stdout)

    def test_final_accepts_surface_with_evidence_and_decision(self) -> None:
        inventory = self.read_inventory()
        surface = inventory["superficies"][0]
        surface["status"] = "redesenhada e validada"
        surface["evidencias"] = ["evidence/accepted.md"]
        surface["decisao"] = "decision-demo"
        self.write_inventory(inventory)

        result = self.run_validator("--final")

        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_rejects_route_omitted_from_inventory(self) -> None:
        inventory = self.read_inventory()
        inventory["superficies"] = []
        self.write_inventory(inventory)

        result = self.run_validator()

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("ROUTE_UNCOVERED", result.stdout)

    def test_rejects_duplicate_surface_id(self) -> None:
        inventory = self.read_inventory()
        inventory["superficies"].append(dict(inventory["superficies"][0]))
        self.write_inventory(inventory)

        result = self.run_validator()

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("DUPLICATE_ID", result.stdout)

    def test_rejects_unknown_task(self) -> None:
        inventory = self.read_inventory()
        inventory["superficies"][0]["tarefa"] = "T999"
        self.write_inventory(inventory)

        result = self.run_validator()

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("UNKNOWN_TASK", result.stdout)

    def test_rejects_unknown_wave_for_task(self) -> None:
        inventory = self.read_inventory()
        inventory["superficies"][0]["onda"] = 2
        self.write_inventory(inventory)

        result = self.run_validator()

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("WAVE_MISMATCH", result.stdout)

    def test_rejects_missing_evidence_file(self) -> None:
        inventory = self.read_inventory()
        surface = inventory["superficies"][0]
        surface["status"] = "redesenhada e validada"
        surface["evidencias"] = ["evidence/not-created.md"]
        surface["decisao"] = "decision-demo"
        self.write_inventory(inventory)

        result = self.run_validator()

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("EVIDENCE_MISSING", result.stdout)

    def test_rejects_evidence_outside_repository(self) -> None:
        inventory = self.read_inventory()
        inventory["superficies"][0]["evidencias"] = ["../outside.md"]
        self.write_inventory(inventory)

        result = self.run_validator()

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("EVIDENCE_OUTSIDE", result.stdout)

    def test_rejects_exclusion_without_explicit_decision(self) -> None:
        inventory = self.read_inventory()
        surface = inventory["superficies"][0]
        surface["status"] = "exclusão aprovada"
        surface["nao_aplicavel"] = ["Não se aplica ao perfil desta fixture."]
        self.write_inventory(inventory)

        result = self.run_validator()

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("EXCLUSION_DECISION", result.stdout)

    def test_rejects_false_conclusion_without_evidence(self) -> None:
        inventory = self.read_inventory()
        inventory["superficies"][0]["status"] = "compartilhada e validada"
        self.write_inventory(inventory)

        result = self.run_validator()

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("FALSE_CONCLUSION", result.stdout)


if __name__ == "__main__":
    unittest.main()
