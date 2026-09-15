import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
E2E = ROOT / "frontend" / "e2e"
CONFIG = ROOT / "frontend" / "playwright.config.ts"


class PlaywrightQualityContractTests(unittest.TestCase):
    def test_config_exposes_isolated_real_and_ui_projects(self):
        source = CONFIG.read_text(encoding="utf-8")

        self.assertRegex(source, r"name:\s*['\"]real['\"]")
        self.assertRegex(source, r"name:\s*['\"]ui['\"]")
        self.assertRegex(
            source,
            re.compile(r"name:\s*['\"]real['\"].*?fullyParallel:\s*false", re.S),
        )
        self.assertRegex(
            source,
            re.compile(r"name:\s*['\"]real['\"].*?retries:\s*0", re.S),
        )
        self.assertRegex(
            source,
            re.compile(r"name:\s*['\"]real['\"].*?workers:\s*1", re.S),
        )
        self.assertRegex(
            source,
            re.compile(r"name:\s*['\"]ui['\"].*?fullyParallel:\s*true", re.S),
        )

    def test_every_existing_case_is_classified_without_mixing_real_and_ui(self):
        source = CONFIG.read_text(encoding="utf-8")
        expected_real = {
            "**/credential-lifecycle.spec.ts",
            "**/user-data-contract.real.spec.ts",
            "**/infra/smoke.e2e.ts",
        }
        expected_ui = {
            "**/error-experience.spec.ts",
            "**/feature-visibility.spec.ts",
            "**/post-auth-navigation.spec.ts",
            "**/responsive-layout.spec.ts",
            "**/user-data-contract.spec.ts",
        }

        for pattern in expected_real | expected_ui:
            self.assertIn(pattern, source)

        self.assertIn("testIgnore", source)
        self.assertIn("credential-lifecycle.spec.ts", source)
        self.assertNotIn("user-data-contract.real.spec.ts',\n        testIgnore", source)

    def test_real_journeys_do_not_fulfill_domain_routes(self):
        real_files = [
            E2E / "credential-lifecycle.spec.ts",
            E2E / "user-data-contract.real.spec.ts",
            E2E / "infra" / "smoke.e2e.ts",
        ]
        for path in real_files:
            self.assertTrue(path.is_file(), path)
            source = path.read_text(encoding="utf-8")
            self.assertNotIn("route.fulfill", source, path.name)

    def test_scenario_helper_uses_compose_project_and_never_clears_mailbox(self):
        source = (E2E / "infra" / "e2e-data.ts").read_text(encoding="utf-8")
        self.assertIn("E2E_COMPOSE_PROJECT", source)
        self.assertIn("E2E_SEED_SCENARIO", source)
        self.assertIn("e2e-seed", source)
        self.assertNotIn("api/v1/messages`);", source)
        self.assertNotIn("console.log", source)

    def test_credentials_cases_are_filterable_and_recipient_scoped(self):
        source = (E2E / "credential-lifecycle.spec.ts").read_text(encoding="utf-8")
        for marker in ("credenciais", "login", "recuper", "troca"):
            self.assertIn(marker, source.lower())
        self.assertRegex(source, r"findMailpit[^\n]*Recipient|recipient[^\n]*Mailpit", re.I)
        self.assertNotIn("synthetic-e2e-admin@example.invalid", source)
        self.assertNotIn("request.delete", source)


if __name__ == "__main__":
    unittest.main()
