import importlib.util
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


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


class IssueOnlySyncTests(unittest.TestCase):
    def make_sync(self):
        sync = MODULE.ProjectSync.__new__(MODULE.ProjectSync)
        sync.owner = "owner"
        sync.number = 4
        sync.repository = "owner/repository"
        sync.dry_run = False
        sync.project_id = "project-id"
        sync.fields = {}
        sync.project_items = []
        sync.items = {}
        return sync

    def test_sync_open_items_queries_only_issues(self):
        sync = self.make_sync()
        issue = {
            "number": 236,
            "title": "Corrigir vulnerabilidades",
            "url": "https://github.com/owner/repository/issues/236",
            "labels": [],
        }

        with (
            patch.object(MODULE, "gh_json", return_value=[issue]) as gh_json,
            patch.object(sync, "ensure_item", return_value=(None, True)) as ensure_item,
        ):
            sync.sync_open_items()

        gh_json.assert_called_once()
        self.assertEqual(gh_json.call_args.args[:2], ("issue", "list"))
        ensure_item.assert_called_once_with(issue)

    def test_remove_non_issue_items_preserves_issues_and_removes_pull_requests(self):
        sync = self.make_sync()
        sync.project_items = [
            {"id": "issue-item", "content": {"type": "Issue"}},
            {"id": "pr-item", "content": {"type": "PullRequest"}},
            {"id": "draft-item", "content": {"type": "DraftIssue"}},
        ]

        with (
            patch.object(MODULE, "run_gh") as run_gh,
            patch.object(sync, "refresh_items") as refresh_items,
        ):
            sync.remove_non_issue_items()

        self.assertEqual(
            [call.args[-1] for call in run_gh.call_args_list],
            ["pr-item", "draft-item"],
        )
        refresh_items.assert_called_once_with()

    def test_pull_request_event_is_ignored(self):
        sync = self.make_sync()
        with tempfile.TemporaryDirectory() as temporary_directory:
            event_path = Path(temporary_directory) / "event.json"
            event_path.write_text(
                '{"pull_request":{"number":244,"title":"PR","html_url":"https://example/pr"}}',
                encoding="utf-8",
            )
            with (
                patch.dict(
                    os.environ,
                    {"GITHUB_EVENT_PATH": str(event_path), "GITHUB_EVENT_NAME": "pull_request_target"},
                ),
                patch.object(sync, "ensure_item") as ensure_item,
            ):
                sync.sync_event()

        ensure_item.assert_not_called()


class WorkflowTests(unittest.TestCase):
    def test_workflow_does_not_subscribe_to_pull_requests(self):
        workflow = (SCRIPT.parents[1] / "workflows" / "project-metrics.yml").read_text(
            encoding="utf-8"
        )
        self.assertNotIn("pull_request_target:", workflow)
        self.assertNotIn("pull-requests: read", workflow)


if __name__ == "__main__":
    unittest.main()
