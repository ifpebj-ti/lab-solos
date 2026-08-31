import importlib.util
import io
import json
import subprocess
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import Mock, patch


SCRIPT = Path(__file__).parents[1] / "migrate_github_projects.py"
SPEC = importlib.util.spec_from_file_location("migrate_github_projects", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(MODULE)


def option(name, identifier=None, color="GRAY", description=""):
    return {
        "id": identifier or f"opt-{MODULE.normalized_words(name).replace(' ', '-')}",
        "name": name,
        "color": color,
        "description": description,
    }


def select_field(name, names, *, identifier=None, decorated=False):
    options = []
    for index, name_value in enumerate(names):
        visible_name = f"✅ {name_value}" if decorated else name_value
        options.append(option(visible_name, f"{identifier or name}-option-{index}"))
    return {
        "__typename": "ProjectV2SingleSelectField",
        "id": identifier or f"field-{name}",
        "name": name,
        "dataType": "SINGLE_SELECT",
        "options": options,
    }


def scalar_field(name, data_type, *, identifier=None):
    return {
        "__typename": "ProjectV2Field",
        "id": identifier or f"field-{name}",
        "name": name,
        "dataType": data_type,
    }


def p4_fields():
    fields = [
        select_field(
            "Status",
            ("Todo", "In Progress", "In Test", "Stabilize", "Done"),
            identifier="p4-status",
        )
    ]
    for name, spec in MODULE.CANONICAL_FIELDS.items():
        if spec["dataType"] == "SINGLE_SELECT":
            fields.append(select_field(name, spec["options"], identifier=f"p4-{name}"))
        else:
            fields.append(scalar_field(name, spec["dataType"], identifier=f"p4-{name}"))
    return fields


def p17_fields():
    return [
        select_field(
            "Status",
            ("Backlog", "To do", "In Progress", "Impeditive", "Done"),
            identifier="p17-status",
        ),
        select_field("Priority", ("High", "Medium", "Low"), identifier="p17-priority"),
    ]


def canonical_target_fields(*, emoji_status=False, include_canonical=True):
    status_names = list(MODULE.STATUS_NAMES)
    status = select_field("Status", status_names, identifier="target-status")
    status["options"] = []
    icons = ["📥", "📝", "🚧", "🧪", "🛡️", "⛔", "✅"]
    for index, name in enumerate(status_names):
        visible = f"{icons[index]} {name}" if emoji_status else name
        spec = MODULE.STATUS_SPECS[name]
        status["options"].append(
            option(
                visible,
                f"target-status-{index}",
                spec["color"],
                spec["description"],
            )
        )
    fields = [
        status,
        select_field("Priority", ("High", "Medium", "Low"), identifier="target-priority"),
        scalar_field("Sprint", "NUMBER", identifier="target-sprint"),
        {
            "__typename": "ProjectV2MultiSelectField",
            "id": "target-tags",
            "name": "Tags",
            "dataType": "MULTI_SELECT",
            "multiSelectOptions": [],
        },
    ]
    if include_canonical:
        source_by_name = {field["name"]: field for field in p4_fields()}
        for name, spec in MODULE.CANONICAL_FIELDS.items():
            source = source_by_name[name]
            if spec["dataType"] == "SINGLE_SELECT":
                copied = select_field(name, (), identifier=f"target-{name}")
                copied["options"] = [
                    option(
                        source_option["name"],
                        f"target-{name}-{index}",
                        source_option["color"],
                        source_option["description"],
                    )
                    for index, source_option in enumerate(source["options"])
                ]
                fields.append(copied)
            else:
                fields.append(scalar_field(name, spec["dataType"], identifier=f"target-{name}"))
    return fields


def issue_item(identifier, number, **values):
    item = {
        "id": identifier,
        "content": {
            "type": "Issue",
            "url": f"https://github.com/ifpebj-ti/lab-solos/issues/{number}",
            "title": values.pop("title", f"Issue {number}"),
            "body": values.pop("body", ""),
        },
    }
    item.update(values)
    return item


def draft_item(identifier, title, body="", **values):
    content_id = values.pop("content_id", None)
    item = {
        "id": identifier,
        "content": {"type": "DraftIssue", "title": title, "body": body},
    }
    if content_id:
        item["content"]["id"] = content_id
    item.update(values)
    return item


def snapshot(ref, fields, items):
    return {
        "ref": ref,
        "project": {"id": f"project-{ref[0]}-{ref[1]}"},
        "fields": fields,
        "items": items,
    }


def classifier(_title, _labels):
    return {
        "Tipo": "Bug",
        "Área": "Frontend",
        "Prioridade": "P2 Média",
        "Severidade": "N/A",
        "PRD": "PRD classificado",
    }


def snapshots(p4_items=None, p17_items=None, target_items=None, target_fields=None):
    return {
        MODULE.SOURCE_P4: snapshot(MODULE.SOURCE_P4, p4_fields(), p4_items or []),
        MODULE.SOURCE_P17: snapshot(MODULE.SOURCE_P17, p17_fields(), p17_items or []),
        MODULE.TARGET_P41: snapshot(
            MODULE.TARGET_P41,
            target_fields or canonical_target_fields(),
            target_items or [],
        ),
    }


class GhClientTests(unittest.TestCase):
    def test_subprocess_uses_utf8_and_stdin_for_graphql(self):
        completed = subprocess.CompletedProcess(
            ["gh"], 0, stdout='{"data":{"ok":true}}', stderr=""
        )
        with patch.object(MODULE.subprocess, "run", return_value=completed) as run:
            result = MODULE.GhClient().graphql("query Test { viewer { login } }", {"área": "CI/CD"})

        self.assertEqual(result["data"], {"ok": True})
        kwargs = run.call_args.kwargs
        self.assertEqual(kwargs["encoding"], "utf-8")
        self.assertTrue(kwargs["text"])
        self.assertEqual(json.loads(kwargs["input"])["variables"]["área"], "CI/CD")

    def test_nonzero_gh_exit_is_reported(self):
        completed = subprocess.CompletedProcess(["gh"], 1, stdout="", stderr="denied")
        with patch.object(MODULE.subprocess, "run", return_value=completed):
            with self.assertRaisesRegex(RuntimeError, "denied"):
                MODULE.GhClient().run("project", "view", "41")


class ItemFieldValueTests(unittest.TestCase):
    def test_area_accepts_only_observed_gh_replacement_character_alias(self):
        self.assertEqual(
            MODULE.item_field_value({"\ufffd\ufffdrea": "Produto"}, "Área"),
            "Produto",
        )
        self.assertIsNone(MODULE.item_field_value({"rea": "Produto"}, "Área"))
        self.assertIsNone(MODULE.item_field_value({"\ufffdipo": "Bug"}, "Tipo"))


class ItemListConsistencyTests(unittest.TestCase):
    def make_migrator(self, gh, sleep):
        return MODULE.ProjectMigrator(
            gh,
            classifier=classifier,
            sleep=sleep,
            consistency_delays=(0.01, 0.02),
        )

    def draft_details(self):
        return {
            "PVTI_new": {
                "id": "DI_new",
                "title": "Draft novo",
                "body": "",
                "assignees": {"nodes": []},
            }
        }

    def cli_draft(self):
        return {
            "id": "PVTI_new",
            "content": {"type": "DraftIssue", "title": "Draft novo", "body": ""},
        }

    def test_missing_draft_recovers_by_retrying_only_item_list(self):
        gh = Mock()
        gh.json.side_effect = [
            {"id": "project-id"},
            {"items": [], "totalCount": 0},
            {"items": [self.cli_draft()], "totalCount": 1},
        ]
        sleep = Mock()
        migrator = self.make_migrator(gh, sleep)

        with (
            patch.object(migrator, "load_fields", return_value=[]),
            patch.object(
                migrator, "load_draft_details", return_value=self.draft_details()
            ) as load_details,
        ):
            result = migrator.load_snapshot(MODULE.TARGET_P41)

        self.assertEqual(result["items"][0]["content"]["id"], "DI_new")
        sleep.assert_called_once_with(0.01)
        load_details.assert_called_once_with("project-id")
        self.assertEqual(gh.json.call_count, 3)

    def test_missing_draft_fails_after_bounded_retries(self):
        gh = Mock()
        gh.json.side_effect = [
            {"id": "project-id"},
            {"items": [], "totalCount": 0},
            {"items": [], "totalCount": 0},
            {"items": [], "totalCount": 0},
        ]
        sleep = Mock()
        migrator = self.make_migrator(gh, sleep)

        with (
            patch.object(migrator, "load_fields", return_value=[]),
            patch.object(
                migrator, "load_draft_details", return_value=self.draft_details()
            ) as load_details,
        ):
            with self.assertRaisesRegex(MODULE.ContractError, "PVTI_new"):
                migrator.load_snapshot(MODULE.TARGET_P41)

        self.assertEqual([call.args[0] for call in sleep.call_args_list], [0.01, 0.02])
        load_details.assert_called_once_with("project-id")
        self.assertEqual(gh.json.call_count, 4)

    def test_general_item_list_error_is_not_retried(self):
        gh = Mock()
        gh.json.side_effect = [
            {"id": "project-id"},
            RuntimeError("rate limit exceeded"),
        ]
        sleep = Mock()
        migrator = self.make_migrator(gh, sleep)

        with (
            patch.object(migrator, "load_fields", return_value=[]),
            patch.object(migrator, "load_draft_details") as load_details,
        ):
            with self.assertRaisesRegex(RuntimeError, "rate limit exceeded"):
                migrator.load_snapshot(MODULE.TARGET_P41)

        sleep.assert_not_called()
        load_details.assert_not_called()
        self.assertEqual(gh.json.call_count, 2)


class MappingTests(unittest.TestCase):
    def test_status_mappings_cover_sources_and_emoji_target(self):
        self.assertEqual(MODULE.canonical_status("Todo", "p4"), "Todo")
        self.assertEqual(MODULE.canonical_status("To do", "p17"), "Todo")
        self.assertEqual(MODULE.canonical_status("Impeditive", "p17"), "Blocked")
        self.assertEqual(MODULE.canonical_status("🏷️ To Do", "target"), "Todo")
        self.assertEqual(MODULE.canonical_status("✅ Done", "target"), "Done")

    def test_priority_and_sprint_mappings(self):
        self.assertEqual(MODULE.canonical_priority("🔥 High"), ("High", "P1 Alta"))
        self.assertEqual(
            MODULE.sprint_number(issue_item("p17", 1, milestone="Sprint 07")),
            7,
        )

    def test_unknown_status_and_malformed_sprint_fail(self):
        with self.assertRaises(MODULE.ContractError):
            MODULE.canonical_status("Waiting for a miracle", "p17")
        with self.assertRaises(MODULE.ContractError):
            MODULE.sprint_number(issue_item("p17", 1, milestone="Sprint next"))


class PlanningTests(unittest.TestCase):
    def make_migrator(self):
        return MODULE.ProjectMigrator(Mock(), classifier=classifier)

    def test_plan_creates_canonical_fields_and_preserves_status_option_ids(self):
        target_fields = canonical_target_fields(emoji_status=True, include_canonical=False)
        status_field = next(field for field in target_fields if field["name"] == "Status")
        status_field["options"] = [
            option("📥 Backlog", "existing-backlog"),
            option("🏷️ To Do", "existing-todo"),
            option("🚧 In Progress", "existing-progress"),
            option("⛔ Impeditive", "existing-blocked"),
            option("✅ Done", "existing-done"),
        ]
        plan = self.make_migrator().build_plan(snapshots(target_fields=target_fields))

        self.assertEqual(
            {operation["field"]["name"] for operation in plan.of_kind("create_field")},
            set(MODULE.CANONICAL_FIELDS),
        )
        status_update = next(
            operation
            for operation in plan.of_kind("update_select_options")
            if operation["field_name"] == "Status"
        )
        self.assertEqual(
            [option_value["name"] for option_value in status_update["options"]],
            list(MODULE.STATUS_NAMES),
        )
        by_name = {option_value["name"]: option_value for option_value in status_update["options"]}
        self.assertEqual(by_name["Backlog"]["id"], "existing-backlog")
        self.assertEqual(by_name["Todo"]["id"], "existing-todo")
        self.assertEqual(by_name["In Progress"]["id"], "existing-progress")
        self.assertEqual(by_name["Blocked"]["id"], "existing-blocked")
        self.assertEqual(by_name["Done"]["id"], "existing-done")
        self.assertNotIn("id", by_name["In Test"])
        self.assertNotIn("id", by_name["Stabilize"])
        self.assertFalse(
            any(
                operation["kind"].startswith(("delete", "remove", "archive"))
                for operation in plan.operations
            )
        )

    def test_url_is_deduplicated_and_p4_values_take_precedence(self):
        p4_item = issue_item(
            "p4-item",
            10,
            status="Todo",
            tipo="Segurança",
            área="Backend",
            prioridade="P0 Crítica",
            severidade="Alta",
            esforço=5,
            pRD="Autenticação",
        )
        p17_item = issue_item(
            "p17-item",
            10,
            status="Done",
            priority="Low",
            milestone="Sprint 03",
        )

        plan = self.make_migrator().build_plan(
            snapshots(p4_items=[p4_item], p17_items=[p17_item])
        )

        self.assertEqual(len(plan.of_kind("add_item")), 1)
        writes = {
            operation["field_name"]: operation["value"]
            for operation in plan.of_kind("set_field")
        }
        self.assertEqual(writes["Status"], "Todo")
        self.assertEqual(writes["Tipo"], "Segurança")
        self.assertEqual(writes["Prioridade"], "P0 Crítica")
        self.assertEqual(writes["Priority"], "Low")
        self.assertEqual(writes["Sprint"], 3)
        self.assertEqual(writes["Esforço"], 5)
        self.assertEqual(writes["PRD"], "Autenticação")

    def test_p17_draft_is_recreated_with_priority_status_and_sprint(self):
        source = draft_item(
            "source-draft",
            "Preparar release",
            "Detalhes",
            status="Impeditive",
            priority="High",
            milestone="Sprint 12",
            assignees=["jessica-leoa"],
        )
        plan = self.make_migrator().build_plan(snapshots(p17_items=[source]))

        self.assertEqual(len(plan.of_kind("create_draft")), 1)
        assignee_operation = plan.of_kind("set_draft_assignees")[0]
        self.assertEqual(assignee_operation["assignee_logins"], ["jessica-leoa"])
        writes = {
            operation["field_name"]: operation["value"]
            for operation in plan.of_kind("set_field")
        }
        self.assertEqual(writes["Status"], "Blocked")
        self.assertEqual(writes["Priority"], "High")
        self.assertEqual(writes["Prioridade"], "P1 Alta")
        self.assertEqual(writes["Sprint"], 12)

    def test_empty_source_and_target_draft_assignees_need_no_mutation(self):
        source = draft_item("source", "Sem responsável")
        target = draft_item("target", "Sem responsável", content_id="DI_target")
        plan = self.make_migrator().build_plan(
            snapshots(p17_items=[source], target_items=[target])
        )
        self.assertEqual(plan.of_kind("set_draft_assignees"), [])

    def test_existing_target_draft_assignees_are_preserved_on_rerun(self):
        source = draft_item("source", "Limpar responsável")
        target = draft_item(
            "target",
            "Limpar responsável",
            content_id="DI_target",
            assignees=["jessica-leoa"],
        )
        plan = self.make_migrator().build_plan(
            snapshots(p17_items=[source], target_items=[target])
        )
        self.assertEqual(plan.of_kind("set_draft_assignees"), [])

    def test_manual_target_draft_assignee_is_not_reverted_to_source(self):
        source = draft_item(
            "source",
            "Preservar responsável manual",
            assignees=["jessica-leoa"],
        )
        target = draft_item(
            "target",
            "Preservar responsável manual",
            content_id="DI_target",
            assignees=["outro-login"],
        )
        plan = self.make_migrator().build_plan(
            snapshots(p17_items=[source], target_items=[target])
        )
        self.assertEqual(plan.of_kind("set_draft_assignees"), [])

    def test_existing_target_tags_and_sprint_are_never_overwritten(self):
        source = issue_item(
            "source",
            20,
            status="To do",
            priority="Medium",
            milestone="Sprint 12",
        )
        target = issue_item(
            "target",
            20,
            status="Todo",
            priority="Medium",
            sprint=9,
            tags=["preservar"],
            tipo="Bug",
            área="Frontend",
            prioridade="P2 Média",
            severidade="N/A",
            pRD="PRD classificado",
        )
        plan = self.make_migrator().build_plan(
            snapshots(p17_items=[source], target_items=[target])
        )

        fields_written = {
            operation["field_name"] for operation in plan.of_kind("set_field")
        }
        self.assertNotIn("Sprint", fields_written)
        self.assertNotIn("Tags", fields_written)
        self.assertEqual(plan.of_kind("add_item"), [])

    def test_rerun_never_reverts_nonempty_manual_target_values(self):
        source = issue_item(
            "source",
            25,
            status="Todo",
            tipo="Bug",
            área="Frontend",
            prioridade="P2 Média",
            severidade="N/A",
            esforço=3,
            pRD="PRD antigo",
        )
        target = issue_item(
            "target",
            25,
            status="In Progress",
            tipo="Feature",
            área="Backend",
            prioridade="P1 Alta",
            severidade="Alta",
            esforço=8,
            pRD="PRD ajustado manualmente",
        )

        plan = self.make_migrator().build_plan(
            snapshots(p4_items=[source], target_items=[target])
        )

        self.assertEqual(plan.of_kind("set_field"), [])

    def test_missing_canonical_values_use_sync_classifier_contract(self):
        target = issue_item("target", 30, status="Backlog")
        plan = self.make_migrator().build_plan(snapshots(target_items=[target]))
        writes = {
            operation["field_name"]: operation["value"]
            for operation in plan.of_kind("set_field")
        }
        self.assertEqual(writes["Tipo"], "Bug")
        self.assertEqual(writes["Área"], "Frontend")
        self.assertEqual(writes["PRD"], "PRD classificado")

    def test_invalid_contract_fails_while_no_mutation_method_is_called(self):
        source = issue_item("source", 40, status="Unknown", priority="High")
        gh = Mock()
        migrator = MODULE.ProjectMigrator(gh, classifier=classifier)

        with self.assertRaisesRegex(MODULE.ContractError, "Status desconhecido"):
            migrator.build_plan(snapshots(p17_items=[source]))

        gh.run.assert_not_called()
        gh.graphql.assert_not_called()

    def test_converged_snapshot_produces_empty_plan(self):
        source = issue_item(
            "source",
            50,
            status="Todo",
            tipo="Bug",
            área="Frontend",
            prioridade="P2 Média",
            severidade="N/A",
            pRD="PRD classificado",
        )
        target = issue_item(
            "target",
            50,
            status="Todo",
            tipo="Bug",
            área="Frontend",
            prioridade="P2 Média",
            severidade="N/A",
            pRD="PRD classificado",
        )
        plan = self.make_migrator().build_plan(
            snapshots(p4_items=[source], target_items=[target])
        )
        self.assertEqual(plan.operations, [])

    def test_second_plan_is_empty_after_first_run_state_is_present(self):
        source = issue_item(
            "source",
            51,
            status="Todo",
            tipo="Bug",
            área="Frontend",
            prioridade="P2 Média",
            severidade="N/A",
            pRD="PRD classificado",
        )
        first_plan = self.make_migrator().build_plan(snapshots(p4_items=[source]))
        self.assertTrue(first_plan.of_kind("add_item"))
        self.assertTrue(first_plan.of_kind("set_field"))

        migrated = issue_item(
            "target",
            51,
            status="Todo",
            tipo="Bug",
            área="Frontend",
            prioridade="P2 Média",
            severidade="N/A",
            pRD="PRD classificado",
        )
        second_plan = self.make_migrator().build_plan(
            snapshots(p4_items=[source], target_items=[migrated])
        )
        self.assertEqual(second_plan.operations, [])


class ApplyAndCliTests(unittest.TestCase):
    def test_create_field_uses_gh_project_field_create(self):
        gh = Mock()
        migrator = MODULE.ProjectMigrator(gh, classifier=classifier)
        migrator.create_field(
            {
                "name": "Tipo",
                "dataType": "SINGLE_SELECT",
                "options": [{"name": "Feature"}, {"name": "Bug"}],
            }
        )
        args = gh.run.call_args.args
        self.assertEqual(args[:3], ("project", "field-create", "41"))
        self.assertIn("Feature,Bug", args)

    def test_resolve_user_ids_uses_typed_graphql_variables(self):
        gh = Mock()
        gh.graphql.return_value = {
            "data": {"user": {"id": "U_jessica", "login": "jessica-leoa"}}
        }
        migrator = MODULE.ProjectMigrator(gh, classifier=classifier)

        result = migrator.resolve_user_ids(["jessica-leoa"])

        self.assertEqual(result, {"jessica-leoa": "U_jessica"})
        gh.graphql.assert_called_once_with(
            MODULE.RESOLVE_USER_QUERY, {"login": "jessica-leoa"}
        )

    def test_apply_uses_draft_content_id_and_exact_resolved_assignees(self):
        gh = Mock()
        migrator = MODULE.ProjectMigrator(gh, classifier=classifier)
        signature = ("Guia de Segurança", "")
        locator = MODULE.draft_locator(signature, 0)
        plan = MODULE.MigrationPlan(
            [
                {
                    "kind": "set_draft_assignees",
                    "locator": locator,
                    "assignee_logins": ["jessica-leoa"],
                    "description": "Definir responsável",
                }
            ]
        )
        target = snapshot(
            MODULE.TARGET_P41,
            canonical_target_fields(),
            [
                draft_item(
                    "target-draft",
                    signature[0],
                    signature[1],
                    content_id="DI_target",
                )
            ],
        )

        with (
            patch.object(migrator, "load_snapshot", return_value=target),
            patch.object(
                migrator,
                "resolve_user_ids",
                return_value={"jessica-leoa": "U_jessica"},
            ) as resolve,
            patch.object(migrator, "update_draft_assignees") as update,
        ):
            result = migrator.apply(plan)

        resolve.assert_called_once_with(["jessica-leoa"])
        update.assert_called_once_with("DI_target", ["U_jessica"])
        self.assertEqual(result["executed_set_draft_assignees"], 1)
        self.assertFalse(any("item-edit" in str(call) for call in gh.run.call_args_list))

    def test_apply_preserves_assignee_added_after_plan_was_built(self):
        gh = Mock()
        migrator = MODULE.ProjectMigrator(gh, classifier=classifier)
        signature = ("Guia de Infraestrutura", "")
        plan = MODULE.MigrationPlan(
            [
                {
                    "kind": "set_draft_assignees",
                    "locator": MODULE.draft_locator(signature, 0),
                    "assignee_logins": ["jessica-leoa"],
                    "description": "Preencher responsável",
                }
            ]
        )
        target = snapshot(
            MODULE.TARGET_P41,
            canonical_target_fields(),
            [
                draft_item(
                    "target-draft",
                    signature[0],
                    content_id="DI_target",
                    assignees=["outro-login"],
                )
            ],
        )

        with (
            patch.object(migrator, "load_snapshot", return_value=target),
            patch.object(
                migrator,
                "resolve_user_ids",
                return_value={"jessica-leoa": "U_jessica"},
            ),
            patch.object(migrator, "update_draft_assignees") as update,
        ):
            result = migrator.apply(plan)

        update.assert_not_called()
        self.assertEqual(result["skipped_set_draft_assignees"], 1)

    def test_first_apply_normalizes_new_select_metadata_with_new_ids(self):
        gh = Mock()
        migrator = MODULE.ProjectMigrator(gh, classifier=classifier)
        initial = snapshots(
            target_fields=canonical_target_fields(include_canonical=False)
        )
        plan = migrator.build_plan(initial)
        reloaded_fields = canonical_target_fields()
        for field in reloaded_fields:
            if field["name"] in {"Tipo", "Área", "Prioridade", "Severidade"}:
                for field_option in field["options"]:
                    field_option["color"] = "BLUE"
                    field_option["description"] = "default generated metadata"
        reloaded = snapshot(MODULE.TARGET_P41, reloaded_fields, [])

        with (
            patch.object(migrator, "create_field") as create_field,
            patch.object(migrator, "load_snapshot", return_value=reloaded),
            patch.object(migrator, "update_select_options") as update_options,
        ):
            result = migrator.apply(plan)

        self.assertEqual(create_field.call_count, 6)
        self.assertEqual(update_options.call_count, 4)
        for call in update_options.call_args_list:
            payload = call.args[1]
            self.assertTrue(all(field_option.get("id") for field_option in payload))
            self.assertTrue(all(field_option["color"] == "GRAY" for field_option in payload))
            self.assertTrue(all(field_option["description"] == "" for field_option in payload))
        self.assertEqual(result["executed_update_select_options"], 4)

    def test_default_cli_mode_is_dry_run(self):
        self.assertFalse(MODULE.parse_args([]).apply)
        self.assertTrue(MODULE.parse_args(["--apply"]).apply)

    def test_rendered_dry_run_reports_no_mutation(self):
        plan = MODULE.MigrationPlan(
            [{"kind": "add_item", "description": "Adicionar item", "url": "https://example"}]
        )
        output = io.StringIO()
        with redirect_stdout(output):
            MODULE.render_plan(plan, apply=False)
        self.assertIn("DRY-RUN", output.getvalue())
        self.assertIn("Nenhuma mutação foi executada", output.getvalue())


class FieldBatchTests(unittest.TestCase):
    def make_write(self, index):
        return {
            "itemId": f"item-{index}",
            "fieldId": f"field-{index}",
            "value": {"text": f"value-{index}"},
        }

    def test_twenty_one_writes_use_two_graphql_calls(self):
        gh = Mock()
        gh.graphql.return_value = {"data": {}}
        migrator = MODULE.ProjectMigrator(gh, classifier=classifier)

        completed = migrator.execute_field_update_batches(
            "project-id", [self.make_write(index) for index in range(21)]
        )

        self.assertEqual(completed, 21)
        self.assertEqual(gh.graphql.call_count, 2)
        first_query, first_variables = gh.graphql.call_args_list[0].args
        second_query, second_variables = gh.graphql.call_args_list[1].args
        self.assertIn("update19: updateProjectV2ItemFieldValue", first_query)
        self.assertNotIn("update20:", first_query)
        self.assertIn("value19", first_variables)
        self.assertNotIn("value20", first_variables)
        self.assertIn("update0: updateProjectV2ItemFieldValue", second_query)
        self.assertNotIn("update1:", second_query)
        self.assertEqual(second_variables["itemId0"], "item-20")

    def test_batch_payload_supports_select_text_and_number_values(self):
        gh = Mock()
        gh.graphql.return_value = {"data": {}}
        migrator = MODULE.ProjectMigrator(gh, classifier=classifier)
        target = snapshot(MODULE.TARGET_P41, canonical_target_fields(), [])
        item = {"id": "item-id", "content": {"type": "DraftIssue", "title": "Draft"}}
        writes = [
            migrator.prepare_field_update(target, item, "Status", "Done"),
            migrator.prepare_field_update(target, item, "PRD", "Documento"),
            migrator.prepare_field_update(target, item, "Esforço", 3),
        ]

        migrator.execute_field_update_batches("project-id", writes)

        query, variables = gh.graphql.call_args.args
        self.assertIn("$value0: ProjectV2FieldValue!", query)
        self.assertIn("$value1: ProjectV2FieldValue!", query)
        self.assertIn("$value2: ProjectV2FieldValue!", query)
        self.assertEqual(
            variables["value0"], {"singleSelectOptionId": "target-status-6"}
        )
        self.assertEqual(variables["value1"], {"text": "Documento"})
        self.assertEqual(variables["value2"], {"number": 3.0})

    def test_graphql_error_stops_remaining_batches(self):
        gh = Mock()
        gh.graphql.side_effect = [
            {"data": {}},
            {"data": None, "errors": [{"message": "secondary rate limit"}]},
            {"data": {}},
        ]
        migrator = MODULE.ProjectMigrator(gh, classifier=classifier)

        with self.assertRaisesRegex(RuntimeError, "secondary rate limit"):
            migrator.execute_field_update_batches(
                "project-id", [self.make_write(index) for index in range(41)]
            )

        self.assertEqual(gh.graphql.call_count, 2)


if __name__ == "__main__":
    unittest.main()
