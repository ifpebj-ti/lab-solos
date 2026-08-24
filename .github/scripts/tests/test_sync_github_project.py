import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, call, patch


SCRIPT = Path(__file__).parents[1] / "sync_github_project.py"
SPEC = importlib.util.spec_from_file_location("sync_github_project", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(MODULE)


def required_fields():
    return [
        {
            "id": "status-field",
            "name": "Status",
            "options": [
                {"id": "todo", "name": "Todo"},
                {"id": "in-progress", "name": "In Progress"},
                {"id": "done", "name": "Done"},
            ],
        },
        {
            "id": "type-field",
            "name": "Tipo",
            "options": [
                {"id": "security", "name": "Segurança"},
                {"id": "devops", "name": "DevOps"},
                {"id": "docs", "name": "Documentação"},
                {"id": "quality", "name": "Qualidade"},
                {"id": "bug", "name": "Bug"},
                {"id": "feature", "name": "Feature"},
            ],
        },
        {
            "id": "area-field",
            "name": "Área",
            "options": [
                {"id": "cicd", "name": "CI/CD"},
                {"id": "frontend", "name": "Frontend"},
                {"id": "backend", "name": "Backend"},
                {"id": "security-area", "name": "Segurança"},
                {"id": "docs-area", "name": "Documentação"},
                {"id": "product", "name": "Produto"},
            ],
        },
        {
            "id": "priority-field",
            "name": "Prioridade",
            "options": [
                {"id": "p0", "name": "P0 Crítica"},
                {"id": "p1", "name": "P1 Alta"},
                {"id": "p2", "name": "P2 Média"},
                {"id": "p3", "name": "P3 Baixa"},
            ],
        },
        {
            "id": "severity-field",
            "name": "Severidade",
            "options": [
                {"id": "critical", "name": "Crítica"},
                {"id": "high", "name": "Alta"},
                {"id": "na", "name": "N/A"},
            ],
        },
        {"id": "prd-field", "name": "PRD"},
    ]


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


class ProjectSchemaTests(unittest.TestCase):
    def test_constructor_rejects_missing_fields_before_listing_items(self):
        fields = [field for field in required_fields() if field["name"] != "PRD"]

        with (
            patch.object(
                MODULE,
                "gh_json",
                side_effect=[{"id": "project-id"}, {"fields": fields}, {"items": []}],
            ) as gh_json,
            self.assertRaisesRegex(RuntimeError, r"Campos ausentes: PRD"),
        ):
            MODULE.ProjectSync("ifpebj-ti", 41, "ifpebj-ti/lab-solos")

        self.assertEqual(gh_json.call_count, 2)

    def test_constructor_reports_missing_select_options(self):
        fields = required_fields()
        status = next(field for field in fields if field["name"] == "Status")
        status["options"] = [option for option in status["options"] if option["name"] != "Done"]

        with (
            patch.object(
                MODULE,
                "gh_json",
                side_effect=[{"id": "project-id"}, {"fields": fields}, {"items": []}],
            ) as gh_json,
            self.assertRaisesRegex(RuntimeError, r"Opções ausentes: Status \(Done\)"),
        ):
            MODULE.ProjectSync("ifpebj-ti", 41, "ifpebj-ti/lab-solos")

        self.assertEqual(gh_json.call_count, 2)


class ProjectSyncTests(unittest.TestCase):
    def make_sync(self):
        sync = MODULE.ProjectSync.__new__(MODULE.ProjectSync)
        sync.owner = "ifpebj-ti"
        sync.number = 41
        sync.repository = "ifpebj-ti/lab-solos"
        sync.dry_run = False
        sync.project_id = "project-id"
        sync.fields = {field["name"]: field for field in required_fields()}
        sync.project_items = []
        sync.items = {}
        return sync

    def test_refresh_items_lists_up_to_1000_and_preserves_every_content_type(self):
        sync = self.make_sync()
        project_items = [
            {"id": "issue-item", "content": {"type": "Issue", "url": "https://example/1"}},
            {
                "id": "pr-item",
                "content": {"type": "PullRequest", "url": "https://example/2"},
            },
            {"id": "draft-item", "content": {"type": "DraftIssue"}},
        ]

        with patch.object(MODULE, "gh_json", return_value={"items": project_items}) as gh_json:
            sync.refresh_items()

        gh_json.assert_called_once_with(
            "project",
            "item-list",
            "41",
            "--owner",
            "ifpebj-ti",
            "--limit",
            "1000",
            "--format",
            "json",
        )
        self.assertEqual(sync.project_items, project_items)
        self.assertEqual(set(sync.items), {"https://example/1", "https://example/2"})

    def test_implementation_contains_no_item_deletion(self):
        source = SCRIPT.read_text(encoding="utf-8")

        self.assertNotIn('"item-delete"', source)
        self.assertNotIn("remove_non_issue_items", source)

    def test_sync_open_items_queries_issues_and_pull_requests(self):
        sync = self.make_sync()
        issue = {
            "number": 236,
            "title": "Corrigir vulnerabilidades",
            "url": "https://github.com/ifpebj-ti/lab-solos/issues/236",
            "labels": [],
        }
        pull_request = {
            "number": 244,
            "title": "Atualizar frontend",
            "url": "https://github.com/ifpebj-ti/lab-solos/pull/244",
            "labels": [],
        }

        with (
            patch.object(MODULE, "gh_json", side_effect=[[issue], [pull_request]]) as gh_json,
            patch.object(
                sync,
                "ensure_item",
                side_effect=[
                    ({"id": "issue-item", "content": issue}, True),
                    ({"id": "pr-item", "content": pull_request}, True),
                ],
            ) as ensure_item,
            patch.object(sync, "set_select") as set_select,
            patch.object(sync, "classify_item") as classify_item,
        ):
            sync.sync_open_items()

        self.assertEqual(
            gh_json.call_args_list,
            [
                call(
                    "issue", "list", "--repo", sync.repository, "--state", "open",
                    "--limit", "1000", "--json", "number,title,url,labels",
                ),
                call(
                    "pr", "list", "--repo", sync.repository, "--state", "open",
                    "--limit", "1000", "--json", "number,title,url,labels",
                ),
            ],
        )
        self.assertEqual(ensure_item.call_args_list, [call(issue), call(pull_request)])
        self.assertEqual(
            set_select.call_args_list,
            [call("issue-item", "Status", "Todo"), call("pr-item", "Status", "Todo")],
        )
        self.assertEqual(
            classify_item.call_args_list,
            [call("issue-item", issue), call("pr-item", pull_request)],
        )

    def test_sync_open_items_does_not_add_an_existing_url_again(self):
        sync = self.make_sync()
        issue = {
            "number": 236,
            "title": "Issue existente",
            "url": "https://github.com/ifpebj-ti/lab-solos/issues/236",
            "labels": [],
        }
        pull_request = {
            "number": 244,
            "title": "PR nova",
            "url": "https://github.com/ifpebj-ti/lab-solos/pull/244",
            "labels": [],
        }
        sync.items[issue["url"]] = {"id": "existing-item", "content": issue}

        with (
            patch.object(
                MODULE,
                "gh_json",
                side_effect=[[issue], [pull_request], {"id": "new-pr-item"}],
            ) as gh_json,
            patch.object(sync, "set_select"),
            patch.object(sync, "classify_item"),
        ):
            sync.sync_open_items()

        self.assertEqual(gh_json.call_count, 3)
        self.assertEqual(
            gh_json.call_args_list[-1],
            call(
                "project", "item-add", "41", "--owner", "ifpebj-ti", "--url",
                pull_request["url"], "--format", "json",
            ),
        )

    def test_reclassification_clears_prd_when_its_label_is_removed(self):
        sync = self.make_sync()

        with (
            patch.object(sync, "set_select"),
            patch.object(MODULE, "run_gh") as run_gh,
        ):
            sync.classify_item(
                "event-item",
                {"title": "Adicionar funcionalidade", "labels": []},
            )

        run_gh.assert_called_once_with(
            "project",
            "item-edit",
            "--id",
            "event-item",
            "--project-id",
            "project-id",
            "--field-id",
            "prd-field",
            "--clear",
        )

    def run_event(self, sync, event_name, payload, *, created=False):
        event_key = "issue" if event_name == "issues" else "pull_request"
        content = payload[event_key]
        normalized = {
            "number": content["number"],
            "title": content["title"],
            "url": content["html_url"],
            "labels": content.get("labels", []),
        }
        with tempfile.TemporaryDirectory() as temporary_directory:
            event_path = Path(temporary_directory) / "event.json"
            event_path.write_text(json.dumps(payload), encoding="utf-8")
            with (
                patch.dict(
                    os.environ,
                    {"GITHUB_EVENT_PATH": str(event_path), "GITHUB_EVENT_NAME": event_name},
                ),
                patch.object(
                    sync,
                    "ensure_item",
                    return_value=({"id": "event-item", "content": normalized}, created),
                ) as ensure_item,
                patch.object(sync, "classify_item") as classify_item,
                patch.object(sync, "set_select") as set_select,
                patch.object(
                    sync, "sync_linked_issues_for_pull_request"
                ) as sync_linked_issues,
            ):
                sync.sync_event()
        return normalized, ensure_item, classify_item, set_select, sync_linked_issues

    def test_pull_request_event_is_synchronized_and_new_item_is_classified(self):
        sync = self.make_sync()
        payload = {
            "action": "opened",
            "pull_request": {
                "number": 244,
                "title": "Atualizar frontend",
                "html_url": "https://github.com/ifpebj-ti/lab-solos/pull/244",
                "labels": [{"name": "Frontend"}],
            },
        }

        normalized, ensure_item, classify_item, set_select, sync_linked_issues = self.run_event(
            sync, "pull_request", payload, created=True
        )

        ensure_item.assert_called_once_with(normalized)
        classify_item.assert_called_once_with("event-item", normalized)
        set_select.assert_called_once_with("event-item", "Status", "Todo")
        sync_linked_issues.assert_called_once_with(244)

    def test_labeled_and_unlabeled_events_reclassify_existing_items(self):
        sync = self.make_sync()
        for action in ("labeled", "unlabeled"):
            with self.subTest(action=action):
                payload = {
                    "action": action,
                    "issue": {
                        "number": 236,
                        "title": "Corrigir tela",
                        "html_url": "https://github.com/ifpebj-ti/lab-solos/issues/236",
                        "labels": [{"name": "prd:responsividade"}],
                    },
                }

                normalized, _, classify_item, set_select, sync_linked_issues = self.run_event(
                    sync, "issues", payload
                )

                classify_item.assert_called_once_with("event-item", normalized)
                set_select.assert_not_called()
                sync_linked_issues.assert_not_called()

    def test_event_status_mapping(self):
        sync = self.make_sync()
        expected_statuses = {
            "opened": "Todo",
            "reopened": "Todo",
            "converted_to_draft": "Todo",
            "ready_for_review": "In Progress",
            "closed": "Done",
        }
        for action, expected_status in expected_statuses.items():
            with self.subTest(action=action):
                payload = {
                    "action": action,
                    "pull_request": {
                        "number": 244,
                        "title": "Atualizar frontend",
                        "html_url": "https://github.com/ifpebj-ti/lab-solos/pull/244",
                        "labels": [],
                    },
                }

                _, _, classify_item, set_select, sync_linked_issues = self.run_event(
                    sync, "pull_request", payload
                )

                classify_item.assert_not_called()
                set_select.assert_called_once_with("event-item", "Status", expected_status)
                sync_linked_issues.assert_called_once_with(244)

    def test_linked_issue_lookup_paginates_and_advances_existing_project_issues(self):
        sync = self.make_sync()
        first_url = "https://github.com/ifpebj-ti/lab-solos/issues/101"
        second_url = "https://github.com/ifpebj-ti/lab-solos/issues/102"
        sync.items = {
            first_url: {
                "id": "first-issue-item",
                "status": "Todo",
                "content": {"type": "Issue", "url": first_url},
            },
            second_url: {
                "id": "second-issue-item",
                "status": "",
                "content": {"type": "Issue", "url": second_url},
            },
        }
        pages = [
            {
                "data": {
                    "repository": {
                        "pullRequest": {
                            "closingIssuesReferences": {
                                "nodes": [{"url": first_url, "state": "OPEN"}],
                                "pageInfo": {"hasNextPage": True, "endCursor": "cursor-1"},
                            }
                        }
                    }
                }
            },
            {
                "data": {
                    "repository": {
                        "pullRequest": {
                            "closingIssuesReferences": {
                                "nodes": [{"url": second_url, "state": "OPEN"}],
                                "pageInfo": {"hasNextPage": False, "endCursor": None},
                            }
                        }
                    }
                }
            },
        ]

        with (
            patch.object(MODULE, "gh_json", side_effect=pages) as gh_json,
            patch.object(sync, "set_select") as set_select,
        ):
            sync.sync_linked_issues_for_pull_request(244)

        self.assertEqual(gh_json.call_count, 2)
        first_query = next(
            argument
            for argument in gh_json.call_args_list[0].args
            if argument.startswith("query=")
        )
        self.assertIn(
            "closingIssuesReferences("
            "first: 100, after: $after, excludeUserLinked: false)",
            first_query,
        )
        self.assertNotIn("after=cursor-1", gh_json.call_args_list[0].args)
        self.assertIn("after=cursor-1", gh_json.call_args_list[1].args)
        self.assertEqual(
            set_select.call_args_list,
            [
                call("first-issue-item", "Status", "In Progress"),
                call("second-issue-item", "Status", "In Progress"),
            ],
        )

    def test_linked_issue_absent_from_project_is_not_added(self):
        sync = self.make_sync()
        missing_url = "https://github.com/ifpebj-ti/lab-solos/issues/999"
        response = {
            "data": {
                "repository": {
                    "pullRequest": {
                        "closingIssuesReferences": {
                            "nodes": [{"url": missing_url, "state": "OPEN"}],
                            "pageInfo": {"hasNextPage": False, "endCursor": None},
                        }
                    }
                }
            }
        }

        with (
            patch.object(MODULE, "gh_json", return_value=response),
            patch.object(sync, "ensure_item") as ensure_item,
            patch.object(sync, "set_select") as set_select,
        ):
            sync.sync_linked_issues_for_pull_request(244)

        ensure_item.assert_not_called()
        set_select.assert_not_called()

    def test_linked_issue_statuses_never_regress(self):
        sync = self.make_sync()
        protected_statuses = (
            "Backlog",
            "In Progress",
            "In Test",
            "Stabilize",
            "Blocked",
            "Done",
        )
        nodes = []
        for number, status in enumerate(protected_statuses, start=1):
            url = f"https://github.com/ifpebj-ti/lab-solos/issues/{number}"
            nodes.append({"url": url, "state": "OPEN"})
            sync.items[url] = {
                "id": f"item-{number}",
                "status": status,
                "content": {"type": "Issue", "url": url},
            }
        response = {
            "data": {
                "repository": {
                    "pullRequest": {
                        "closingIssuesReferences": {
                            "nodes": nodes,
                            "pageInfo": {"hasNextPage": False, "endCursor": None},
                        }
                    }
                }
            }
        }

        with (
            patch.object(MODULE, "gh_json", return_value=response),
            patch.object(sync, "set_select") as set_select,
        ):
            sync.sync_linked_issues_for_pull_request(244)

        set_select.assert_not_called()
        self.assertEqual(
            [item["status"] for item in sync.items.values()],
            list(protected_statuses),
        )

    def test_closed_linked_issue_and_backlog_item_are_preserved(self):
        sync = self.make_sync()
        closed_url = "https://github.com/ifpebj-ti/lab-solos/issues/201"
        backlog_url = "https://github.com/ifpebj-ti/lab-solos/issues/202"
        sync.items = {
            closed_url: {
                "id": "closed-item",
                "status": "Todo",
                "content": {"type": "Issue", "url": closed_url},
            },
            backlog_url: {
                "id": "backlog-item",
                "status": "Backlog",
                "content": {"type": "Issue", "url": backlog_url},
            },
        }
        response = {
            "data": {
                "repository": {
                    "pullRequest": {
                        "closingIssuesReferences": {
                            "nodes": [
                                {"url": closed_url, "state": "CLOSED"},
                                {"url": backlog_url, "state": "OPEN"},
                            ],
                            "pageInfo": {"hasNextPage": False, "endCursor": None},
                        }
                    }
                }
            }
        }

        with (
            patch.object(MODULE, "gh_json", return_value=response),
            patch.object(sync, "set_select") as set_select,
        ):
            sync.sync_linked_issues_for_pull_request(244)

        set_select.assert_not_called()
        self.assertEqual(sync.items[closed_url]["status"], "Todo")
        self.assertEqual(sync.items[backlog_url]["status"], "Backlog")

    def test_open_pull_request_lookup_uses_native_link_defaults(self):
        sync = self.make_sync()
        issue = {"number": 101, "repository": "ifpebj-ti/lab-solos"}
        response = {
            "data": {
                "repository": {
                    "issue": {
                        "closedByPullRequestsReferences": {
                            "nodes": [
                                {"url": "https://github.com/ifpebj-ti/lab-solos/pull/244"}
                            ]
                        }
                    }
                }
            }
        }

        with patch.object(MODULE, "gh_json", return_value=response) as gh_json:
            linked = sync.issue_has_open_pull_request(issue)

        self.assertTrue(linked)
        query = next(
            argument for argument in gh_json.call_args.args if argument.startswith("query=")
        )
        self.assertIn(
            "closedByPullRequestsReferences("
            "first: 1, includeClosedPrs: false, excludeUserLinked: false)",
            query,
        )

    def test_periodic_reconciliation_checks_only_issue_items_in_todo_or_empty_status(self):
        sync = self.make_sync()
        blank_issue = {
            "id": "blank-item",
            "status": "",
            "content": {"type": "Issue", "number": 101},
        }
        todo_issue = {
            "id": "todo-item",
            "status": "Todo",
            "content": {"type": "Issue", "number": 102},
        }
        sync.project_items = [
            blank_issue,
            todo_issue,
            {
                "id": "progress-item",
                "status": "In Progress",
                "content": {"type": "Issue", "number": 103},
            },
            {
                "id": "pr-item",
                "status": "Todo",
                "content": {"type": "PullRequest", "number": 244},
            },
        ]

        with (
            patch.object(
                sync, "issue_has_open_pull_request", side_effect=[True, False]
            ) as has_open_pull_request,
            patch.object(sync, "set_select") as set_select,
        ):
            sync.reconcile_linked_issue_statuses()

        self.assertEqual(
            has_open_pull_request.call_args_list,
            [call(blank_issue["content"]), call(todo_issue["content"])],
        )
        set_select.assert_called_once_with("blank-item", "Status", "In Progress")

    def test_main_reconciles_links_only_for_schedule_and_manual_runs(self):
        for event_name, expected_reconciliations, expected_full_syncs in (
            ("schedule", 1, 1),
            ("workflow_dispatch", 1, 1),
            ("issues", 0, 0),
            ("pull_request", 0, 0),
        ):
            with self.subTest(event_name=event_name):
                sync = MagicMock()
                with (
                    patch.dict(
                        os.environ,
                        {
                            "PROJECT_OWNER": "ifpebj-ti",
                            "PROJECT_NUMBER": "41",
                            "PROJECT_REPOSITORY": "ifpebj-ti/lab-solos",
                            "GITHUB_EVENT_NAME": event_name,
                        },
                        clear=True,
                    ),
                    patch("sys.argv", ["sync_github_project.py"]),
                    patch.object(MODULE, "ProjectSync", return_value=sync),
                ):
                    MODULE.main()

                self.assertEqual(
                    sync.reconcile_linked_issue_statuses.call_count,
                    expected_reconciliations,
                )
                self.assertEqual(sync.sync_open_items.call_count, expected_full_syncs)
                self.assertEqual(sync.refresh_items.call_count, expected_reconciliations)
                sync.sync_event.assert_called_once_with()


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.workflow = (SCRIPT.parents[1] / "workflows" / "project-metrics.yml").read_text(
            encoding="utf-8"
        )

    def test_workflow_subscribes_to_pull_requests_with_same_repository_guard(self):
        self.assertIn("  pull_request:", self.workflow)
        self.assertIn("edited", self.workflow)
        self.assertIn("synchronize", self.workflow)
        self.assertNotIn("pull_request_target:", self.workflow)
        self.assertIn("pull-requests: read", self.workflow)
        self.assertIn(
            "github.event.pull_request.head.repo.full_name == github.repository",
            self.workflow,
        )

    def test_workflow_uses_trusted_checkout_and_current_workflow_names(self):
        for workflow_name in (
            "Container CI",
            "Container Release",
            "Dependency security gate",
            "Publicar PRDs na Wiki",
            "CodeQL",
        ):
            self.assertIn(f"- {workflow_name}", self.workflow)
        self.assertNotIn("CI/CD Workflow - Backend", self.workflow)
        self.assertNotIn("CI/CD Workflow - Frontend", self.workflow)
        self.assertIn("ref: develop", self.workflow)
        self.assertIn("persist-credentials: false", self.workflow)

    def test_readme_points_to_organization_project_41(self):
        readme = (SCRIPT.parents[2] / "README.md").read_text(encoding="utf-8")

        self.assertIn("https://github.com/orgs/ifpebj-ti/projects/41/views/1", readme)
        self.assertNotIn("https://github.com/users/nathannmvr/projects/4", readme)


if __name__ == "__main__":
    unittest.main()
