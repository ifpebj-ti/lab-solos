import re
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
DOCKERFILE = REPOSITORY_ROOT / "backend" / "Dockerfile"


class BackendContainerContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.dockerfile = DOCKERFILE.read_text(encoding="utf-8")

    def test_uses_dotnet_8_multistage_build_and_aspnet_runtime(self) -> None:
        self.assertRegex(
            self.dockerfile,
            r"(?m)^FROM\s+mcr\.microsoft\.com/dotnet/sdk:8\.0\s+AS\s+build\s*$",
        )
        self.assertRegex(
            self.dockerfile,
            r"(?m)^FROM\s+mcr\.microsoft\.com/dotnet/aspnet:8\.0\s+AS\s+runtime\s*$",
        )
        self.assertRegex(
            self.dockerfile,
            r"(?m)^COPY\s+--from=build\s+/app/out\s+\./\s*$",
        )

    def test_runs_as_non_root_app_user_on_port_8080(self) -> None:
        self.assertRegex(self.dockerfile, r"(?m)^USER\s+app\s*$")
        self.assertNotRegex(self.dockerfile, r"(?m)^USER\s+(?:0|root)\s*$")
        self.assertRegex(self.dockerfile, r"(?m)^EXPOSE\s+8080\s*$")
        self.assertRegex(
            self.dockerfile,
            r"(?m)^ENV\s+ASPNETCORE_URLS=http://\*:8080\s*$",
        )

    def test_preserves_backend_entrypoint(self) -> None:
        entrypoint = re.compile(
            r'(?m)^ENTRYPOINT\s+\["dotnet",\s*"LabSolos-Server-DotNet8\.dll"\]\s*$'
        )
        self.assertRegex(self.dockerfile, entrypoint)


if __name__ == "__main__":
    unittest.main()
