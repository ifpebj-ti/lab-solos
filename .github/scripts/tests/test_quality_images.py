import json
import re
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
TOOLCHAIN_PATH = REPOSITORY_ROOT / ".github" / "quality" / "toolchain.json"
COMPOSE_PATH = REPOSITORY_ROOT / "docker-compose-e2e.yml"
BACKEND_DOCKERFILE = REPOSITORY_ROOT / "backend" / "Dockerfile"
FRONTEND_DOCKERFILE = REPOSITORY_ROOT / "frontend" / "Dockerfile"
FIXTURE_PATH = (
    REPOSITORY_ROOT
    / "backend"
    / "Tests"
    / "Infrastructure"
    / "PostgreSqlContainerFixture.cs"
)


class QualityImageContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.toolchain = json.loads(TOOLCHAIN_PATH.read_text(encoding="utf-8"))
        cls.compose = COMPOSE_PATH.read_text(encoding="utf-8")
        cls.backend = BACKEND_DOCKERFILE.read_text(encoding="utf-8")
        cls.frontend = FRONTEND_DOCKERFILE.read_text(encoding="utf-8")
        cls.fixture = FIXTURE_PATH.read_text(encoding="utf-8")

    def test_toolchain_records_every_validation_image_with_a_verified_digest(self) -> None:
        images = self.toolchain.get("images")
        self.assertIsInstance(images, dict)

        expected = {
            "backend-sdk": "mcr.microsoft.com/dotnet/sdk:8.0.419-bookworm-slim",
            "backend-runtime": "mcr.microsoft.com/dotnet/aspnet:8.0.30-bookworm-slim",
            "frontend-node": "node:20.20.2-bookworm-slim",
            "frontend-runtime": "nginx:1.29.3-alpine-slim",
            "compose-smtp-cert": "alpine/openssl:3.3.1",
            "compose-smtp": "axllent/mailpit:v1.28.0",
            "compose-postgres": "postgres:15-alpine",
            "testcontainers-postgres": "postgres:16-alpine",
        }

        for name, image in expected.items():
            with self.subTest(name=name):
                specification = images.get(name)
                self.assertIsInstance(specification, dict)
                self.assertEqual(specification.get("image"), image)
                self.assertRegex(
                    specification.get("digest", ""),
                    r"^sha256:[0-9a-f]{64}$",
                )
                self.assertTrue(specification.get("resolvedAt"))

    def test_dockerfiles_use_only_digest_pinned_base_images(self) -> None:
        for name, dockerfile in (
            ("backend", self.backend),
            ("frontend", self.frontend),
        ):
            from_lines = re.findall(r"(?m)^FROM\s+([^\s]+)", dockerfile)
            self.assertGreaterEqual(len(from_lines), 2, name)
            for image in from_lines:
                with self.subTest(name=name, image=image):
                    self.assertRegex(image, r"@sha256:[0-9a-f]{64}$")

    def test_sdk_image_matches_the_repository_global_json(self) -> None:
        global_json = json.loads(
            (REPOSITORY_ROOT / "global.json").read_text(encoding="utf-8")
        )
        sdk_version = global_json["sdk"]["version"]
        self.assertRegex(
            self.backend,
            rf"(?m)^FROM\s+mcr\.microsoft\.com/dotnet/sdk:{re.escape(sdk_version)}-[^\s]+@sha256:[0-9a-f]{{64}}\s+AS\s+build$",
        )

    def test_compose_uses_the_recorded_images_and_keeps_postgres_15(self) -> None:
        images = self.toolchain["images"]
        for name in ("compose-smtp-cert", "compose-smtp", "compose-postgres"):
            specification = images[name]
            reference = f"{specification['image']}@{specification['digest']}"
            self.assertIn(f"image: {reference}", self.compose)

        self.assertRegex(
            self.compose,
            r"(?m)^\s+image:\s+postgres:15-alpine@sha256:[0-9a-f]{64}\s*$",
        )
        self.assertNotIn("postgres:16-alpine", self.compose)

    def test_testcontainers_keeps_postgres_16_with_the_recorded_digest(self) -> None:
        specification = self.toolchain["images"]["testcontainers-postgres"]
        reference = f"{specification['image']}@{specification['digest']}"
        self.assertIn(reference, self.fixture)
        self.assertNotIn("postgres:15-alpine", self.fixture)

    def test_all_published_test_ports_are_loopback_only(self) -> None:
        published_ports = re.findall(
            r'(?m)^\s+-\s+"([^"\n]*:\d+)"\s*$', self.compose
        )
        self.assertEqual(len(published_ports), 3)
        self.assertTrue(all(port.startswith("127.0.0.1:") for port in published_ports))

    def test_compose_does_not_reuse_the_previous_auth_e2e_project_name(self) -> None:
        self.assertNotIn("lab-solos-auth-e2e", self.compose)
        self.assertNotRegex(self.compose, r"(?m)^\s+name:\s+lab-solos-auth-e2e\s*$")


if __name__ == "__main__":
    unittest.main()
