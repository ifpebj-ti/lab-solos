import re
import tempfile
import unittest
from pathlib import Path

import yaml


TEMPLATE_DIRECTORY = Path(__file__).resolve().parents[2] / "ISSUE_TEMPLATE"
COMMON_SECTIONS = (
    "Contexto",
    "Problema",
    "Objetivo",
    "Resultado esperado",
    "Escopo",
    "Critérios de aceitação",
)
TEMPLATE_SECTIONS = {
    "bug.md": (*COMMON_SECTIONS, "Reprodução ou comportamento observado"),
    "melhoria.md": COMMON_SECTIONS,
}


def template_fixture(sections: tuple[str, ...]) -> str:
    body = "\n\n".join(f"## {section}\nPreencha esta seção." for section in sections)
    return f"---\nname: Modelo de teste\nabout: Exemplo para validar o contrato\n---\n\n{body}\n"


class IssueTemplateTests(unittest.TestCase):
    def check_template(self, content: str, required_sections: tuple[str, ...]) -> str:
        lines = content.splitlines()
        self.assertEqual(["---"], lines[:1], "Metadados devem abrir o modelo")
        self.assertIn("---", lines[1:], "Metadados devem terminar com ---")
        metadata_end = lines.index("---", 1)
        try:
            metadata = yaml.safe_load("\n".join(lines[1:metadata_end]))
        except yaml.YAMLError as error:
            self.fail(f"Metadados YAML inválidos: {error}")
        self.assertIsInstance(metadata, dict, "Metadados devem ser um mapa YAML")

        for field in ("name", "about"):
            value = metadata.get(field)
            self.assertIsInstance(value, str, f"Metadado {field} deve ser texto")
            self.assertTrue(value.strip(), f"Metadado {field} deve ser preenchido")
        for field in ("title", "labels", "assignees"):
            if field in metadata:
                self.assertIsInstance(metadata[field], str, f"Metadado {field} deve ser texto")

        body = "\n".join(lines[metadata_end + 1:])
        body = re.sub(r"<!--.*?-->", "", body, flags=re.DOTALL)
        headings = {heading.strip() for heading in re.findall(r"^##[ \t]+(.+)$", body, re.MULTILINE)}
        for section in required_sections:
            self.assertIn(section, headings, f"Seção obrigatória ausente: {section}")

        return metadata["name"].strip().casefold()

    def check_templates(self, directory: Path) -> None:
        names = set()
        for filename, required_sections in TEMPLATE_SECTIONS.items():
            path = directory / filename
            self.assertTrue(path.is_file(), f"Modelo ausente: {filename}")
            try:
                name = self.check_template(path.read_text(encoding="utf-8"), required_sections)
            except AssertionError as error:
                self.fail(f"{filename}: {error}")
            self.assertNotIn(name, names, f"{filename}: os nomes dos modelos devem ser distintos")
            names.add(name)

    def test_repository_templates_follow_contract(self) -> None:
        self.check_templates(TEMPLATE_DIRECTORY)

    def test_rejects_missing_or_invalid_metadata(self) -> None:
        content = template_fixture(COMMON_SECTIONS)
        invalid_templates = (
            (content.split("---\n", 2)[-1], "Metadados devem abrir"),
            (content.replace("---\n\n##", "\n##", 1), "Metadados devem terminar"),
            (content.replace("name: Modelo de teste", "name: [Modelo de teste"), "YAML inválidos"),
            (content.replace("name: Modelo de teste\n", ""), "Metadado name"),
            (content.replace("about: Exemplo para validar o contrato", 'about: ""'), "Metadado about"),
        )
        for invalid_content, expected_error in invalid_templates:
            with self.subTest(error=expected_error):
                with self.assertRaisesRegex(AssertionError, expected_error):
                    self.check_template(invalid_content, COMMON_SECTIONS)

    def test_rejects_each_missing_required_section(self) -> None:
        for filename, required_sections in TEMPLATE_SECTIONS.items():
            for missing_section in required_sections:
                with self.subTest(template=filename, section=missing_section):
                    remaining_sections = tuple(
                        section for section in required_sections if section != missing_section
                    )
                    content = template_fixture(remaining_sections)
                    with self.assertRaisesRegex(AssertionError, missing_section):
                        self.check_template(content, required_sections)

    def test_rejects_each_missing_template(self) -> None:
        for missing_filename in TEMPLATE_SECTIONS:
            with self.subTest(template=missing_filename), tempfile.TemporaryDirectory() as temporary:
                directory = Path(temporary)
                for filename, required_sections in TEMPLATE_SECTIONS.items():
                    if filename != missing_filename:
                        (directory / filename).write_text(
                            template_fixture(required_sections), encoding="utf-8"
                        )
                with self.assertRaisesRegex(AssertionError, f"Modelo ausente: {missing_filename}"):
                    self.check_templates(directory)

    def test_rejects_duplicate_template_names(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            for filename, required_sections in TEMPLATE_SECTIONS.items():
                (directory / filename).write_text(template_fixture(required_sections), encoding="utf-8")
            with self.assertRaisesRegex(AssertionError, "nomes dos modelos devem ser distintos"):
                self.check_templates(directory)


if __name__ == "__main__":
    unittest.main()
