import io
import json
import importlib.util
import os
import subprocess
import sys
import tempfile
import unittest
from unittest import mock
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "check_manual.py"


def _load_validator():
    specification = importlib.util.spec_from_file_location("manual_validator", SCRIPT)
    module = importlib.util.module_from_spec(specification)
    assert specification.loader is not None
    specification.loader.exec_module(module)
    return module


VALIDATOR = _load_validator()
PROFILES = ("Administrador", "Mentor", "Mentorado")
EXPECTED_VARIANTS = {
    "J01": PROFILES,
    "J02": ("Mentor", "Mentorado"),
    "J03": ("Administrador", "Mentor"),
    "J04": PROFILES,
    "J05": PROFILES,
    "J06": ("Administrador",),
    "J07": PROFILES,
    "J08": ("Mentor", "Mentorado"),
    "J09": ("Administrador",),
    "J10": PROFILES,
    "J11": PROFILES,
}


def _section(journey_id, title, profiles):
    profile_text = ", ".join(profiles)
    return f"""
<a id="{journey_id.lower()}-secao"></a>
## {journey_id} — {title}

**Quem pode executar:** {profile_text}.
**Pré-requisitos:** Conta aprovada e acesso ao ambiente fornecido.
**Onde começar:** Abra o menu correspondente ao seu perfil.
**Passos:**
1. Confira os dados exibidos.
2. Conclua a ação indicada.
**Resultado esperado:** A operação é concluída e o estado atualizado é exibido.
**Erros comuns:** O acesso pode estar pendente ou a lista pode estar vazia.
**Saída segura:** Volte ao início do perfil sem repetir uma confirmação já enviada.
"""


def _page(title, sections):
    body = """# {title}

Versão do manual: 2026-09-14.1
Produto validado: produto-commit-abc123
Atualizado em: 2026-09-14
Responsável pela revisão: Equipe de documentação
{sections}
"""
    return body.format(title=title, sections="\n".join(sections))


def _manifest():
    pages = [
        ("README.md", "Manual-do-Usuario.md", "Manual de uso do LabOn"),
        ("acesso-e-conta.md", "Manual-do-Usuario-acesso-e-conta.md", "Acesso e conta"),
        ("administrador.md", "Manual-do-Usuario-administrador.md", "Administrador"),
        ("mentor.md", "Manual-do-Usuario-mentor.md", "Mentor"),
        ("mentorado.md", "Manual-do-Usuario-mentorado.md", "Mentorado"),
        (
            "solucao-de-problemas.md",
            "Manual-do-Usuario-solucao-de-problemas.md",
            "Solução de problemas",
        ),
    ]
    journey_pages = {
        "J01": "README.md",
        "J02": "acesso-e-conta.md",
        "J03": "administrador.md",
        "J04": "acesso-e-conta.md",
        "J05": "acesso-e-conta.md",
        "J06": "administrador.md",
        "J07": "administrador.md",
        "J08": "mentor.md",
        "J09": "administrador.md",
        "J10": "mentor.md",
        "J11": "solucao-de-problemas.md",
    }
    titles = {
        "J01": "Entender o acesso",
        "J02": "Solicitar cadastro",
        "J03": "Avaliar cadastro e vínculos",
        "J04": "Entrar e concluir primeiro acesso",
        "J05": "Alterar ou recuperar senha e sair",
        "J06": "Preparar a operação",
        "J07": "Gerir materiais",
        "J08": "Solicitar e acompanhar empréstimo",
        "J09": "Decidir e concluir empréstimo",
        "J10": "Gerir e consultar turma ou perfil",
        "J11": "Recuperar-se de falhas",
    }
    return {
        "versaoEsquema": 1,
        "versaoManual": "2026-09-14.1",
        "produtoValidado": "produto-commit-abc123",
        "atualizadoEm": "2026-09-14",
        "responsavelRevisao": "Equipe de documentação",
        "paginas": [
            {"origem": origin, "destinoWiki": destination, "titulo": title}
            for origin, destination, title in pages
        ],
        "jornadas": [
            {
                "id": journey_id,
                "pagina": journey_pages[journey_id],
                "ancora": f"{journey_id.lower()}-secao",
                "perfis": list(EXPECTED_VARIANTS[journey_id]),
                "evidencias": [f"inventario:{journey_id}"],
            }
            for journey_id in EXPECTED_VARIANTS
        ],
        "imagens": [],
    }


def _write_fixture(root, manifest=None):
    source = Path(root) / "manual"
    source.mkdir()
    page_sections = {
        "README.md": [("J01", "Entender o acesso", EXPECTED_VARIANTS["J01"])],
        "acesso-e-conta.md": [
            (journey_id, title, EXPECTED_VARIANTS[journey_id])
            for journey_id, title in (
                ("J02", "Solicitar cadastro"),
                ("J04", "Entrar e concluir primeiro acesso"),
                ("J05", "Alterar ou recuperar senha e sair"),
            )
        ],
        "administrador.md": [
            (journey_id, title, EXPECTED_VARIANTS[journey_id])
            for journey_id, title in (
                ("J03", "Avaliar cadastro e vínculos"),
                ("J06", "Preparar a operação"),
                ("J07", "Gerir materiais"),
                ("J09", "Decidir e concluir empréstimo"),
            )
        ],
        "mentor.md": [
            ("J08", "Solicitar e acompanhar empréstimo", EXPECTED_VARIANTS["J08"]),
            ("J10", "Gerir e consultar turma ou perfil", EXPECTED_VARIANTS["J10"]),
        ],
        "mentorado.md": [],
        "solucao-de-problemas.md": [
            ("J11", "Recuperar-se de falhas", EXPECTED_VARIANTS["J11"])
        ],
    }
    titles = {
        "README.md": "Manual de uso do LabOn",
        "acesso-e-conta.md": "Acesso e conta",
        "administrador.md": "Administrador",
        "mentor.md": "Mentor",
        "mentorado.md": "Mentorado",
        "solucao-de-problemas.md": "Solução de problemas",
    }
    for filename, sections in page_sections.items():
        rendered_sections = [_section(*section) for section in sections]
        (source / filename).write_text(
            _page(titles[filename], rendered_sections), encoding="utf-8", newline="\n"
        )
    (source / "manutencao.md").write_text(
        "# Manutenção\n\nEste arquivo é controle e não é uma página publicada.\n",
        encoding="utf-8",
        newline="\n",
    )
    (source / "manual.json").write_text(
        json.dumps(manifest or _manifest(), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    navigation = {
        "acesso-e-conta.md": "j02-secao",
        "administrador.md": "j03-secao",
        "mentor.md": "j08-secao",
        "mentorado.md": None,
        "solucao-de-problemas.md": "j11-secao",
    }
    readme = source / "README.md"
    readme.write_text(
        readme.read_text(encoding="utf-8")
        + "\n## Navegação\n"
        + "\n".join(
            f"- [{filename}]({filename}{f'#{anchor}' if anchor else ''})"
            for filename, anchor in navigation.items()
        )
        + "\n- [Início](#j01-secao)\n",
        encoding="utf-8",
        newline="\n",
    )
    for filename in navigation:
        page = source / filename
        page.write_text(
            page.read_text(encoding="utf-8") + "\n[Voltar ao índice](README.md)\n",
            encoding="utf-8",
            newline="\n",
        )
    return source


def _run(source, *arguments):
    return subprocess.run(
        [sys.executable, "-B", str(SCRIPT), "--source", str(source), *arguments],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )


class _FakeResponse:
    def __init__(self, status, headers=None):
        self.status = status
        self.headers = headers or {}
        self.read_limits = []
        self.closed = False

    def getcode(self):
        return self.status

    def getheader(self, name, default=None):
        return self.headers.get(name, default)

    def read(self, limit=-1):
        self.read_limits.append(limit)
        return b"x"

    def close(self):
        self.closed = True


class _FakeTransport:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def __call__(self, method, url, timeout, headers):
        self.calls.append((method, url, timeout, dict(headers)))
        response = self.responses.pop(0)
        if isinstance(response, BaseException):
            raise response
        return response


def _external_fixture(root, links):
    source = _write_fixture(root)
    page = source / "README.md"
    page.write_text(
        page.read_text(encoding="utf-8") + "\n" + "\n".join(links) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    return source


def _run_external_main(source, transport):
    output = io.StringIO()
    errors = io.StringIO()
    with mock.patch.object(VALIDATOR, "_default_transport", side_effect=transport), mock.patch.object(
        sys, "stdout", output
    ), mock.patch.object(sys, "stderr", errors):
        code = VALIDATOR.main(["--source", str(source), "--external"])
    return code, output.getvalue(), errors.getvalue()


class ManualContentContractTests(unittest.TestCase):
    def test_valid_manifest_and_all_journey_variants_pass(self):
        with tempfile.TemporaryDirectory() as temporary:
            result = _run(_write_fixture(temporary))

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("aprovado", result.stdout.lower())

    def test_missing_field_is_document_error_and_diagnostic_is_sanitized(self):
        manifest = _manifest()
        manifest.pop("produtoValidado")
        with tempfile.TemporaryDirectory() as temporary:
            source = _write_fixture(temporary, manifest)
            (source / "manual.json").write_text(
                json.dumps(manifest).replace("produto-commit-abc123", "SECRET-TOKEN"),
                encoding="utf-8",
            )
            result = _run(source)

        self.assertEqual(result.returncode, 1)
        self.assertIn("manual.json", result.stderr)
        self.assertNotIn("SECRET-TOKEN", result.stdout + result.stderr)

    def test_invalid_profile_is_rejected(self):
        manifest = _manifest()
        manifest["jornadas"][0]["perfis"] = ["Administrador", "Visitante"]
        with tempfile.TemporaryDirectory() as temporary:
            result = _run(_write_fixture(temporary, manifest))

        self.assertEqual(result.returncode, 1)
        self.assertRegex(result.stderr, r"J01|perfil")

    def test_non_string_profile_is_a_document_error(self):
        manifest = _manifest()
        manifest["jornadas"][0]["perfis"] = ["Administrador", {"perfil": "Mentor"}]
        with tempfile.TemporaryDirectory() as temporary:
            result = _run(_write_fixture(temporary, manifest))

        self.assertEqual(result.returncode, 1)
        self.assertIn("perfil", result.stderr.lower())

    def test_schema_version_must_be_integer_one(self):
        manifest = _manifest()
        manifest["versaoEsquema"] = True
        with tempfile.TemporaryDirectory() as temporary:
            result = _run(_write_fixture(temporary, manifest))

        self.assertEqual(result.returncode, 1)
        self.assertIn("versaoEsquema", result.stderr)

    def test_missing_journey_variant_is_rejected(self):
        manifest = _manifest()
        manifest["jornadas"][2]["perfis"] = ["Administrador"]
        with tempfile.TemporaryDirectory() as temporary:
            result = _run(_write_fixture(temporary, manifest))

        self.assertEqual(result.returncode, 1)
        self.assertIn("J03", result.stderr)

    def test_missing_journey_is_rejected(self):
        manifest = _manifest()
        manifest["jornadas"] = manifest["jornadas"][:-1]
        with tempfile.TemporaryDirectory() as temporary:
            result = _run(_write_fixture(temporary, manifest))

        self.assertEqual(result.returncode, 1)
        self.assertIn("J11", result.stderr)

    def test_case_insensitive_page_collision_is_rejected(self):
        manifest = _manifest()
        manifest["paginas"].append(
            {
                "origem": "ADMINISTRADOR.md",
                "destinoWiki": "Manual-do-Usuario-admin.md",
                "titulo": "Colisão",
            }
        )
        with tempfile.TemporaryDirectory() as temporary:
            result = _run(_write_fixture(temporary, manifest))

        self.assertEqual(result.returncode, 1)
        self.assertRegex(result.stderr, r"duplic|case|ADMINISTRADOR")

    def test_invalid_editorial_version_and_date_are_rejected(self):
        for field, value in (("versaoManual", "2026-02-30.0"), ("atualizadoEm", "14/09/2026")):
            manifest = _manifest()
            manifest[field] = value
            with self.subTest(field=field), tempfile.TemporaryDirectory() as temporary:
                result = _run(_write_fixture(temporary, manifest))

            self.assertEqual(result.returncode, 1)
            self.assertIn(field, result.stderr)

    def test_page_metadata_must_match_manifest(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = _write_fixture(temporary)
            page = source / "mentor.md"
            page.write_text(
                page.read_text(encoding="utf-8").replace(
                    "Versão do manual: 2026-09-14.1", "Versão do manual: 2026-09-14.2"
                ),
                encoding="utf-8",
                newline="\n",
            )
            result = _run(source)

        self.assertEqual(result.returncode, 1)
        self.assertIn("mentor.md", result.stderr)
        self.assertIn("metad", result.stderr.lower())

    def test_operational_section_requires_steps_result_and_safe_exit(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = _write_fixture(temporary)
            page = source / "administrador.md"
            page.write_text(
                page.read_text(encoding="utf-8").replace(
                    "**Saída segura:**", "**Saída:**", 1
                ),
                encoding="utf-8",
                newline="\n",
            )
            result = _run(source)

        self.assertEqual(result.returncode, 1)
        self.assertIn("saída segura", result.stderr.lower())

    def test_uninventoried_page_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = _write_fixture(temporary)
            (source / "rascunho.md").write_text("# Não inventariado\n", encoding="utf-8")
            result = _run(source)

        self.assertEqual(result.returncode, 1)
        self.assertIn("rascunho.md", result.stderr)

    def test_uninventoried_image_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = _write_fixture(temporary)
            image_directory = source / "imagens"
            image_directory.mkdir()
            (image_directory / "tela.png").write_bytes(b"not-a-real-image")
            result = _run(source)

        self.assertEqual(result.returncode, 1)
        self.assertIn("tela.png", result.stderr)

    def test_control_file_cannot_be_published(self):
        manifest = _manifest()
        manifest["paginas"].append(
            {"origem": "manutencao.md", "destinoWiki": "Manutencao.md", "titulo": "Manutenção"}
        )
        with tempfile.TemporaryDirectory() as temporary:
            result = _run(_write_fixture(temporary, manifest))

        self.assertEqual(result.returncode, 1)
        self.assertIn("controle", result.stderr.lower())

    def test_missing_inventoried_file_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = _write_fixture(temporary)
            (source / "mentor.md").unlink()
            result = _run(source)

        self.assertEqual(result.returncode, 1)
        self.assertIn("mentor.md", result.stderr)

    def test_missing_source_is_input_error(self):
        with tempfile.TemporaryDirectory() as temporary:
            result = _run(Path(temporary) / "does-not-exist")

        self.assertEqual(result.returncode, 2)
        self.assertNotIn("Traceback", result.stderr)

    def test_help_is_available_without_a_source(self):
        result = subprocess.run(
            [sys.executable, "-B", str(SCRIPT), "--help"],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )

        self.assertEqual(result.returncode, 0)
        self.assertIn("--source", result.stdout)

    def test_valid_inline_links_images_anchors_accents_and_percent_encoding_pass(self):
        manifest = _manifest()
        manifest["imagens"] = [
            {
                "arquivo": "imagens/tela-inicial.png",
                "jornada": "J01",
                "descricao": "Tela inicial sintética",
                "produtoValidado": manifest["produtoValidado"],
                "revisaoPrivacidade": {
                    "responsavel": "Equipe de documentação",
                    "data": "2026-09-14",
                },
            }
        ]
        with tempfile.TemporaryDirectory() as temporary:
            source = _write_fixture(temporary, manifest)
            (source / "imagens").mkdir()
            (source / "imagens" / "tela-inicial.png").write_bytes(b"PNG")
            page = source / "README.md"
            page.write_text(
                page.read_text(encoding="utf-8")
                + "\n[Orientação de acesso](acesso-e-conta.md#j02%2Dsecao)\n"
                + "![Tela inicial — demonstração](imagens/tela-inicial.png)\n",
                encoding="utf-8",
                newline="\n",
            )
            result = _run(source)

        self.assertEqual(result.returncode, 0, result.stderr)

    def test_every_page_must_be_reachable_from_readme(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = _write_fixture(temporary)
            readme = source / "README.md"
            readme.write_text(
                readme.read_text(encoding="utf-8").replace(
                    "- [mentorado.md](mentorado.md)", ""
                ),
                encoding="utf-8",
                newline="\n",
            )
            result = _run(source)

        self.assertEqual(result.returncode, 1)
        self.assertRegex(result.stderr.lower(), r"órfã|alcance|alcanç")

    def test_every_functional_page_must_return_to_readme(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = _write_fixture(temporary)
            page = source / "mentor.md"
            page.write_text(
                page.read_text(encoding="utf-8").replace(
                    "[Voltar ao índice](README.md)", "", 1
                ),
                encoding="utf-8",
                newline="\n",
            )
            result = _run(source)

        self.assertEqual(result.returncode, 1)
        self.assertRegex(result.stderr.lower(), r"retorno|índice")

    def test_missing_fragment_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = _write_fixture(temporary)
            readme = source / "README.md"
            readme.write_text(
                readme.read_text(encoding="utf-8").replace(
                    "acesso-e-conta.md#j02-secao", "acesso-e-conta.md#nao-existe"
                ),
                encoding="utf-8",
                newline="\n",
            )
            result = _run(source)

        self.assertEqual(result.returncode, 1)
        self.assertRegex(result.stderr.lower(), r"fragment|âncora")

    def test_duplicate_explicit_anchor_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = _write_fixture(temporary)
            page = source / "mentor.md"
            page.write_text(
                page.read_text(encoding="utf-8")
                + "\n<a id=\"j08-secao\"></a>\n",
                encoding="utf-8",
                newline="\n",
            )
            result = _run(source)

        self.assertEqual(result.returncode, 1)
        self.assertRegex(result.stderr.lower(), r"âncora|duplic")

    def test_image_must_have_non_empty_alt_and_be_in_inventory(self):
        manifest = _manifest()
        with tempfile.TemporaryDirectory() as temporary:
            source = _write_fixture(temporary, manifest)
            image_directory = source / "imagens"
            image_directory.mkdir()
            (image_directory / "tela.png").write_bytes(b"PNG")
            page = source / "README.md"
            page.write_text(
                page.read_text(encoding="utf-8")
                + "\n![](imagens/tela.png)\n",
                encoding="utf-8",
                newline="\n",
            )
            result = _run(source)

        self.assertEqual(result.returncode, 1)
        self.assertRegex(result.stderr.lower(), r"alt|inventário")

    def test_image_missing_from_inventory_is_rejected_even_when_file_exists(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = _write_fixture(temporary)
            image_directory = source / "imagens"
            image_directory.mkdir()
            (image_directory / "tela.png").write_bytes(b"PNG")
            page = source / "README.md"
            page.write_text(
                page.read_text(encoding="utf-8")
                + "\n![Tela](imagens/tela.png)\n",
                encoding="utf-8",
                newline="\n",
            )
            result = _run(source)

        self.assertEqual(result.returncode, 1)
        self.assertIn("inventário", result.stderr.lower())

    def test_broken_inline_link_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = _write_fixture(temporary)
            page = source / "README.md"
            page.write_text(
                page.read_text(encoding="utf-8")
                + "\n[Destino quebrado](nao-existe.md)\n",
                encoding="utf-8",
                newline="\n",
            )
            result = _run(source)

        self.assertEqual(result.returncode, 1)
        self.assertRegex(result.stderr.lower(), r"link|destino|existe")

    def test_paths_must_not_escape_root_or_use_local_absolute_schemes(self):
        destinations = ("../../fora.md", "/fora.md", "C:/fora.md", "file:///fora.md")
        for destination in destinations:
            with self.subTest(destination=destination), tempfile.TemporaryDirectory() as temporary:
                source = _write_fixture(temporary)
                page = source / "README.md"
                page.write_text(
                    page.read_text(encoding="utf-8")
                    + f"\n[Destino inseguro]({destination})\n",
                    encoding="utf-8",
                    newline="\n",
                )
                result = _run(source)

            self.assertEqual(result.returncode, 1)
            self.assertRegex(result.stderr.lower(), r"relativ|raiz|local|esquema|absolut|https")

    def test_executable_schemes_and_credentials_are_rejected(self):
        destinations = (
            "javascript:alert(1)",
            "data:text/plain,segredo",
            "http://example.test/manual",
            "https://usuario:senha@example.test/manual",
        )
        for destination in destinations:
            with self.subTest(destination=destination), tempfile.TemporaryDirectory() as temporary:
                source = _write_fixture(temporary)
                page = source / "README.md"
                page.write_text(
                    page.read_text(encoding="utf-8")
                    + f"\n[Destino inseguro]({destination})\n",
                    encoding="utf-8",
                    newline="\n",
                )
                result = _run(source)

            self.assertEqual(result.returncode, 1)
            self.assertRegex(result.stderr.lower(), r"esquema|credencial|https")

    def test_html_and_reference_style_markdown_are_rejected(self):
        snippets = (
            "<img src=\"imagens/tela.png\" alt=\"Tela\">",
            "[Acesso][conta]\n\n[conta]: acesso-e-conta.md",
            "<https://example.test/manual>",
        )
        for snippet in snippets:
            with self.subTest(snippet=snippet), tempfile.TemporaryDirectory() as temporary:
                source = _write_fixture(temporary)
                page = source / "README.md"
                page.write_text(
                    page.read_text(encoding="utf-8") + f"\n{snippet}\n",
                    encoding="utf-8",
                    newline="\n",
                )
                result = _run(source)

            self.assertEqual(result.returncode, 1)
            self.assertRegex(result.stderr.lower(), r"html|suport|referência|refer")

    def test_links_and_html_inside_inline_or_fenced_code_are_ignored(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = _write_fixture(temporary)
            page = source / "README.md"
            page.write_text(
                page.read_text(encoding="utf-8")
                + "\nExemplo inline: `[Quebrado](nao-existe.md)` e `<div>`.\n"
                + "\n```markdown\n[Outro quebrado](tambem-nao-existe.md)\n<img src=\"segredo\">\n```\n",
                encoding="utf-8",
                newline="\n",
            )
            result = _run(source)

        self.assertEqual(result.returncode, 0, result.stderr)

    def test_external_flag_is_available_and_local_validation_remains_offline(self):
        result = subprocess.run(
            [sys.executable, "-B", str(SCRIPT), "--help"],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )

        self.assertEqual(result.returncode, 0)
        self.assertIn("--external", result.stdout)

        with tempfile.TemporaryDirectory() as temporary:
            source = _external_fixture(temporary, ["[Documentacao](https://docs.example.com/manual)"])
            transport = _FakeTransport([_FakeResponse(200)])
            errors = VALIDATOR.validate_source(source, transport=transport)

        self.assertEqual(errors, [])
        self.assertEqual(transport.calls, [])

    def test_external_links_are_unique_and_use_head_with_ten_second_timeout(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = _external_fixture(
                temporary,
                [
                    "[Documentacao](https://docs.example.com/manual)",
                    "[Mesmo destino](https://docs.example.com/manual)",
                ],
            )
            transport = _FakeTransport([_FakeResponse(200)])
            errors = VALIDATOR.validate_source(source, external=True, transport=transport)

        self.assertEqual(errors, [])
        self.assertEqual(len(transport.calls), 1)
        self.assertEqual(transport.calls[0][0], "HEAD")
        self.assertEqual(transport.calls[0][2], 10)

    def test_head_not_allowed_falls_back_to_limited_get(self):
        head = _FakeResponse(405)
        get = _FakeResponse(200)
        transport = _FakeTransport([head, get])
        with tempfile.TemporaryDirectory() as temporary:
            source = _external_fixture(temporary, ["[Documentacao](https://docs.example.com/manual)"])
            errors = VALIDATOR.validate_source(source, external=True, transport=transport)

        self.assertEqual(errors, [])
        self.assertEqual([call[0] for call in transport.calls], ["HEAD", "GET"])
        self.assertEqual(transport.calls[1][3]["Range"], "bytes=0-4095")
        self.assertEqual(get.read_limits, [4096])

    def test_external_http_statuses_distinguish_invalid_and_inconclusive(self):
        for status, expected_code in ((404, 1), (410, 1), (429, 3), (503, 3), (401, 3), (403, 3)):
            with self.subTest(status=status), tempfile.TemporaryDirectory() as temporary:
                source = _external_fixture(temporary, ["[Documentacao](https://docs.example.com/manual)"])
                responses = [_FakeResponse(status)]
                if status == 429 or status >= 500:
                    responses.append(_FakeResponse(status))
                transport = _FakeTransport(responses)
                code, _, diagnostic = _run_external_main(source, transport)

            self.assertEqual(code, expected_code, diagnostic)

    def test_timeout_is_retried_once_and_remains_inconclusive(self):
        transport = _FakeTransport([TimeoutError("timeout"), TimeoutError("timeout")])
        with tempfile.TemporaryDirectory() as temporary:
            source = _external_fixture(temporary, ["[Documentacao](https://docs.example.com/manual)"])
            code, _, diagnostic = _run_external_main(source, transport)

        self.assertEqual(code, 3, diagnostic)
        self.assertEqual(len(transport.calls), 2)

    def test_transient_failure_can_succeed_on_second_attempt(self):
        transport = _FakeTransport([_FakeResponse(503), _FakeResponse(200)])
        with tempfile.TemporaryDirectory() as temporary:
            source = _external_fixture(temporary, ["[Documentacao](https://docs.example.com/manual)"])
            errors = VALIDATOR.validate_source(source, external=True, transport=transport)

        self.assertEqual(errors, [])
        self.assertEqual(len(transport.calls), 2)

    def test_authenticated_header_is_inconclusive_even_for_success_status(self):
        transport = _FakeTransport([_FakeResponse(200, {"WWW-Authenticate": "Bearer"})])
        with tempfile.TemporaryDirectory() as temporary:
            source = _external_fixture(temporary, ["[Documentacao](https://docs.example.com/manual)"])
            code, _, diagnostic = _run_external_main(source, transport)

        self.assertEqual(code, 3, diagnostic)

    def test_redirects_are_revalidated_and_only_https_public_targets_are_followed(self):
        transport = _FakeTransport(
            [
                _FakeResponse(302, {"Location": "https://redirect.example.com/manual"}),
                _FakeResponse(200),
            ]
        )
        with tempfile.TemporaryDirectory() as temporary:
            source = _external_fixture(temporary, ["[Documentacao](https://docs.example.com/manual)"])
            errors = VALIDATOR.validate_source(source, external=True, transport=transport)

        self.assertEqual(errors, [])
        self.assertEqual([call[1] for call in transport.calls], [
            "https://docs.example.com/manual",
            "https://redirect.example.com/manual",
        ])

    def test_prohibited_external_destinations_are_rejected_without_transport_access(self):
        destinations = (
            "https://127.0.0.1/health",
            "https://usuario:senha@docs.example.com/manual",
            "https://docs.example.com/reset-password?token=secret",
            "http://docs.example.com/manual",
        )
        with tempfile.TemporaryDirectory() as temporary:
            source = _external_fixture(
                temporary,
                [f"[Destino {index}]({destination})" for index, destination in enumerate(destinations)],
            )
            transport = _FakeTransport([])
            errors = VALIDATOR.validate_source(source, external=True, transport=transport)

        self.assertTrue(errors)
        self.assertEqual(transport.calls, [])

    def test_redirect_to_private_or_prohibited_destination_is_not_followed(self):
        for destination in (
            "http://redirect.example.com/manual",
            "https://127.0.0.1/private",
            "https://usuario:senha@redirect.example.com/manual",
            "https://redirect.example.com/recovery?token=secret",
        ):
            with self.subTest(destination=destination), tempfile.TemporaryDirectory() as temporary:
                source = _external_fixture(temporary, ["[Documentacao](https://docs.example.com/manual)"])
                transport = _FakeTransport([_FakeResponse(302, {"Location": destination})])
                code, _, diagnostic = _run_external_main(source, transport)

            self.assertEqual(code, 1, diagnostic)
            self.assertEqual(len(transport.calls), 1)

    def test_redirect_limit_is_five_and_sixth_redirect_is_not_followed(self):
        responses = [
            _FakeResponse(301, {"Location": f"https://redirect{index}.example.com/manual"})
            for index in range(1, 7)
        ]
        transport = _FakeTransport(responses)
        with tempfile.TemporaryDirectory() as temporary:
            source = _external_fixture(temporary, ["[Documentacao](https://docs.example.com/manual)"])
            code, _, diagnostic = _run_external_main(source, transport)

        self.assertEqual(code, 1, diagnostic)
        self.assertEqual(len(transport.calls), 6)

    def test_document_errors_take_precedence_over_external_inconclusive_results(self):
        def transport(method, url, timeout, headers):
            if "invalid" in url:
                return _FakeResponse(404)
            raise TimeoutError("timeout")

        with tempfile.TemporaryDirectory() as temporary:
            source = _external_fixture(
                temporary,
                [
                    "[Invalido](https://invalid.example.com/manual)",
                    "[Indisponivel](https://timeout.example.com/manual)",
                ],
            )
            code, _, diagnostic = _run_external_main(source, transport)

        self.assertEqual(code, 1, diagnostic)

    def test_redirect_to_institutional_host_is_rejected_without_following_it(self):
        transport = _FakeTransport(
            [_FakeResponse(302, {"Location": "https://sistema.institucional.example/manual"})]
        )
        with tempfile.TemporaryDirectory() as temporary:
            source = _external_fixture(temporary, ["[Documentacao](https://docs.example.com/manual)"])
            code, _, diagnostic = _run_external_main(source, transport)

        self.assertEqual(code, 1, diagnostic)
        self.assertEqual(len(transport.calls), 1)

    def test_local_mode_accepts_https_without_opening_a_connection(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = _write_fixture(temporary)
            page = source / "README.md"
            page.write_text(
                page.read_text(encoding="utf-8")
                + "\n[Documentação pública](https://example.test/manual)\n",
                encoding="utf-8",
                newline="\n",
            )
            with mock.patch("urllib.request.urlopen", side_effect=AssertionError("rede aberta")):
                errors = VALIDATOR.validate_source(source)

        self.assertEqual(errors, [])

    def test_symlink_inside_source_is_rejected_when_platform_allows_creation(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = _write_fixture(temporary)
            outside = Path(temporary) / "fora.md"
            outside.write_text("# Fora\n", encoding="utf-8")
            symlink = source / "atalho.md"
            try:
                os.symlink(outside, symlink)
            except (OSError, NotImplementedError) as exc:
                self.skipTest(f"limitação real do Windows ao criar symlink: {exc}")
            result = _run(source)

        self.assertEqual(result.returncode, 1)
        self.assertIn("simbólico", result.stderr.lower())


if __name__ == "__main__":
    unittest.main()
