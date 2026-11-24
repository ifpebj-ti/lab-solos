"""Contracts for the isolated passive ZAP result collector."""

from pathlib import Path
import sys
import tempfile
import unittest
from datetime import datetime, timezone
import json


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from check_zap_passive import (
    PassiveAnalysisError,
    collect_har_entries,
    evaluate_policy,
    failure_report,
    load_exceptions,
    _read_capture_files,
    _summarize_capture_status,
    _load_policy,
    sanitize_report,
    summarize_queue_progress,
)


ORIGIN = "https://localhost:18443"


def har_entry(url: str, status: int = 200) -> dict:
    return {
        "request": {"method": "GET", "url": url, "headers": []},
        "response": {
            "status": status,
            "headers": [{"name": "Content-Type", "value": "text/html"}],
            "content": {"mimeType": "text/html", "text": "<html>synthetic</html>"},
        },
    }


def har(*entries: dict) -> dict:
    return {"log": {"version": "1.2", "entries": list(entries)}}


class ZapPassiveCaptureTests(unittest.TestCase):
    def test_passive_policy_sets_a_bounded_120_second_processing_deadline(self) -> None:
        policy_path = Path(__file__).resolve().parents[2] / "quality/zap/passive-policy.json"
        policy = _load_policy(policy_path)

        self.assertEqual(policy["limits"]["processing_seconds"], 120)

    def test_report_allowlist_names_each_cache_diagnostic_counter(self) -> None:
        policy_path = Path(__file__).resolve().parents[2] / "quality/zap/passive-policy.json"
        policy = _load_policy(policy_path)

        self.assertEqual(
            policy["report_fields"],
            [
                "schema_version",
                "status",
                "messages",
                "messages.body_unavailable",
                "messages.cache_skipped",
                "messages.body_unavailable_cache_skipped",
                "messages.cache_evidence_ambiguous",
                "messages.wire_304_responses",
                "messages.wire_304_ambiguous",
                "processing_seconds",
                "alerts",
                "reason",
                "rule_id",
                "risk",
                "confidence",
                "count",
                "alert_status",
                "exception_id",
            ],
        )

    def test_queue_progress_summary_contains_only_bounded_counts(self) -> None:
        self.assertEqual(
            summarize_queue_progress([231, 180, 73, 17]),
            {
                "pending_start": 231,
                "pending_min": 17,
                "pending_end": 17,
                "decreases": 3,
                "samples": 4,
            },
        )
        self.assertEqual(
            summarize_queue_progress([]),
            {
                "pending_start": None,
                "pending_min": None,
                "pending_end": None,
                "decreases": 0,
                "samples": 0,
            },
        )

    def test_collects_browser_and_api_contexts_for_exact_origin(self) -> None:
        entries, counts = collect_har_entries(
            {
                "browser": [har(har_entry(f"{ORIGIN}/"), har_entry(f"{ORIGIN}/api/Usuarios", 401))],
                "api_request_context": [har(har_entry(f"{ORIGIN}/api/Auth/session", 200))],
            },
            expected_origin=ORIGIN,
        )

        self.assertEqual(len(entries), 3)
        self.assertEqual(
            counts,
            {
                "browser": 2,
                "api_request_context": 1,
                "frontend_routes": 1,
                "api_routes": 2,
            },
        )

    def test_rejects_any_wrong_origin_instead_of_silently_scanning_it(self) -> None:
        wrong_origins = (
            "http://localhost:18443/",
            "https://localhost:18444/",
            "https://127.0.0.1:18443/",
            "https://example.invalid/",
            "https://user:password@localhost:18443/",
        )
        for url in wrong_origins:
            with self.subTest(url=url), self.assertRaises(PassiveAnalysisError):
                collect_har_entries(
                    {"browser": [har(har_entry(url))], "api_request_context": [har(har_entry(f"{ORIGIN}/api/Usuarios"))]},
                    expected_origin=ORIGIN,
                )

    def test_requires_messages_from_both_existing_contexts(self) -> None:
        for captures in (
            {"browser": [], "api_request_context": [har(har_entry(f"{ORIGIN}/api/Usuarios"))]},
            {"browser": [har(har_entry(f"{ORIGIN}/"))], "api_request_context": []},
            {"browser": [], "api_request_context": []},
        ):
            with self.subTest(captures=captures), self.assertRaises(PassiveAnalysisError):
                collect_har_entries(captures, expected_origin=ORIGIN)

    def test_rejects_invalid_har_and_empty_messages(self) -> None:
        invalid = (
            {},
            {"log": {"version": "1.2", "entries": []}},
            {"log": {"version": "1.2", "entries": [{"request": {}, "response": {}}]}},
        )
        for value in invalid:
            with self.subTest(value=value), self.assertRaises(PassiveAnalysisError):
                collect_har_entries(
                    {"browser": [value], "api_request_context": [har(har_entry(f"{ORIGIN}/api/Usuarios"))]},
                    expected_origin=ORIGIN,
                )

    def test_blocks_only_high_risk_high_confidence_alerts(self) -> None:
        self.assertTrue(evaluate_policy([]).approved)
        self.assertTrue(
            evaluate_policy([{"pluginId": "10020", "risk": "Medium", "confidence": "High"}]).approved
        )
        self.assertTrue(
            evaluate_policy([{"pluginId": "10020", "risk": "High", "confidence": "Medium"}]).approved
        )
        self.assertFalse(
            evaluate_policy([{"pluginId": "10020", "risk": "High", "confidence": "High"}]).approved
        )

    def test_sanitized_report_uses_only_approved_fields(self) -> None:
        sentinel = "synthetic-secret-sentinel-7f9f6c"
        report = sanitize_report(
            alerts=[
                {
                    "pluginId": "10020",
                    "name": "Missing Anti-clickjacking Header",
                    "risk": "High",
                    "confidence": "High",
                    "url": f"{ORIGIN}/api/Usuarios?token={sentinel}",
                    "evidence": sentinel,
                    "param": sentinel,
                    "attack": sentinel,
                    "other": sentinel,
                }
            ],
            source_counts={
                "browser": 4,
                "api_request_context": 3,
                "frontend_routes": 2,
                "api_routes": 5,
                "body_unavailable": 0,
                "cache_skipped": 0,
                "body_unavailable_cache_skipped": 0,
                "cache_evidence_ambiguous": 0,
                "wire_304_responses": 2,
                "wire_304_ambiguous": 1,
            },
            duration_seconds=1.25,
            completed=True,
        )

        serialized = str(report)
        self.assertNotIn(sentinel, serialized)
        self.assertNotIn("url", report["alerts"][0])
        self.assertNotIn("evidence", report["alerts"][0])
        self.assertNotIn("param", report["alerts"][0])
        self.assertEqual(
            set(report["alerts"][0]),
            {"rule_id", "risk", "confidence", "alert_status", "count"},
        )
        self.assertEqual(report["alerts"][0]["alert_status"], "observed")
        self.assertEqual(report["status"], "policy_failed")
        self.assertEqual(report["messages"]["browser"], 4)
        self.assertEqual(report["messages"]["api_request_context"], 3)
        self.assertEqual(report["messages"]["body_unavailable"], 0)
        self.assertEqual(report["messages"]["cache_skipped"], 0)
        self.assertEqual(report["messages"]["body_unavailable_cache_skipped"], 0)
        self.assertEqual(report["messages"]["cache_evidence_ambiguous"], 0)
        self.assertEqual(report["messages"]["wire_304_responses"], 2)
        self.assertEqual(report["messages"]["wire_304_ambiguous"], 1)
        self.assertEqual(
            set(report),
            {"schema_version", "status", "messages", "processing_seconds", "alerts"},
        )
        self.assertEqual(
            set(report["messages"]),
            {
                "browser",
                "api_request_context",
                "frontend_routes",
                "api_routes",
                "body_unavailable",
                "cache_skipped",
                "body_unavailable_cache_skipped",
                "cache_evidence_ambiguous",
                "wire_304_responses",
                "wire_304_ambiguous",
            },
        )

    def test_body_unavailable_messages_are_scanned_but_report_inconclusive(self) -> None:
        report = sanitize_report(
            alerts=[],
            source_counts={
                "browser": 2,
                "api_request_context": 1,
                "frontend_routes": 2,
                "api_routes": 1,
                "body_unavailable": 1,
                "cache_skipped": 0,
                "body_unavailable_cache_skipped": 0,
                "cache_evidence_ambiguous": 0,
                "wire_304_responses": 0,
                "wire_304_ambiguous": 0,
            },
            duration_seconds=1.5,
            completed=True,
        )

        self.assertEqual(report["status"], "inconclusive")
        self.assertEqual(report["messages"]["body_unavailable"], 1)
        self.assertEqual(report["processing_seconds"], 1.5)

    def test_incomplete_processing_cannot_be_reported_as_a_policy_pass(self) -> None:
        with self.assertRaises(PassiveAnalysisError):
            sanitize_report(
                alerts=[],
                source_counts={
                    "browser": 1,
                    "api_request_context": 1,
                    "frontend_routes": 1,
                    "api_routes": 1,
                    "body_unavailable": 0,
                    "cache_skipped": 0,
                    "body_unavailable_cache_skipped": 0,
                    "cache_evidence_ambiguous": 0,
                    "wire_304_responses": 0,
                    "wire_304_ambiguous": 0,
                },
                duration_seconds=30,
                completed=False,
            )

    def test_incomplete_or_missing_capture_status_is_invalid(self) -> None:
        with tempfile.TemporaryDirectory() as root_text:
            root = Path(root_text)
            browser = root / "browser"
            api = root / "api-request-context"
            browser.mkdir()
            api.mkdir()
            (browser / "browser.status.json").write_text(
                '{"complete":false,"count":1,"observed":1,"cache_skipped":0,"body_unavailable":0,"body_unavailable_cache_skipped":0,"wire_304_responses":0,"wire_304_ambiguous":0,"cache_evidence_ambiguous":0,"failed_messages":0,"sentinel":"private"}',
                encoding="utf-8",
            )
            (api / "api.status.json").write_text(
                '{"complete":true,"count":0,"observed":0,"cache_skipped":0,"body_unavailable":0,"body_unavailable_cache_skipped":0,"wire_304_responses":0,"wire_304_ambiguous":0,"cache_evidence_ambiguous":0,"failed_messages":0}',
                encoding="utf-8",
            )
            with self.assertRaises(PassiveAnalysisError) as error:
                _read_capture_files(root)
            self.assertEqual(error.exception.reason, "capture_incomplete")

    def test_bodyless_download_is_counted_and_keeps_its_har_message(self) -> None:
        with tempfile.TemporaryDirectory() as root_text:
            root = Path(root_text)
            browser = root / "browser"
            api = root / "api-request-context"
            browser.mkdir()
            api.mkdir()
            (browser / "browser.status.json").write_text(
                '{"complete":true,"count":1,"observed":1,"cache_skipped":0,"body_unavailable":1,"body_unavailable_cache_skipped":0,"wire_304_responses":0,"wire_304_ambiguous":0,"cache_evidence_ambiguous":0,"failed_messages":0}',
                encoding="utf-8",
            )
            (browser / "browser.har").write_text(
                json.dumps(har({
                    **har_entry(f"{ORIGIN}/export.pdf"),
                    "response": {
                        "status": 200,
                        "headers": [{"name": "Content-Disposition", "value": "attachment; filename=export.pdf"}],
                        "content": {"mimeType": "application/pdf", "text": ""},
                    },
                })),
                encoding="utf-8",
            )
            (api / "api.status.json").write_text(
                '{"complete":true,"count":1,"observed":1,"cache_skipped":0,"body_unavailable":0,"body_unavailable_cache_skipped":0,"wire_304_responses":0,"wire_304_ambiguous":0,"cache_evidence_ambiguous":0,"failed_messages":0}',
                encoding="utf-8",
            )
            (api / "api.har").write_text(
                json.dumps(har(har_entry(f"{ORIGIN}/api/Auth/session"))),
                encoding="utf-8",
            )

            captures = _read_capture_files(root)
            entries, counts = collect_har_entries(captures, expected_origin=ORIGIN)
            status_summary = _summarize_capture_status(root)
            counts["body_unavailable"] = status_summary["body_unavailable"]
            counts["cache_skipped"] = status_summary["cache_skipped"]
            counts["body_unavailable_cache_skipped"] = status_summary[
                "body_unavailable_cache_skipped"
            ]
            counts["cache_evidence_ambiguous"] = status_summary[
                "cache_evidence_ambiguous"
            ]
            counts["wire_304_responses"] = status_summary["wire_304_responses"]
            counts["wire_304_ambiguous"] = status_summary["wire_304_ambiguous"]

        self.assertEqual(len(entries), 2)
        self.assertEqual(entries[0]["response"]["status"], 200)
        self.assertEqual(counts["body_unavailable"], 1)
        report = sanitize_report(
            alerts=[],
            source_counts=counts,
            duration_seconds=0.1,
            completed=True,
        )
        self.assertEqual(report["messages"]["body_unavailable"], 1)
        self.assertEqual(report["status"], "inconclusive")

    def test_missing_message_accounting_is_invalid(self) -> None:
        with tempfile.TemporaryDirectory() as root_text:
            root = Path(root_text)
            browser = root / "browser"
            browser.mkdir()
            (browser / "browser.status.json").write_text(
                '{"complete":true,"count":1,"observed":2,"cache_skipped":0,"body_unavailable":0,"body_unavailable_cache_skipped":0,"wire_304_responses":0,"wire_304_ambiguous":0,"cache_evidence_ambiguous":0,"failed_messages":0}',
                encoding="utf-8",
            )
            with self.assertRaises(PassiveAnalysisError) as error:
                _read_capture_files(root)
            self.assertEqual(error.exception.reason, "invalid_capture")

    def test_capture_status_accounts_for_cache_skips_and_rejects_skips_with_304(self) -> None:
        with tempfile.TemporaryDirectory() as root_text:
            root = Path(root_text)
            browser = root / "browser"
            api = root / "api-request-context"
            browser.mkdir()
            api.mkdir()
            (browser / "browser.status.json").write_text(
                json.dumps({
                    "complete": True,
                    "count": 1,
                    "observed": 2,
                    "cache_skipped": 1,
                    "body_unavailable": 0,
                    "body_unavailable_cache_skipped": 1,
                    "failed_messages": 0,
                    "wire_304_responses": 0,
                    "wire_304_ambiguous": 0,
                    "cache_evidence_ambiguous": 0,
                }),
                encoding="utf-8",
            )
            (browser / "browser.har").write_text(
                json.dumps(har(har_entry(f"{ORIGIN}/profile"))), encoding="utf-8"
            )
            (api / "api.status.json").write_text(
                json.dumps({
                    "complete": True,
                    "count": 1,
                    "observed": 1,
                    "cache_skipped": 0,
                    "body_unavailable": 0,
                    "body_unavailable_cache_skipped": 0,
                    "failed_messages": 0,
                    "wire_304_responses": 0,
                    "wire_304_ambiguous": 0,
                    "cache_evidence_ambiguous": 0,
                }),
                encoding="utf-8",
            )
            (api / "api.har").write_text(
                json.dumps(har(har_entry(f"{ORIGIN}/api/Auth/session"))),
                encoding="utf-8",
            )

            captures = _read_capture_files(root)
            summary = _summarize_capture_status(root)
            entries, collected = collect_har_entries(
                captures, expected_origin=ORIGIN
            )
            report = sanitize_report(
                alerts=[],
                source_counts={
                    **collected,
                    "body_unavailable": summary["body_unavailable"],
                    "cache_skipped": summary["cache_skipped"],
                    "body_unavailable_cache_skipped": summary[
                        "body_unavailable_cache_skipped"
                    ],
                    "cache_evidence_ambiguous": summary[
                        "cache_evidence_ambiguous"
                    ],
                    "wire_304_responses": summary["wire_304_responses"],
                    "wire_304_ambiguous": summary["wire_304_ambiguous"],
                },
                duration_seconds=0.1,
                completed=True,
            )

        self.assertEqual(len(captures["browser"]), 1)
        self.assertEqual(len(entries), 2)
        self.assertEqual(summary["browser"], 1)
        self.assertEqual(summary["api_request_context"], 1)
        self.assertEqual(summary["cache_skipped"], 1)
        self.assertEqual(summary["body_unavailable_cache_skipped"], 1)
        self.assertEqual(summary["cache_evidence_ambiguous"], 0)
        self.assertEqual(report["messages"]["cache_skipped"], 1)
        self.assertEqual(report["messages"]["body_unavailable_cache_skipped"], 1)
        self.assertEqual(report["status"], "passed")
        self.assertEqual(report["messages"]["wire_304_responses"], 0)
        self.assertEqual(report["messages"]["wire_304_ambiguous"], 0)

        for field in (
            "wire_304_responses",
            "wire_304_ambiguous",
            "cache_evidence_ambiguous",
        ):
            with tempfile.TemporaryDirectory() as root_text:
                root = Path(root_text)
                browser = root / "browser"
                browser.mkdir()
                status = {
                    "complete": True,
                    "count": 1,
                    "observed": 2,
                    "cache_skipped": 1,
                    "body_unavailable": 0,
                    "body_unavailable_cache_skipped": 1,
                    "failed_messages": 0,
                    "wire_304_responses": 0,
                    "wire_304_ambiguous": 0,
                    "cache_evidence_ambiguous": 0,
                }
                status[field] = 1
                (browser / "browser.status.json").write_text(
                    json.dumps(status), encoding="utf-8"
                )
                with self.assertRaises(PassiveAnalysisError) as error:
                    _read_capture_files(root)
                self.assertEqual(error.exception.reason, "invalid_capture")

    def test_failure_report_is_sanitized_and_inconclusive(self) -> None:
        sentinel = "synthetic-credential-sentinel-4f73d9"
        report = failure_report(sentinel, {"browser": 1})
        serialized = str(report)
        self.assertNotIn(sentinel, serialized)
        self.assertEqual(report["status"], "inconclusive")
        self.assertEqual(report["reason"], "scanner_failed")
        self.assertEqual(
            set(report),
            {"schema_version", "status", "reason", "messages", "processing_seconds", "alerts"},
        )
        self.assertEqual(
            set(report["messages"]),
            {
                "browser",
                "api_request_context",
                "frontend_routes",
                "api_routes",
                "body_unavailable",
                "cache_skipped",
                "body_unavailable_cache_skipped",
                "cache_evidence_ambiguous",
                "wire_304_responses",
                "wire_304_ambiguous",
            },
        )
        self.assertEqual(report["messages"]["browser"], 1)

    def test_valid_exception_is_exact_route_scoped_and_expires(self) -> None:
        now = datetime(2026, 11, 24, tzinfo=timezone.utc)
        record = {
            "id": "synthetic-exception-1",
            "rule_id": "10020",
            "path": "/api/Usuarios",
            "approver": "synthetic-reviewer",
            "justification": "synthetic approved exception for the test fixture",
            "created_at": "2026-11-20T00:00:00Z",
            "expires_at": "2026-12-10T00:00:00Z",
        }
        with tempfile.TemporaryDirectory() as root_text:
            file_path = Path(root_text) / "exceptions.json"
            file_path.write_text(
                json.dumps({"version": "1", "exceptions": [record]}),
                encoding="utf-8",
            )
            exception = load_exceptions(file_path, now=now)

        alert = {
            "pluginId": "10020",
            "risk": "High",
            "confidence": "High",
            "url": f"{ORIGIN}/api/Usuarios?synthetic=sensitive",
        }
        self.assertTrue(evaluate_policy([alert], exception).approved)
        self.assertFalse(
            evaluate_policy([{**alert, "url": f"{ORIGIN}/api/OutraRota"}], exception).approved
        )
        expired = [{**exception[0], "status": "expired"}]
        self.assertFalse(evaluate_policy([alert], expired).approved)

    def test_exception_with_lifetime_over_30_days_is_invalid(self) -> None:
        with tempfile.TemporaryDirectory() as root_text:
            file_path = Path(root_text) / "exceptions.json"
            file_path.write_text(
                '{"version":"1","exceptions":[{"id":"e1","rule_id":"10020","path":"/api/Usuarios","approver":"reviewer","justification":"reason","created_at":"2026-11-01T00:00:00Z","expires_at":"2026-12-02T00:00:00Z"}]}',
                encoding="utf-8",
            )
            with self.assertRaises(PassiveAnalysisError):
                load_exceptions(file_path, now=datetime(2026, 11, 24, tzinfo=timezone.utc))


if __name__ == "__main__":
    unittest.main()
