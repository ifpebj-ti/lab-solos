import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "sync_github_project.py"
SPEC = importlib.util.spec_from_file_location("sync_github_project", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(MODULE)


class ClassificationTests(unittest.TestCase):
    def test_security_dependency_is_high_priority(self):
        result = MODULE.classify("Corrigir vulnerabilidades do Dependabot", [])
        self.assertEqual(result["Tipo"], "Segurança")
        self.assertEqual(result["Área"], "Segurança")
        self.assertEqual(result["Prioridade"], "P1 Alta")
        self.assertEqual(result["Severidade"], "Alta")

    def test_frontend_bug_is_classified(self):
        result = MODULE.classify("Corrigir erro de layout no frontend", [])
        self.assertEqual(result["Tipo"], "Bug")
        self.assertEqual(result["Área"], "Frontend")
        self.assertEqual(result["Prioridade"], "P2 Média")

    def test_prd_label_sets_prd(self):
        result = MODULE.classify("Adicionar alteração de senha", [{"name": "prd:autenticacao"}])
        self.assertEqual(result["PRD"], "Ciclo de vida de autenticação e credenciais")


class MetricsBlockTests(unittest.TestCase):
    def test_replaces_existing_metrics_without_changing_surroundings(self):
        readme = "Antes\n<!-- METRICS:START -->\nantigo\n<!-- METRICS:END -->\nDepois"
        result = MODULE.replace_metrics_block(readme, ["- Novo: 1"])
        self.assertEqual(
            result,
            "Antes\n<!-- METRICS:START -->\n- Novo: 1\n<!-- METRICS:END -->\nDepois",
        )

    def test_adds_metrics_when_markers_are_missing(self):
        result = MODULE.replace_metrics_block("# Projeto\n", ["- Novo: 1"])
        self.assertIn("## Indicadores atuais", result)
        self.assertIn("- Novo: 1", result)


if __name__ == "__main__":
    unittest.main()
