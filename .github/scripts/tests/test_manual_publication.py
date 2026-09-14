from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "sync_manual_to_wiki.py"
CONTENT_SCRIPT = Path(__file__).resolve().parents[1] / "check_manual.py"


def _load_content_module():
    specification = importlib.util.spec_from_file_location("manual_validator_for_publication", CONTENT_SCRIPT)
    module = importlib.util.module_from_spec(specification)
    assert specification.loader is not None
    specification.loader.exec_module(module)
    return module


VALIDATOR = _load_content_module()


PRODUCT_VERSION = "produto-exercitado-2026-09-14"
EDITORIAL_VERSION = "2026-09-14.1"
UPDATED_AT = "2026-09-14"
REVIEWER = "equipe-documentacao"
REPOSITORY = "acme/labon"
IMAGE_BYTES = b"\x89PNG\r\n\x1a\nfixture-manual"
ALIEN_BYTES = b"Home mantida por outro editor.\r\n"


def _git(repository: Path, *arguments: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(repository), *arguments],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
    )
    return result.stdout.strip()


def _section(journey_id: str, profiles: list[str], title: str, anchor: str) -> str:
    return (
        f'<a id="{anchor}"></a>\n'
        f"## {journey_id} — {title}\n\n"
        f"Quem pode executar: {', '.join(profiles)}\n\n"
        "Pré-requisitos: uma conta sintética habilitada.\n\n"
        "Onde começar: abra a área correspondente no índice.\n\n"
        "Passos:\n\n"
        "1. Consulte a tela indicada.\n"
        "2. Confirme a ação apresentada.\n\n"
        "Resultado esperado: a operação é apresentada com seu estado atual.\n\n"
        "Erros comuns: a sessão pode estar expirada.\n\n"
        "Saída segura: volte ao índice sem repetir uma ação já confirmada.\n\n"
    )


def _manifest() -> dict:
    journeys = [
        ("J01", "README.md", "j01-acesso", ["Administrador", "Mentor", "Mentorado"]),
        ("J02", "operacoes.md", "j02-cadastro", ["Mentor", "Mentorado"]),
        ("J03", "operacoes.md", "j03-aprovacao", ["Administrador", "Mentor"]),
        ("J04", "operacoes.md", "j04-primeiro-acesso", ["Administrador", "Mentor", "Mentorado"]),
        ("J05", "operacoes.md", "j05-senha-saida", ["Administrador", "Mentor", "Mentorado"]),
        ("J06", "operacoes.md", "j06-preparar-operacao", ["Administrador"]),
        ("J07", "operacoes.md", "j07-materiais", ["Administrador", "Mentor", "Mentorado"]),
        ("J08", "operacoes.md", "j08-emprestimos", ["Mentor", "Mentorado"]),
        ("J09", "operacoes.md", "j09-devolucao", ["Administrador"]),
        ("J10", "operacoes.md", "j10-perfil", ["Administrador", "Mentor", "Mentorado"]),
        ("J11", "operacoes.md", "j11-falhas", ["Administrador", "Mentor", "Mentorado"]),
    ]
    return {
        "versaoEsquema": 1,
        "versaoManual": EDITORIAL_VERSION,
        "produtoValidado": PRODUCT_VERSION,
        "atualizadoEm": UPDATED_AT,
        "responsavelRevisao": REVIEWER,
        "paginas": [
            {"origem": "README.md", "destinoWiki": "Manual-do-Usuario.md", "titulo": "Manual de teste"},
            {"origem": "operacoes.md", "destinoWiki": "Manual-do-Usuario-operacoes.md", "titulo": "Operações"},
        ],
        "jornadas": [
            {
                "id": journey_id,
                "pagina": page,
                "ancora": anchor,
                "perfis": profiles,
                "evidencias": ["fixture local do teste de publicação"],
            }
            for journey_id, page, anchor, profiles in journeys
        ],
        "imagens": [
            {
                "arquivo": "imagens/tela.png",
                "jornada": "J02",
                "descricao": "Tela sintética de cadastro.",
                "produtoValidado": PRODUCT_VERSION,
                "revisaoPrivacidade": {"responsavel": REVIEWER, "data": UPDATED_AT},
            }
        ],
    }


def _page_content(name: str) -> str:
    if name == "README.md":
        return (
            "# Manual de teste\n\n"
            f"Versão do manual: `{EDITORIAL_VERSION}`\n"
            f"Produto validado: `{PRODUCT_VERSION}`\n"
            f"Atualizado em: `{UPDATED_AT}`\n"
            f"Responsável pela revisão: `{REVIEWER}`\n\n"
            '<a id="visao-geral"></a>\n'
            "## Visão geral\n\n"
            "[Ação – seção](operacoes.md#j02-cadastro) e [Ajuda](https://example.com/ajuda).\n\n"
            "`[Não transformar](operacoes.md#j02-cadastro)`\n\n"
            "![Tela de exemplo](imagens/tela.png)\n\n"
            '<a id="j01-acesso"></a>\n'
            "## J01 — Acesso\n\n"
            "Quem pode executar: Administrador, Mentor, Mentorado\n\n"
            "Pré-requisitos: uma conta sintética habilitada.\n\n"
            "Onde começar: abra a página inicial.\n\n"
            "Passos:\n\n"
            "1. Abra o endereço fornecido pela instituição.\n\n"
            "Resultado esperado: a área do perfil é apresentada.\n\n"
            "Erros comuns: a sessão pode estar expirada.\n\n"
            "Saída segura: use Sair.\n\n"
            "```markdown\n"
            "[Não transformar](operacoes.md#j02-cadastro)\n"
            "![Não transformar](imagens/tela.png)\n"
            "```\n"
        )

    content = (
        "# Operações\n\n"
        f"Versão do manual: `{EDITORIAL_VERSION}`\n"
        f"Produto validado: `{PRODUCT_VERSION}`\n"
        f"Atualizado em: `{UPDATED_AT}`\n"
        f"Responsável pela revisão: `{REVIEWER}`\n\n"
        "[Índice](README.md#visao-geral)\n\n"
    )
    titles = {
        "J02": ("cadastro", "j02-cadastro"),
        "J03": ("aprovação", "j03-aprovacao"),
        "J04": ("primeiro acesso", "j04-primeiro-acesso"),
        "J05": ("senha e saída", "j05-senha-saida"),
        "J06": ("preparar operação", "j06-preparar-operacao"),
        "J07": ("materiais", "j07-materiais"),
        "J08": ("empréstimos", "j08-emprestimos"),
        "J09": ("devolução", "j09-devolucao"),
        "J10": ("perfil", "j10-perfil"),
        "J11": ("falhas", "j11-falhas"),
    }
    profiles = {
        "J02": ["Mentor", "Mentorado"],
        "J03": ["Administrador", "Mentor"],
        "J04": ["Administrador", "Mentor", "Mentorado"],
        "J05": ["Administrador", "Mentor", "Mentorado"],
        "J06": ["Administrador"],
        "J07": ["Administrador", "Mentor", "Mentorado"],
        "J08": ["Mentor", "Mentorado"],
        "J09": ["Administrador"],
        "J10": ["Administrador", "Mentor", "Mentorado"],
        "J11": ["Administrador", "Mentor", "Mentorado"],
    }
    for journey_id, (title, anchor) in titles.items():
        content += _section(journey_id, profiles[journey_id], title, anchor)
    return content


def _create_source(parent: Path) -> tuple[Path, str, dict]:
    repository = parent / "source-repository"
    repository.mkdir()
    _git(repository, "init", "--initial-branch=main")
    _git(repository, "config", "user.email", "tests@example.test")
    _git(repository, "config", "user.name", "Publication Tests")
    source = repository / "docs" / "manual"
    (source / "imagens").mkdir(parents=True)
    manifest = _manifest()
    (source / "manual.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n"
    )
    (source / "README.md").write_text(_page_content("README.md"), encoding="utf-8", newline="\n")
    (source / "operacoes.md").write_text(_page_content("operacoes.md"), encoding="utf-8", newline="\n")
    (source / "imagens" / "tela.png").write_bytes(IMAGE_BYTES)
    _git(repository, "add", "docs/manual")
    _git(repository, "commit", "--message", "fixture manual")
    commit = _git(repository, "rev-parse", "HEAD")
    return repository, commit, manifest


def _run(source: Path, wiki: Path, ref: str, *extra: str) -> subprocess.CompletedProcess[str]:
    return _run_mode(source, wiki, ref, "generate", *extra)


def _run_mode(
    source: Path, wiki: Path, ref: str, mode: str, *extra: str
) -> subprocess.CompletedProcess[str]:
    command = [
        sys.executable,
        "-B",
        str(SCRIPT),
        "--source",
        str(source),
        "--wiki",
        str(wiki),
        "--repository",
        REPOSITORY,
        "--ref",
        ref,
        "--mode",
        mode,
        *extra,
    ]
    return subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8")


def _generated_files(wiki: Path) -> dict[str, bytes]:
    return {
        path.name: path.read_bytes()
        for path in sorted(wiki.iterdir())
        if path.is_file() and path.name != "Home.md"
    }


def _wiki_files(wiki: Path) -> dict[str, bytes]:
    return {
        path.relative_to(wiki).as_posix(): path.read_bytes()
        for path in sorted(wiki.rglob("*"))
        if path.is_file()
    }


def _commit_source(repository: Path, message: str) -> str:
    _git(repository, "add", "-A", "docs/manual")
    _git(repository, "commit", "--message", message)
    return _git(repository, "rev-parse", "HEAD")


def _rewrite_version_lines(source: Path, version: str) -> None:
    for page in source.glob("*.md"):
        lines = page.read_text(encoding="utf-8").splitlines()
        updated = []
        for line in lines:
            if line.casefold().startswith("vers") and "manual:" in line.casefold():
                line = f"{line.split(':', 1)[0]}: `{version}`"
            updated.append(line)
        page.write_text("\n".join(updated) + "\n", encoding="utf-8", newline="\n")


def _change_source(repository: Path, *, version: str, suffix: str, image: bytes | None = None) -> str:
    source = repository / "docs" / "manual"
    manifest_path = source / "manual.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["versaoManual"] = version
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n"
    )
    _rewrite_version_lines(source, version)
    readme_path = source / "README.md"
    readme_path.write_text(
        readme_path.read_text(encoding="utf-8") + f"\n{suffix}\n",
        encoding="utf-8",
        newline="\n",
    )
    if image is not None:
        (source / "imagens" / "tela.png").write_bytes(image)
    return _commit_source(repository, f"manual {version}")


def _collapse_operations_into_readme(repository: Path, *, version: str) -> str:
    source = repository / "docs" / "manual"
    manifest_path = source / "manual.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["versaoManual"] = version
    manifest["paginas"] = [manifest["paginas"][0]]
    for journey in manifest["jornadas"]:
        journey["pagina"] = "README.md"

    operations = (source / "operacoes.md").read_text(encoding="utf-8")
    sections = operations[operations.index('<a id="j02-cadastro"></a>') :]
    readme_path = source / "README.md"
    readme = readme_path.read_text(encoding="utf-8").replace(
        "(operacoes.md#j02-cadastro)", "(#j02-cadastro)"
    )
    readme_path.write_text(readme + "\n" + sections, encoding="utf-8", newline="\n")
    (source / "operacoes.md").unlink()
    _rewrite_version_lines(source, version)
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n"
    )
    return _commit_source(repository, f"manual {version} sem operacoes")


class ManualPublicationTests(unittest.TestCase):
    def test_real_manual_integrates_with_temporary_git_source_idempotently(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            real_source = Path(__file__).resolve().parents[3] / "docs" / "manual"
            repository = root / "source-repository"
            repository.mkdir()
            _git(repository, "init", "--initial-branch=main")
            _git(repository, "config", "user.email", "tests@example.test")
            _git(repository, "config", "user.name", "Publication Tests")
            source = repository / "docs" / "manual"
            shutil.copytree(real_source, source)
            _git(repository, "add", "docs/manual")
            _git(repository, "commit", "--message", "temporary real manual")
            temporary_sha = _git(repository, "rev-parse", "HEAD")

            self.assertRegex(temporary_sha, r"^[0-9a-f]{40}$")
            print(f"T014 temporary source SHA: {temporary_sha}")
            self.assertEqual(_git(repository, "status", "--short"), "")

            wiki = root / "wiki"
            wiki.mkdir()
            alien_documents = {
                "Home.md": b"Home mantida por outro editor.\r\n",
                "_Sidebar.md": b"Sidebar mantida por outro editor.\n",
                "Guia-de-Testes-de-Usuario.md": b"Guia alheio preservado.\n",
            }
            for relative, content in alien_documents.items():
                (wiki / relative).write_bytes(content)

            generated = _run(source, wiki, temporary_sha)

            self.assertEqual(generated.returncode, 0, generated.stderr)
            first_generation = _wiki_files(wiki)
            self.assertIn("Manual-do-Usuario.md", first_generation)
            self.assertIn("manual-publicacao.json", first_generation)
            expected_managed = {
                page["destinoWiki"] for page in json.loads(
                    (source / "manual.json").read_text(encoding="utf-8")
                )["paginas"]
            } | {"manual-publicacao.json"}
            self.assertEqual(set(first_generation) - set(alien_documents), expected_managed)
            publication = json.loads((wiki / "manual-publicacao.json").read_text(encoding="utf-8"))
            self.assertEqual(publication["commitFonte"], temporary_sha)

            comparison = _run_mode(source, wiki, temporary_sha, "check")

            self.assertEqual(comparison.returncode, 0, comparison.stderr)
            self.assertEqual(_wiki_files(wiki), first_generation)

            second_generation = _run(source, wiki, temporary_sha)

            self.assertEqual(second_generation.returncode, 0, second_generation.stderr)
            self.assertEqual(_wiki_files(wiki), first_generation)
            for relative, content in alien_documents.items():
                self.assertEqual((wiki / relative).read_bytes(), content)

    def test_generate_transforms_links_fixes_images_and_writes_deterministic_manifest(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            repository, commit, manifest = _create_source(root)
            wiki = root / "wiki"
            wiki.mkdir()
            (wiki / "Home.md").write_bytes(ALIEN_BYTES)

            result = _run(repository / "docs" / "manual", wiki, commit)

            self.assertEqual(result.returncode, 0, result.stderr)
            readme = (wiki / "Manual-do-Usuario.md").read_text(encoding="utf-8")
            operations = (wiki / "Manual-do-Usuario-operacoes.md").read_text(encoding="utf-8")
            self.assertIn(
                f"[Ação – seção](https://github.com/{REPOSITORY}/wiki/Manual-do-Usuario-operacoes#j02-cadastro)",
                readme,
            )
            self.assertIn(
                f"![Tela de exemplo](https://raw.githubusercontent.com/{REPOSITORY}/{commit}/docs/manual/imagens/tela.png)",
                readme,
            )
            self.assertIn("`[Não transformar](operacoes.md#j02-cadastro)`", readme)
            self.assertIn(
                "```markdown\n[Não transformar](operacoes.md#j02-cadastro)\n"
                "![Não transformar](imagens/tela.png)\n```",
                readme,
            )
            self.assertIn("Versão do manual:", operations)
            self.assertIn(f"Commit da fonte: `{commit}`", operations)
            self.assertIn(
                f"https://github.com/{REPOSITORY}/blob/{commit}/docs/manual/operacoes.md", operations
            )
            self.assertIn("Correções devem ser feitas no repositório principal", operations)
            self.assertNotIn("\r", readme)
            self.assertEqual((wiki / "Home.md").read_bytes(), ALIEN_BYTES)

            publication = json.loads((wiki / "manual-publicacao.json").read_text(encoding="utf-8"))
            self.assertEqual(publication["versaoEsquema"], 1)
            self.assertEqual(publication["versaoGerador"], "1")
            self.assertEqual(publication["commitFonte"], commit)
            self.assertEqual(publication["metadados"]["produtoValidado"], PRODUCT_VERSION)
            self.assertEqual(
                publication["paginas"][0]["sha256"],
                hashlib.sha256((wiki / "Manual-do-Usuario.md").read_bytes()).hexdigest(),
            )
            self.assertEqual(
                publication["imagens"][0]["sha256"], hashlib.sha256(IMAGE_BYTES).hexdigest()
            )
            self.assertNotIn("sha256", publication)
            self.assertIn("manual-publicacao.json", publication["arquivosGerenciados"])

    def test_same_source_and_ref_generate_identical_bytes_without_execution_date(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            repository, commit, _ = _create_source(root)
            first = root / "wiki-one"
            second = root / "wiki-two"
            first.mkdir()
            second.mkdir()

            first_result = _run(repository / "docs" / "manual", first, commit)
            second_result = _run(repository / "docs" / "manual", second, commit)

            self.assertEqual(first_result.returncode, 0, first_result.stderr)
            self.assertEqual(second_result.returncode, 0, second_result.stderr)
            self.assertEqual(_generated_files(first), _generated_files(second))

    def test_requires_existing_full_commit_sha_and_tracked_source_match(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            repository, commit, _ = _create_source(root)
            wiki = root / "wiki"
            wiki.mkdir()

            branch_result = _run(repository / "docs" / "manual", wiki, "main")
            missing_result = _run(repository / "docs" / "manual", wiki, "0" * 40)
            self.assertEqual(branch_result.returncode, 2)
            self.assertEqual(missing_result.returncode, 2)
            self.assertEqual(list(wiki.iterdir()), [])

            (repository / "docs" / "manual" / "README.md").write_text(
                _page_content("README.md") + "\nDivergência local.\n", encoding="utf-8", newline="\n"
            )
            divergent_result = _run(repository / "docs" / "manual", wiki, commit)
            self.assertEqual(divergent_result.returncode, 2)
            self.assertEqual(list(wiki.iterdir()), [])

    def test_rejects_managed_destination_and_unowned_collisions_without_overwriting(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            repository, commit, _ = _create_source(root)
            managed = root / "managed-wiki"
            managed.mkdir()
            self.assertEqual(_run(repository / "docs" / "manual", managed, commit).returncode, 0)
            before = {path.name: path.read_bytes() for path in managed.iterdir()}

            rerun = _run(repository / "docs" / "manual", managed, commit)

            self.assertEqual(rerun.returncode, 0, rerun.stderr)
            self.assertEqual(before, {path.name: path.read_bytes() for path in managed.iterdir()})

            collision = root / "collision-wiki"
            collision.mkdir()
            collision_page = collision / "Manual-do-Usuario.md"
            collision_page.write_bytes(b"owned by somebody else\n")
            collision_before = collision_page.read_bytes()
            collision_result = _run(repository / "docs" / "manual", collision, commit)
            self.assertEqual(collision_result.returncode, 2)
            self.assertEqual(collision_page.read_bytes(), collision_before)
            self.assertEqual(sorted(path.name for path in collision.iterdir()), ["Manual-do-Usuario.md"])

    def test_preflight_failure_leaves_alien_destination_byte_identical_and_writes_nothing(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            repository, commit, _ = _create_source(root)
            wiki = root / "wiki"
            wiki.mkdir()
            (wiki / "Home.md").write_bytes(ALIEN_BYTES)
            (repository / "docs" / "manual" / "manual.json").write_text("{ invalid", encoding="utf-8")

            result = _run(repository / "docs" / "manual", wiki, commit)

            self.assertEqual(result.returncode, 2)
            self.assertEqual((wiki / "Home.md").read_bytes(), ALIEN_BYTES)
            self.assertEqual([path.name for path in wiki.iterdir()], ["Home.md"])

    def test_check_is_read_only_and_reports_equality_or_divergence(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            repository, commit, _ = _create_source(root)
            wiki = root / "wiki"
            wiki.mkdir()

            initial = _run(repository / "docs" / "manual", wiki, commit)
            self.assertEqual(initial.returncode, 0, initial.stderr)
            before = _wiki_files(wiki)

            equal = _run_mode(repository / "docs" / "manual", wiki, commit, "check")

            self.assertEqual(equal.returncode, 0, equal.stderr)
            self.assertEqual(_wiki_files(wiki), before)

            page = wiki / "Manual-do-Usuario.md"
            page.write_bytes(page.read_bytes() + b"\nEdicao direta.\n")
            edited = _wiki_files(wiki)
            divergent = _run_mode(repository / "docs" / "manual", wiki, commit, "check")

            self.assertEqual(divergent.returncode, 1, divergent.stderr)
            self.assertEqual(_wiki_files(wiki), edited)

    def test_check_without_previous_manifest_is_divergence_and_writes_nothing(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            repository, commit, _ = _create_source(root)
            wiki = root / "wiki"
            wiki.mkdir()
            (wiki / "Home.md").write_bytes(ALIEN_BYTES)
            before = _wiki_files(wiki)

            result = _run_mode(repository / "docs" / "manual", wiki, commit, "check")

            self.assertEqual(result.returncode, 1, result.stderr)
            self.assertEqual(_wiki_files(wiki), before)

    def test_check_returns_operational_error_for_invalid_previous_manifest(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            repository, commit, _ = _create_source(root)
            wiki = root / "wiki"
            wiki.mkdir()
            self.assertEqual(_run(repository / "docs" / "manual", wiki, commit).returncode, 0)
            manifest = wiki / "manual-publicacao.json"
            manifest.write_text("{ inválido", encoding="utf-8", newline="\n")
            before = _wiki_files(wiki)

            result = _run_mode(repository / "docs" / "manual", wiki, commit, "check")

            self.assertEqual(result.returncode, 2, result.stderr)
            self.assertEqual(_wiki_files(wiki), before)

    def test_generate_updates_owned_files_removes_only_proven_obsolete_pages(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            repository, commit, _ = _create_source(root)
            wiki = root / "wiki"
            wiki.mkdir()
            aliens = {
                "Home.md": ALIEN_BYTES,
                "_Sidebar.md": b"sidebar from another editor\n",
                "Product-Requirements-Document-(PRD).md": b"PRD from another editor\n",
                "Guia-de-Testes-de-Usuario.md": b"documento alheio\n",
            }
            for name, value in aliens.items():
                (wiki / name).write_bytes(value)
            self.assertEqual(_run(repository / "docs" / "manual", wiki, commit).returncode, 0)

            updated_commit = _collapse_operations_into_readme(repository, version="2026-09-14.2")
            result = _run(repository / "docs" / "manual", wiki, updated_commit)

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertFalse((wiki / "Manual-do-Usuario-operacoes.md").exists())
            for name, value in aliens.items():
                self.assertEqual((wiki / name).read_bytes(), value)
            check = _run_mode(repository / "docs" / "manual", wiki, updated_commit, "check")
            self.assertEqual(check.returncode, 0, check.stderr)

    def test_generate_legitimate_update_preserves_alien_documents_and_image_hash(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            repository, commit, _ = _create_source(root)
            wiki = root / "wiki"
            wiki.mkdir()
            aliens = {
                "Home.md": ALIEN_BYTES,
                "_Sidebar.md": b"sidebar\r\n",
                "PRD-legado.md": b"prd legado\r\n",
                "guia-alheio.md": b"guia alheio\r\n",
            }
            for name, value in aliens.items():
                (wiki / name).write_bytes(value)
            self.assertEqual(_run(repository / "docs" / "manual", wiki, commit).returncode, 0)

            updated_image = IMAGE_BYTES + b"-updated"
            updated_commit = _change_source(
                repository,
                version="2026-09-14.2",
                suffix="Conteudo editorial atualizado.",
                image=updated_image,
            )
            result = _run(repository / "docs" / "manual", wiki, updated_commit)

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("Conteudo editorial atualizado.", (wiki / "Manual-do-Usuario.md").read_text(encoding="utf-8"))
            publication = json.loads((wiki / "manual-publicacao.json").read_text(encoding="utf-8"))
            self.assertEqual(publication["commitFonte"], updated_commit)
            self.assertEqual(publication["imagens"][0]["sha256"], hashlib.sha256(updated_image).hexdigest())
            for name, value in aliens.items():
                self.assertEqual((wiki / name).read_bytes(), value)

    def test_generate_rejects_direct_edit_without_partial_update(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            repository, commit, _ = _create_source(root)
            wiki = root / "wiki"
            wiki.mkdir()
            self.assertEqual(_run(repository / "docs" / "manual", wiki, commit).returncode, 0)
            page = wiki / "Manual-do-Usuario.md"
            page.write_bytes(page.read_bytes() + b"\nEdicao direta.\n")
            before = _wiki_files(wiki)
            updated_commit = _change_source(
                repository, version="2026-09-14.2", suffix="Nova revisao."
            )

            result = _run(repository / "docs" / "manual", wiki, updated_commit)

            self.assertEqual(result.returncode, 2, result.stderr)
            self.assertEqual(_wiki_files(wiki), before)

    def test_generate_rejects_unexpected_removal_without_partial_update(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            repository, commit, _ = _create_source(root)
            wiki = root / "wiki"
            wiki.mkdir()
            self.assertEqual(_run(repository / "docs" / "manual", wiki, commit).returncode, 0)
            removed = wiki / "Manual-do-Usuario-operacoes.md"
            removed.unlink()
            before = _wiki_files(wiki)
            updated_commit = _change_source(
                repository, version="2026-09-14.2", suffix="Nova revisao."
            )

            result = _run(repository / "docs" / "manual", wiki, updated_commit)

            self.assertEqual(result.returncode, 2, result.stderr)
            self.assertEqual(_wiki_files(wiki), before)

    def test_generate_does_not_remove_obsolete_page_with_wrong_owned_hash(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            repository, commit, _ = _create_source(root)
            wiki = root / "wiki"
            wiki.mkdir()
            self.assertEqual(_run(repository / "docs" / "manual", wiki, commit).returncode, 0)
            stale = wiki / "Manual-do-Usuario-operacoes.md"
            stale.write_bytes(b"alterado antes de ficar obsoleto\n")
            before = _wiki_files(wiki)
            updated_commit = _collapse_operations_into_readme(repository, version="2026-09-14.2")

            result = _run(repository / "docs" / "manual", wiki, updated_commit)

            self.assertEqual(result.returncode, 2, result.stderr)
            self.assertEqual(_wiki_files(wiki), before)

    def test_generate_rejects_unowned_collision_without_removing_old_page(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            repository, commit, _ = _create_source(root)
            wiki = root / "wiki"
            wiki.mkdir()
            self.assertEqual(_run(repository / "docs" / "manual", wiki, commit).returncode, 0)
            old_page = (wiki / "Manual-do-Usuario-operacoes.md").read_bytes()
            old_manifest = (wiki / "manual-publicacao.json").read_bytes()

            source = repository / "docs" / "manual"
            manifest_path = source / "manual.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            operations = source / "operacoes.md"
            operations.rename(source / "nova.md")
            for page in manifest["paginas"]:
                if page["origem"] == "operacoes.md":
                    page["origem"] = "nova.md"
                    page["destinoWiki"] = "Manual-do-Usuario-nova.md"
            for journey in manifest["jornadas"]:
                if journey["pagina"] == "operacoes.md":
                    journey["pagina"] = "nova.md"
            readme = source / "README.md"
            readme.write_text(
                readme.read_text(encoding="utf-8").replace("operacoes.md", "nova.md"),
                encoding="utf-8",
                newline="\n",
            )
            manifest["versaoManual"] = "2026-09-14.2"
            _rewrite_version_lines(source, "2026-09-14.2")
            manifest_path.write_text(
                json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
                newline="\n",
            )
            updated_commit = _commit_source(repository, "manual renomeado")
            collision = wiki / "Manual-do-Usuario-nova.md"
            collision.write_bytes(b"arquivo alheio\n")
            before = _wiki_files(wiki)

            result = _run(repository / "docs" / "manual", wiki, updated_commit)

            self.assertEqual(result.returncode, 2, result.stderr)
            self.assertEqual(_wiki_files(wiki), before)
            self.assertEqual((wiki / "Manual-do-Usuario-operacoes.md").read_bytes(), old_page)
            self.assertEqual((wiki / "manual-publicacao.json").read_bytes(), old_manifest)

    def test_editorial_revision_must_advance_when_content_changes(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            repository, commit, _ = _create_source(root)
            wiki = root / "wiki"
            wiki.mkdir()
            self.assertEqual(_run(repository / "docs" / "manual", wiki, commit).returncode, 0)
            before = _wiki_files(wiki)
            unchanged_revision = _change_source(
                repository, version=EDITORIAL_VERSION, suffix="Conteudo sem revisao."
            )

            rejected = _run(repository / "docs" / "manual", wiki, unchanged_revision)

            self.assertEqual(rejected.returncode, 2, rejected.stderr)
            self.assertEqual(_wiki_files(wiki), before)
            advanced_revision = _change_source(
                repository, version="2026-09-14.2", suffix="Agora com revisao."
            )
            accepted = _run(repository / "docs" / "manual", wiki, advanced_revision)
            self.assertEqual(accepted.returncode, 0, accepted.stderr)

    def test_compatible_rollback_is_a_new_generation(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            repository, first_commit, _ = _create_source(root)
            source = repository / "docs" / "manual"
            version_one = {
                path.relative_to(source).as_posix(): path.read_bytes()
                for path in source.rglob("*")
                if path.is_file()
            }
            wiki = root / "wiki"
            wiki.mkdir()
            self.assertEqual(_run(source, wiki, first_commit).returncode, 0)
            second_commit = _change_source(
                repository, version="2026-09-14.2", suffix="Versao dois."
            )
            self.assertEqual(_run(source, wiki, second_commit).returncode, 0)

            for relative, content in version_one.items():
                (source / Path(relative)).write_bytes(content)
            rollback_commit = _commit_source(repository, "reverter manual para versao um")
            result = _run(source, wiki, rollback_commit)

            self.assertEqual(result.returncode, 0, result.stderr)
            publication = json.loads((wiki / "manual-publicacao.json").read_text(encoding="utf-8"))
            self.assertEqual(publication["commitFonte"], rollback_commit)
            self.assertEqual(publication["metadados"]["versaoManual"], EDITORIAL_VERSION)
            check = _run_mode(source, wiki, rollback_commit, "check")
            self.assertEqual(check.returncode, 0, check.stderr)

    def test_forged_manifest_path_cannot_escape_or_claim_protected_document(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            repository, commit, _ = _create_source(root)
            wiki = root / "wiki"
            wiki.mkdir()
            self.assertEqual(_run(repository / "docs" / "manual", wiki, commit).returncode, 0)
            manifest_path = wiki / "manual-publicacao.json"
            publication = json.loads(manifest_path.read_text(encoding="utf-8"))
            publication["arquivosGerenciados"].append("../outside.md")
            manifest_path.write_text(
                json.dumps(publication, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
                newline="\n",
            )
            before = _wiki_files(wiki)
            updated_commit = _change_source(
                repository, version="2026-09-14.2", suffix="Tentativa segura."
            )
            escaped = _run(repository / "docs" / "manual", wiki, updated_commit)

            self.assertEqual(escaped.returncode, 2, escaped.stderr)
            self.assertEqual(_wiki_files(wiki), before)
            self.assertFalse((root / "outside.md").exists())

            publication = json.loads(manifest_path.read_text(encoding="utf-8"))
            publication["arquivosGerenciados"] = [
                "Home.md" if path == "Manual-do-Usuario.md" else path
                for path in publication["arquivosGerenciados"]
            ]
            publication["paginas"][0]["destinoWiki"] = "Home.md"
            manifest_path.write_text(
                json.dumps(publication, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
                newline="\n",
            )
            protected = _run(repository / "docs" / "manual", wiki, updated_commit)
            self.assertEqual(protected.returncode, 2, protected.stderr)

    def test_managed_symlink_is_rejected_without_touching_target(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            repository, commit, _ = _create_source(root)
            wiki = root / "wiki"
            wiki.mkdir()
            self.assertEqual(_run(repository / "docs" / "manual", wiki, commit).returncode, 0)
            managed = wiki / "Manual-do-Usuario.md"
            original = managed.read_bytes()
            target = root / "outside.md"
            target.write_bytes(b"outside\n")
            managed.unlink()
            try:
                os.symlink(target, managed)
            except OSError as exc:
                self.skipTest(f"symlink indisponivel neste Windows: {exc}")
            updated_commit = _change_source(
                repository, version="2026-09-14.2", suffix="Nao tocar symlink."
            )
            before_target = target.read_bytes()

            result = _run(repository / "docs" / "manual", wiki, updated_commit)

            self.assertEqual(result.returncode, 2, result.stderr)
            self.assertEqual(target.read_bytes(), before_target)
            self.assertTrue(managed.is_symlink())
            self.assertNotEqual(original, target.read_bytes())

    def test_help_is_available_without_remote_or_real_source(self):
        result = subprocess.run(
            [sys.executable, "-B", str(SCRIPT), "--help"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("--ref", result.stdout)
        self.assertIn("--mode", result.stdout)


if __name__ == "__main__":
    unittest.main()
