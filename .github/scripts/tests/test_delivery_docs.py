from __future__ import annotations

import hashlib
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch
from urllib.parse import quote


SCRIPT = Path(__file__).resolve().parents[1] / "check_delivery_docs.py"
REPOSITORY_ROOT = SCRIPT.parents[2]
WIKI_ROOT = Path(
    os.environ.get("LABON_WIKI_ROOT", str(REPOSITORY_ROOT.parent / "lab-solos.wiki"))
)
sys.path.insert(0, str(SCRIPT.parent))
import check_delivery_docs as delivery_validator


APP_REPOSITORY = "ifpebj-ti/lab-solos"
ENCODED_PAGE = quote("Página (exemplo).md")
ENCODED_FRAGMENT = quote("seção-com-acento")


def _run(command: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=cwd,
        text=True,
        capture_output=True,
        check=True,
    )


def _commit_repository(root: Path, files: dict[str, str]) -> str:
    for relative, content in files.items():
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8", newline="\n")
    _run(["git", "init", "--quiet", "--initial-branch=main"], root)
    _run(["git", "config", "user.name", "Synthetic Fixture"], root)
    _run(["git", "config", "user.email", "fixture@example.invalid"], root)
    _run(["git", "add", "."], root)
    _run(["git", "commit", "--quiet", "-m", "fixture"], root)
    return _run(["git", "rev-parse", "HEAD"], root).stdout.strip()


class SyntheticDelivery:
    def __init__(self, root: Path, *, home_extra: str = "", page_extra: str = "") -> None:
        self.root = root
        self.repository = root / "repository"
        self.wiki = root / "wiki"
        self.repository.mkdir()
        self.wiki.mkdir()
        self.app_sha = _commit_repository(
            self.repository,
            {"src/Arquivo (teste).txt": "conteúdo sintético\n"},
        )
        home = self._page(
            "Home",
            "Navegação",
            ""
            f"[Página de exemplo]({ENCODED_PAGE}#{ENCODED_FRAGMENT})\n"
            f"[Fonte de aplicação](https://github.com/{APP_REPOSITORY}/blob/{self.app_sha}/src/Arquivo%20%28teste%29.txt)\n"
            + home_extra,
        )
        page = self._page(
            "Página (exemplo)",
            "Seção com acento",
            page_extra,
        )
        self.wiki_sha = _commit_repository(
            self.wiki,
            {"Home.md": home, "Página (exemplo).md": page},
        )
        self.manifest_path = self.repository / "manifest.json"
        self.write_manifest()

    def _page(self, title: str, section: str, body: str) -> str:
        return (
            f"# {title}\n\n"
            "Data da revisão: 2026-09-21\n"
            "Responsável pela revisão: Equipe sintética\n"
            f"Referência da aplicação: `{self.app_sha}`\n\n"
            f"## {section}\n\n"
            f"{body}"
        )

    def manifest(self) -> dict:
        return {
            "versao": 1,
            "referenciaAplicacao": self.app_sha,
            "referenciaWiki": self.wiki_sha,
            "paginas": [
                {
                    "caminho": "Home.md",
                    "titulo": "Home",
                    "secoes": ["Navegação"],
                    "requisitos": ["RF-008"],
                    "criterios": ["CA-012"],
                },
                {
                    "caminho": "Página (exemplo).md",
                    "titulo": "Página (exemplo)",
                    "secoes": ["Seção com acento"],
                    "requisitos": ["RNF-003"],
                    "criterios": ["CA-012"],
                },
            ],
            "exemplosCompose": [],
        }

    def write_manifest(self, manifest: dict | None = None) -> None:
        self.manifest_path.write_text(
            json.dumps(manifest or self.manifest(), ensure_ascii=False, indent=2),
            encoding="utf-8",
            newline="\n",
        )

    def run(self) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--repository",
                str(self.repository),
                "--wiki",
                str(self.wiki),
                "--manifest",
                str(self.manifest_path),
                "--mode",
                "editorial",
            ],
            cwd=SCRIPT.parents[2],
            capture_output=True,
            text=True,
            check=False,
        )


class SyntheticComposeDelivery:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.repository = root / "repository"
        self.wiki = root / "wiki"
        self.repository.mkdir()
        self.wiki.mkdir()
        self.app_sha = _commit_repository(
            self.repository,
            {
                "docker-compose-test.yml": (
                    "services:\n"
                    "  web:\n"
                    "    image: busybox:${IMAGE_TAG:?IMAGE_TAG is required}\n"
                    "    environment:\n"
                    "      REQUIRED: ${REQUIRED}\n"
                )
            },
        )
        page = (
            "# Home\n\n"
            "Data da revisão: 2026-09-21\n"
            "Responsável pela revisão: Equipe sintética\n"
            f"Referência da aplicação: `{self.app_sha}`\n\n"
            "## Outro bloco\n\n"
            "```env\n"
            "IMAGE_TAG=wrong-block\n"
            "REQUIRED=wrong-block\n"
            "```\n\n"
            "## Compose sintético\n\n"
            "```env\n"
            "IMAGE_TAG=synthetic\n"
            "REQUIRED=from-example\n"
            "```\n"
        )
        self.wiki_sha = _commit_repository(self.wiki, {"Home.md": page})
        self.manifest_path = self.repository / "manifest.json"
        self.manifest_path.write_text(
            json.dumps(
                {
                    "versao": 1,
                    "referenciaAplicacao": self.app_sha,
                    "referenciaWiki": self.wiki_sha,
                    "paginas": [
                        {
                            "caminho": "Home.md",
                            "titulo": "Home",
                            "secoes": ["Compose sintético"],
                            "requisitos": ["RF-003"],
                            "criterios": ["CA-003"],
                        }
                    ],
                    "exemplosCompose": [
                        {"secao": "Compose sintético", "arquivo": "docker-compose-test.yml"}
                    ],
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
            newline="\n",
        )


class ComposeValidatorContractTests(unittest.TestCase):
    def _arguments(self, fixture: SyntheticComposeDelivery) -> list[str]:
        return [
            "--repository",
            str(fixture.repository),
            "--wiki",
            str(fixture.wiki),
            "--manifest",
            str(fixture.manifest_path),
            "--mode",
            "compose",
        ]

    def test_compose_mode_executes_the_selected_env_block(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            fixture = SyntheticComposeDelivery(Path(temporary))
            arguments = self._arguments(fixture)
            completed = subprocess.CompletedProcess(
                ["docker", "compose"], 0, stdout="", stderr=""
            )
            with patch.object(delivery_validator.subprocess, "run", return_value=completed):
                result = delivery_validator.main(arguments)

            self.assertEqual(result, 0)

    def test_missing_compose_variable_is_reported_without_running_docker(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            fixture = SyntheticComposeDelivery(Path(temporary))
            page = fixture.wiki / "Home.md"
            page.write_text(
                page.read_text(encoding="utf-8").replace("REQUIRED=from-example\n", ""),
                encoding="utf-8",
            )
            with patch.object(delivery_validator.subprocess, "run") as run:
                output = io.StringIO()
                with redirect_stdout(output):
                    result = delivery_validator.main(self._arguments(fixture))

            self.assertEqual(result, 1)
            self.assertIn("compose-variable-missing", output.getvalue())
            run.assert_not_called()

    def test_process_environment_does_not_override_example_and_temp_is_removed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            fixture = SyntheticComposeDelivery(Path(temporary))
            captured: dict[str, object] = {}

            def run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
                captured["command"] = command
                captured["kwargs"] = kwargs
                env_file = Path(command[command.index("--env-file") + 1])
                captured["env_content"] = env_file.read_text(encoding="utf-8")
                captured["env_file"] = env_file
                return subprocess.CompletedProcess(command, 0, stdout="", stderr="")

            with patch.dict(
                os.environ,
                {"IMAGE_TAG": "from-process", "REQUIRED": "from-process"},
                clear=False,
            ):
                with patch.object(delivery_validator.subprocess, "run", side_effect=run):
                    result = delivery_validator.main(self._arguments(fixture))

            self.assertEqual(result, 0)
            command = captured["command"]
            self.assertIsInstance(command, list)
            self.assertEqual(command[0:2], ["docker", "compose"])
            self.assertNotIn("from-process", str(captured["env_content"]))
            self.assertIn("IMAGE_TAG=synthetic", str(captured["env_content"]))
            self.assertIn("REQUIRED=from-example", str(captured["env_content"]))
            kwargs = captured["kwargs"]
            self.assertIsInstance(kwargs, dict)
            self.assertFalse(kwargs["shell"])
            self.assertNotIn("IMAGE_TAG", kwargs["env"])
            self.assertNotIn("REQUIRED", kwargs["env"])
            self.assertFalse(captured["env_file"].exists())

    def test_compose_failure_does_not_leak_subprocess_stderr(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            fixture = SyntheticComposeDelivery(Path(temporary))
            completed = subprocess.CompletedProcess(
                ["docker", "compose"],
                1,
                stdout="stdout-sensitive-value",
                stderr="stderr-sensitive-value",
            )
            output = io.StringIO()
            with patch.object(delivery_validator.subprocess, "run", return_value=completed):
                with redirect_stdout(output):
                    result = delivery_validator.main(self._arguments(fixture))

            self.assertEqual(result, 1)
            self.assertIn("compose-config-invalid", output.getvalue())
            self.assertNotIn("sensitive-value", output.getvalue())

    def test_missing_docker_is_infrastructure_failure(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            fixture = SyntheticComposeDelivery(Path(temporary))
            output = io.StringIO()
            with patch.object(
                delivery_validator.subprocess, "run", side_effect=FileNotFoundError("docker")
            ):
                with redirect_stdout(output):
                    result = delivery_validator.main(self._arguments(fixture))

            self.assertEqual(result, 2)
            self.assertIn("tool-unavailable", output.getvalue())
            self.assertNotIn("docker", output.getvalue().casefold())

    def test_real_development_and_production_examples_pass(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            repository = root / "repository"
            wiki = root / "wiki"
            repository.mkdir()
            wiki.mkdir()
            for name in ("docker-compose-dev.yml", "docker-compose-prod.yml", "Caddyfile"):
                shutil.copy2(REPOSITORY_ROOT / name, repository / name)
            shutil.copy2(
                WIKI_ROOT / "Guia-de-Execução-e-Configuração-com-Docker-e-Docker-Compose.md",
                wiki / "Guia.md",
            )
            manifest = root / "manifest.json"
            manifest.write_text(
                json.dumps(
                    {
                        "versao": 1,
                        "referenciaAplicacao": "0" * 40,
                        "referenciaWiki": "1" * 40,
                        "paginas": [
                            {
                                "caminho": "Guia.md",
                                "titulo": "Guia de Execução e Configuração com Docker e Docker Compose",
                                "secoes": [
                                    "Bloco `.env` canônico de desenvolvimento",
                                    "Bloco `.env` canônico de produção",
                                ],
                                "requisitos": ["RF-003"],
                                "criterios": ["CA-003"],
                            }
                        ],
                        "exemplosCompose": [
                            {
                                "secao": "Bloco `.env` canônico de desenvolvimento",
                                "arquivo": "docker-compose-dev.yml",
                            },
                            {
                                "secao": "Bloco `.env` canônico de produção",
                                "arquivo": "docker-compose-prod.yml",
                            },
                        ],
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
                newline="\n",
            )
            calls: list[list[str]] = []

            def run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
                calls.append(command)
                return subprocess.CompletedProcess(command, 0, stdout="", stderr="")

            report = delivery_validator.validate_compose(repository, wiki, manifest, runner=run)

            self.assertEqual(report.exit_code, 0, "\n".join(report.violations + report.infrastructure))
            self.assertEqual(len(calls), 2)
            self.assertTrue(any(command[command.index("-f") + 1].endswith("docker-compose-dev.yml") for command in calls))
            self.assertTrue(any(command[command.index("-f") + 1].endswith("docker-compose-prod.yml") for command in calls))

    def test_real_production_without_labon_image_version_is_invalid(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            repository = root / "repository"
            wiki = root / "wiki"
            repository.mkdir()
            wiki.mkdir()
            for name in ("docker-compose-prod.yml", "Caddyfile"):
                shutil.copy2(REPOSITORY_ROOT / name, repository / name)
            guide = wiki / "Guia.md"
            shutil.copy2(
                WIKI_ROOT / "Guia-de-Execução-e-Configuração-com-Docker-e-Docker-Compose.md",
                guide,
            )
            guide.write_text(
                guide.read_text(encoding="utf-8").replace("LABON_IMAGE_VERSION=0.0.0\n", ""),
                encoding="utf-8",
                newline="\n",
            )
            manifest = root / "manifest.json"
            manifest.write_text(
                json.dumps(
                    {
                        "versao": 1,
                        "referenciaAplicacao": "0" * 40,
                        "referenciaWiki": "1" * 40,
                        "paginas": [
                            {
                                "caminho": "Guia.md",
                                "titulo": "Guia de Execução e Configuração com Docker e Docker Compose",
                                "secoes": ["Bloco `.env` canônico de produção"],
                                "requisitos": ["RF-003"],
                                "criterios": ["CA-003"],
                            }
                        ],
                        "exemplosCompose": [
                            {
                                "secao": "Bloco `.env` canônico de produção",
                                "arquivo": "docker-compose-prod.yml",
                            }
                        ],
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
                newline="\n",
            )
            calls: list[list[str]] = []

            def run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
                calls.append(command)
                return subprocess.CompletedProcess(command, 0, stdout="", stderr="")

            report = delivery_validator.validate_compose(repository, wiki, manifest, runner=run)

            self.assertEqual(report.exit_code, 1)
            self.assertIn("compose-variable-missing", "\n".join(report.violations))
            self.assertEqual(calls, [])

    def test_real_examples_pass_through_cli_when_docker_is_available(self) -> None:
        if shutil.which("docker") is None:
            self.skipTest("Docker ausente no PATH")
        probe = subprocess.run(
            ["docker", "info"],
            capture_output=True,
            text=True,
            check=False,
        )
        if probe.returncode != 0:
            self.skipTest("daemon Docker indisponível")

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            repository = root / "repository"
            wiki = root / "wiki"
            repository.mkdir()
            wiki.mkdir()
            for name in ("docker-compose-dev.yml", "docker-compose-prod.yml", "Caddyfile"):
                shutil.copy2(REPOSITORY_ROOT / name, repository / name)
            shutil.copy2(
                WIKI_ROOT / "Guia-de-Execução-e-Configuração-com-Docker-e-Docker-Compose.md",
                wiki / "Guia.md",
            )
            manifest = repository / "manifest.json"
            manifest.write_text(
                json.dumps(
                    {
                        "versao": 1,
                        "referenciaAplicacao": "0" * 40,
                        "referenciaWiki": "1" * 40,
                        "paginas": [
                            {
                                "caminho": "Guia.md",
                                "titulo": "Guia de Execução e Configuração com Docker e Docker Compose",
                                "secoes": [
                                    "Bloco `.env` canônico de desenvolvimento",
                                    "Bloco `.env` canônico de produção",
                                ],
                                "requisitos": ["RF-003"],
                                "criterios": ["CA-003"],
                            }
                        ],
                        "exemplosCompose": [
                            {
                                "secao": "Bloco `.env` canônico de desenvolvimento",
                                "arquivo": "docker-compose-dev.yml",
                            },
                            {
                                "secao": "Bloco `.env` canônico de produção",
                                "arquivo": "docker-compose-prod.yml",
                            },
                        ],
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
                newline="\n",
            )
            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "--repository",
                    str(repository),
                    "--wiki",
                    str(wiki),
                    "--manifest",
                    str(manifest),
                    "--mode",
                    "compose",
                ],
                cwd=REPOSITORY_ROOT,
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


def _tree_digest(root: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for path in sorted(root.rglob("*")):
        if path.is_file() and ".git" not in path.relative_to(root).parts:
            result[path.relative_to(root).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


class EditorialValidatorContractTests(unittest.TestCase):
    def test_missing_required_page_is_reported_without_content(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            fixture = SyntheticDelivery(Path(temporary))
            manifest = fixture.manifest()
            manifest["paginas"].append(
                {
                    "caminho": "Obrigatória.md",
                    "titulo": "Obrigatória",
                    "secoes": ["Obrigatória"],
                    "requisitos": ["RNF-003"],
                    "criterios": ["CA-012"],
                }
            )
            fixture.write_manifest(manifest)

            result = fixture.run()

            self.assertEqual(result.returncode, 1)
            self.assertIn("page-missing", result.stdout)
            self.assertNotIn("# Obrigatória", result.stdout)

    def test_valid_editorial_contract_accepts_encoded_names_and_git_blob(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            fixture = SyntheticDelivery(Path(temporary))
            before = _tree_digest(fixture.root)

            result = fixture.run()

            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertEqual(before, _tree_digest(fixture.root))

    def test_broken_local_link_is_reported_without_target_content(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            fixture = SyntheticDelivery(Path(temporary), home_extra="[Link](ausente.md)\n")

            result = fixture.run()

            self.assertEqual(result.returncode, 1)
            self.assertIn("link-broken", result.stdout)
            self.assertNotIn("conteúdo de uma página", result.stdout)

    def test_missing_fragment_is_reported(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            fixture = SyntheticDelivery(
                Path(temporary),
                home_extra="[Fragmento](Página%20%28exemplo%29.md#nao-existe)\n",
            )

            result = fixture.run()

            self.assertEqual(result.returncode, 1)
            self.assertIn("fragment-missing", result.stdout)

    def test_manifest_path_traversal_is_rejected_without_reading_outside_root(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            fixture = SyntheticDelivery(Path(temporary))
            manifest = fixture.manifest()
            manifest["paginas"][0]["caminho"] = "../fora.md"
            fixture.write_manifest(manifest)

            result = fixture.run()

            self.assertEqual(result.returncode, 1)
            self.assertIn("path-invalid", result.stdout)

    def test_missing_git_revision_is_a_contract_violation(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            fixture = SyntheticDelivery(Path(temporary))
            manifest = fixture.manifest()
            manifest["referenciaAplicacao"] = "f" * 40
            fixture.write_manifest(manifest)

            result = fixture.run()

            self.assertEqual(result.returncode, 1)
            self.assertIn("git-reference-missing", result.stdout)
            self.assertNotIn("f" * 40, result.stdout)

    def test_missing_page_metadata_is_reported(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            fixture = SyntheticDelivery(Path(temporary))
            page = fixture.wiki / "Página (exemplo).md"
            page.write_text(
                page.read_text(encoding="utf-8").replace(
                    f"Referência da aplicação: `{fixture.app_sha}`\n", ""
                ),
                encoding="utf-8",
            )

            result = fixture.run()

            self.assertEqual(result.returncode, 1)
            self.assertIn("metadata-missing", result.stdout)

    def test_suspicious_example_is_sanitized(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            fixture = SyntheticDelivery(
                Path(temporary), page_extra="SEED_ADMIN_PASSWORD=SuperSecret123!\n"
            )

            result = fixture.run()

            self.assertEqual(result.returncode, 1)
            self.assertIn("sensitive-example", result.stdout)
            self.assertNotIn("SuperSecret123!", result.stdout)

    def test_malformed_manifest_uses_infrastructure_exit_code(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            fixture = SyntheticDelivery(Path(temporary))
            fixture.manifest_path.write_text("{ inválido", encoding="utf-8")

            result = fixture.run()

            self.assertEqual(result.returncode, 2)
            self.assertIn("manifest-unreadable", result.stdout)
            self.assertNotIn("inválido", result.stdout)

    def test_unknown_manifest_field_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            fixture = SyntheticDelivery(Path(temporary))
            manifest = fixture.manifest()
            manifest["campoDesconhecido"] = "não deve ser aceito"
            fixture.write_manifest(manifest)

            result = fixture.run()

            self.assertEqual(result.returncode, 1)
            self.assertIn("manifest-field", result.stdout)
            self.assertNotIn("não deve ser aceito", result.stdout)

    def test_duplicate_page_path_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            fixture = SyntheticDelivery(Path(temporary))
            manifest = fixture.manifest()
            manifest["paginas"].append(dict(manifest["paginas"][0]))
            fixture.write_manifest(manifest)

            result = fixture.run()

            self.assertEqual(result.returncode, 1)
            self.assertIn("manifest-duplicate", result.stdout)


if __name__ == "__main__":
    unittest.main()
