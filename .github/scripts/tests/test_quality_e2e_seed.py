import re
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
SEED_ROOT = REPOSITORY_ROOT / "backend" / "TestSupport" / "E2ESeed"
COMPOSE_PATH = REPOSITORY_ROOT / "docker-compose-e2e.yml"


class E2ESeedContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.runner = (SEED_ROOT / "E2eSeedRunner.cs").read_text(encoding="utf-8")
        cls.options = (SEED_ROOT / "SeedOptions.cs").read_text(encoding="utf-8")
        cls.program = (SEED_ROOT / "Program.cs").read_text(encoding="utf-8")
        cls.dockerfile = (SEED_ROOT / "Dockerfile").read_text(encoding="utf-8")
        cls.compose = COMPOSE_PATH.read_text(encoding="utf-8")

    def test_seed_project_is_a_separate_executable_with_a_lockfile(self) -> None:
        project = (SEED_ROOT / "E2ESeed.csproj").read_text(encoding="utf-8")
        self.assertIn("<OutputType>Exe</OutputType>", project)
        self.assertIn("ProjectReference", project)
        self.assertTrue((SEED_ROOT / "packages.lock.json").is_file())

    def test_cli_accepts_scenario_and_does_not_print_passwords(self) -> None:
        self.assertIn('"--help"', self.options)
        self.assertIn('"--scenario"', self.options)
        self.assertIn('command: ["--scenario", "${E2E_SEED_SCENARIO:-default}"]', self.compose)
        self.assertNotRegex(self.runner, r"Console\.WriteLine\([^\n]*Password")
        output_start = self.runner.index("JsonSerializer.Serialize")
        output_end = self.runner.index("));", output_start)
        self.assertNotIn("Password", self.runner[output_start:output_end])

    def test_safety_contract_restricts_environment_and_database(self) -> None:
        self.assertIn('E2E_SEED_ENVIRONMENT', self.options)
        self.assertIn('string.Equals(environmentName, "E2E"', self.options)
        self.assertIn('string.Equals(parsed.Host, "db"', self.options)
        self.assertIn('string.Equals(parsed.Database, "lab_solos_e2e"', self.options)
        self.assertIn('string.Equals(parsed.Username, "lab_solos_e2e"', self.options)
        self.assertIn('CanConnectAsync', self.runner)
        self.assertNotIn("Database.Migrate", self.runner)

    def test_compose_service_uses_health_and_private_network(self) -> None:
        service = self.compose.split("  e2e-seed:", 1)[1]
        self.assertIn("profiles:", service)
        self.assertIn("TestSupport/E2ESeed/Dockerfile", service)
        self.assertIn("condition: service_healthy", service)
        self.assertIn("e2e_private", service)
        for variable in (
            "E2E_SEED_ADMIN_PASSWORD",
            "E2E_SEED_MENTOR_PASSWORD",
            "E2E_SEED_BORROWER_PASSWORD",
        ):
            self.assertIn(variable, service)
        self.assertNotRegex(service, r"command:.*PASSWORD")

    def test_dockerfile_does_not_copy_outside_backend_context(self) -> None:
        self.assertRegex(self.dockerfile, r"FROM .*@sha256:[0-9a-f]{64} AS build")
        self.assertRegex(self.dockerfile, r"RUN dotnet restore .*--locked-mode")
        self.assertRegex(self.dockerfile, r"RUN dotnet publish .*--no-restore")
        self.assertNotRegex(self.dockerfile, r"(?m)^COPY\s+.*\.\./")


if __name__ == "__main__":
    unittest.main()
