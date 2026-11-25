from __future__ import annotations

import fnmatch
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
CODEOWNERS = REPOSITORY_ROOT / ".github" / "CODEOWNERS"
EXPECTED_OWNER = "@nathannmvr"
AREA_RULES = ("/frontend/", "/backend/", "/.github/")
REPRESENTATIVE_PATHS = {
    "frontend/src/App.tsx": "/frontend/",
    "backend/LabSolos-Server-DotNet8/Program.cs": "/backend/",
    ".github/workflows/container-ci.yml": "/.github/",
    "README.md": "*",
}


def _read_rules() -> list[tuple[str, tuple[str, ...]]]:
    rules = []
    content = CODEOWNERS.read_text(encoding="utf-8")
    for line_number, raw_line in enumerate(content.splitlines(), 1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        if len(parts) < 2:
            raise AssertionError(f"invalid CODEOWNERS rule at line {line_number}: {raw_line}")
        pattern, *owners = parts
        rules.append((pattern, tuple(owners)))
    return rules


def _matches(pattern: str, path: str) -> bool:
    normalized = path.lstrip("/")
    if pattern == "*":
        return True
    pattern_path = pattern.lstrip("/")
    if pattern_path.endswith("/"):
        directory = pattern_path.rstrip("/")
        return normalized == directory or normalized.startswith(directory + "/")
    return fnmatch.fnmatchcase(normalized, pattern_path)


def _owners_for(path: str, rules: list[tuple[str, tuple[str, ...]]]) -> tuple[str, ...]:
    owners: tuple[str, ...] = ()
    for pattern, rule_owners in rules:
        if _matches(pattern, path):
            owners = rule_owners
    return owners


class CodeownersTests(unittest.TestCase):
    def test_all_repository_areas_have_a_responsible_owner(self) -> None:
        rules = _read_rules()
        patterns = [pattern for pattern, _owners in rules]
        fallback_index = patterns.index("*")

        for area_rule in AREA_RULES:
            with self.subTest(area=area_rule):
                self.assertIn(area_rule, patterns)
                self.assertLess(patterns.index(area_rule), fallback_index)
                self.assertEqual(_owners_for(area_rule.strip("/"), rules), (EXPECTED_OWNER,))

        for path, expected_rule in REPRESENTATIVE_PATHS.items():
            with self.subTest(path=path):
                self.assertEqual(_owners_for(path, rules), (EXPECTED_OWNER,))
                self.assertIn(expected_rule, patterns)

    def test_last_matching_area_rule_precedes_the_fallback(self) -> None:
        rules = _read_rules()
        matching = [
            pattern
            for pattern, _owners in rules
            if _matches(pattern, ".github/workflows/check.yml")
        ]
        self.assertEqual(matching[-2:], ["/.github/", "*"])
        self.assertEqual(_owners_for(".github/workflows/check.yml", rules), (EXPECTED_OWNER,))

    def test_every_rule_has_at_least_one_valid_owner(self) -> None:
        for pattern, owners in _read_rules():
            with self.subTest(pattern=pattern):
                self.assertTrue(pattern)
                self.assertTrue(owners)
                self.assertTrue(all(owner.startswith("@") and len(owner) > 1 for owner in owners))


if __name__ == "__main__":
    unittest.main()
