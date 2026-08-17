import re
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_ROOT = REPOSITORY_ROOT / "frontend"
DOCKERFILE = FRONTEND_ROOT / "Dockerfile"


class FrontendContainerContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.dockerfile = DOCKERFILE.read_text(encoding="utf-8")

    def test_build_stage_installs_the_committed_lockfile_before_sources(self) -> None:
        self.assertTrue((FRONTEND_ROOT / "package-lock.json").is_file())
        self.assertRegex(self.dockerfile, r"(?m)^FROM node:[^\s]+ AS build$")

        copy_lockfile = self.dockerfile.index("COPY package.json package-lock.json ./")
        npm_ci = self.dockerfile.index("RUN npm ci")
        copy_sources = self.dockerfile.index("COPY . .")

        self.assertLess(copy_lockfile, npm_ci)
        self.assertLess(npm_ci, copy_sources)

    def test_runtime_preserves_nginx_entrypoint_and_port_80(self) -> None:
        self.assertRegex(self.dockerfile, r"(?m)^FROM nginx:[^\s]+$")
        self.assertIn(
            "COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html",
            self.dockerfile,
        )
        self.assertIn('ENTRYPOINT ["/entrypoint.sh"]', self.dockerfile)
        self.assertRegex(self.dockerfile, r"(?m)^EXPOSE 80$")
        self.assertIn('CMD ["nginx", "-g", "daemon off;"]', self.dockerfile)

        self.assertTrue((FRONTEND_ROOT / "docker" / "entrypoint.sh").is_file())
        self.assertTrue((FRONTEND_ROOT / "nginx.conf").is_file())
        self.assertTrue((FRONTEND_ROOT / ".env.template.js").is_file())

    def test_dockerfile_does_not_encode_a_public_architecture_suffix(self) -> None:
        public_architecture_suffix = re.compile(r"-(?:amd64|arm64)(?:\s|$)", re.IGNORECASE)
        self.assertIsNone(public_architecture_suffix.search(self.dockerfile))


if __name__ == "__main__":
    unittest.main()
