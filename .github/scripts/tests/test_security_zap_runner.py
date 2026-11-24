"""Cleanup and cancellation contracts for the security E2E/ZAP wrapper."""

from pathlib import Path
from contextlib import redirect_stdout
from io import StringIO
import sys
import tempfile
import unittest
import json
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import run_security_zap_e2e as runner


SENTINEL = "synthetic-credential-sentinel-4f73d9"


class SecurityZapRunnerTests(unittest.TestCase):
    @staticmethod
    def _access_log(
        *, method: str, uri: str, status: int, started_at: float, duration: float = 0.01
    ) -> str:
        return json.dumps(
            {
                "logger": "http.log.access.log0",
                "ts": started_at + duration,
                "duration": duration,
                "status": status,
                "request": {
                    "method": method,
                    "host": "localhost:18443",
                    "uri": uri,
                    "headers": {"Cookie": ["synthetic-cookie-sentinel"]},
                },
            }
        )

    @staticmethod
    def _candidate(
        *, index: int, har_index: int | None, url: str, started_at: str, source: str,
        skipped: bool, body_unavailable: bool = True, has_extra_info: bool = False,
    ) -> dict[str, object]:
        return {
            "original_entry_index": index,
            "har_entry_index": har_index,
            "method": "GET",
            "url": url,
            "response_status": 200,
            "started_at": started_at,
            "cache_source": source,
            "body_unavailable": body_unavailable,
            "skipped": skipped,
            "cache_event_observed": source != "network",
            "has_extra_info": has_extra_info,
            "response_extra_info": "absent",
            "resource_type": "Image",
            "loading_finished": True,
        }

    @staticmethod
    def _request_evidence(
        har_index: int, *, source: str = "network", cache_event: bool = False
    ) -> dict[str, object]:
        return {
            "har_entry_index": har_index,
            "cache_source": source,
            "cache_event_observed": cache_event,
            "has_extra_info": None,
            "response_extra_info": "absent",
            "resource_type": "Document",
            "loading_finished": True,
        }

    def test_parses_only_normalized_caddy_access_fields(self) -> None:
        line = json.dumps(
            {
                "logger": "http.log.access.log0",
                "ts": 1001.25,
                "duration": 0.25,
                "status": 200,
                "request": {
                    "method": "GET",
                    "host": "localhost:18443",
                    "uri": "/api/products?id=synthetic-query-sentinel",
                    "headers": {"Authorization": ["synthetic-header-sentinel"]},
                },
            }
        )

        records = runner.parse_caddy_access_log_lines([line])

        self.assertEqual(len(records), 1)
        self.assertEqual(records[0].method, "GET")
        self.assertEqual(records[0].uri, "/api/products?id=synthetic-query-sentinel")
        self.assertEqual(records[0].status, 200)
        self.assertAlmostEqual(records[0].started_at, 1001.0)
        self.assertNotIn("synthetic-query-sentinel", repr(records))
        self.assertNotIn("synthetic-header-sentinel", repr(records))

    def test_rejects_truncated_access_records_without_echoing_raw_line(self) -> None:
        raw = '{"logger":"http.log.access","request":"synthetic-raw-line-sentinel"'

        with self.assertRaises(runner.AccessLogEvidenceError) as raised:
            runner.parse_caddy_access_log_lines([raw])

        self.assertEqual(str(raised.exception), "invalid_access_log")
        self.assertNotIn("synthetic-raw-line-sentinel", str(raised.exception))

    def test_excludes_only_the_explicit_csp_local_mock_from_proxy_reconciliation(self) -> None:
        request = {
            "url": "https://localhost:18443/csp-dynamic-eval-probe.js",
        }
        marked_response = {
            "headers": [
                {
                    "name": "X-Lab-Solos-E2E-Local-Mock",
                    "value": "csp-dynamic-eval-probe",
                }
            ]
        }

        self.assertTrue(runner._is_explicit_local_mock(request, marked_response))
        self.assertFalse(runner._is_explicit_local_mock(request, {"headers": []}))
        with self.assertRaises(runner.AccessLogEvidenceError) as raised:
            runner._is_explicit_local_mock(
                {"url": "https://localhost:18443/api/items"}, marked_response
            )
        self.assertEqual(str(raised.exception), "capture_sidecar_conflict")

    def test_reconciles_unique_cache_absence_and_wire_304_without_relaxing(self) -> None:
        cached = {
            "method": "GET",
            "url": "https://localhost:18443/assets/chemistry.bin?token=synthetic",
            "started_at": 1000.0,
            "cache_source": "disk_cache",
            "body_unavailable": True,
            "skipped": True,
            "cache_event_observed": True,
            "has_extra_info": True,
            "response_extra_info": "absent",
            "loading_finished": True,
            "status": 200,
        }
        revalidated = {
            "method": "GET",
            "url": "https://localhost:18443/assets/catalog.bin",
            "started_at": 1002.0,
            "status": 200,
            "cache_source": "network",
            "body_unavailable": False,
            "skipped": False,
            "cache_event_observed": False,
        }
        logs = [
            json.dumps(
                {
                    "logger": "http.log.access.log0",
                    "ts": 1002.1,
                    "duration": 0.1,
                    "status": 304,
                    "request": {
                        "method": "GET",
                        "host": "localhost:18443",
                        "uri": "/assets/catalog.bin",
                    },
                }
            )
        ]

        access = runner.parse_caddy_access_log_lines(logs)
        result = runner.reconcile_caddy_access_logs(
            [cached, revalidated], access, expected_origin="https://localhost:18443"
        )

        self.assertFalse(result.complete)
        self.assertEqual(result.cache_skipped_confirmed, 1)
        self.assertEqual(result.wire_304_responses, 1)
        self.assertEqual(result.wire_304_ambiguous, 0)

    def test_accepts_only_a_unique_explicit_cache_candidate_with_no_wire_304(self) -> None:
        cached = {
            "method": "GET",
            "url": "https://localhost:18443/assets/chemistry.bin?token=synthetic",
            "started_at": 1000.0,
            "cache_source": "disk_cache",
            "body_unavailable": True,
            "skipped": True,
            "cache_event_observed": False,
            "has_extra_info": None,
            "response_extra_info": "absent",
            "loading_finished": True,
            "status": 200,
        }
        network = {
            "method": "GET",
            "url": "https://localhost:18443/api/products",
            "started_at": 1001.0,
            "status": 200,
            "cache_source": None,
            "body_unavailable": False,
            "skipped": False,
        }
        logs = runner.parse_caddy_access_log_lines(
            [self._access_log(method="GET", uri="/api/products", status=200, started_at=1001.0)]
        )

        result = runner.reconcile_caddy_access_logs(
            [cached, network], logs, expected_origin="https://localhost:18443"
        )

        self.assertTrue(result.complete)
        self.assertEqual(result.cache_skipped_confirmed, 1)
        self.assertEqual(result.wire_304_responses, 0)
        self.assertEqual(result.ambiguous, 0)

    def test_confirms_a_retained_cache_hit_when_nearby_wire_log_matches_network_request(self) -> None:
        network = {
            "method": "GET",
            "url": "https://localhost:18443/assets/font.woff2",
            "started_at": 1000.0,
            "status": 200,
            "cache_source": "network",
            "body_unavailable": False,
            "skipped": False,
            "cache_hit": False,
        }
        cached = {
            "method": "GET",
            "url": network["url"],
            "started_at": 1000.1,
            "status": 200,
            "cache_source": "disk_cache",
            "body_unavailable": False,
            "skipped": False,
            "cache_hit": True,
            "cache_event_observed": False,
            "response_extra_info": "absent",
            "loading_finished": True,
        }
        logs = runner.parse_caddy_access_log_lines(
            [self._access_log(method="GET", uri="/assets/font.woff2", status=200, started_at=1000.0)]
        )

        result = runner.reconcile_caddy_access_logs(
            [network, cached], logs, expected_origin="https://localhost:18443"
        )

        self.assertTrue(result.complete)
        self.assertEqual(result.matched_access_records, 1)
        self.assertEqual(result.cache_hits_confirmed, 1)
        self.assertEqual(result.ambiguous, 0)

    def test_reconciles_all_status_sidecars_without_exposing_har_or_query_values(self) -> None:
        with tempfile.TemporaryDirectory() as root_text:
            capture_dir = Path(root_text)
            browser_dir = capture_dir / "browser"
            api_dir = capture_dir / "api-request-context"
            browser_dir.mkdir()
            api_dir.mkdir()
            retained = self._candidate(
                index=0,
                har_index=0,
                url="https://localhost:18443/assets/retained.bin?private=retained-query-sentinel",
                started_at="1970-01-01T00:16:40Z",
                source="network",
                skipped=False,
            )
            skipped = self._candidate(
                index=1,
                har_index=None,
                url="https://localhost:18443/assets/cached.bin?private=skipped-query-sentinel",
                started_at="1970-01-01T00:16:41Z",
                source="disk_cache",
                skipped=True,
                has_extra_info=True,
            )
            browser_har = {
                "log": {
                    "entries": [
                        {
                            "startedDateTime": "1970-01-01T00:16:40Z",
                            "request": {
                                "method": "GET",
                                "url": retained["url"],
                                "headers": [{"name": "Authorization", "value": SENTINEL}],
                            },
                            "response": {
                                "status": 200,
                                "content": {"text": "synthetic-body-sentinel"},
                            },
                        }
                    ]
                }
            }
            api_har = {
                "log": {
                    "entries": [
                        {
                            "startedDateTime": "1970-01-01T00:16:42Z",
                            "request": {"method": "GET", "url": "https://localhost:18443/api/items"},
                            "response": {"status": 200, "content": {"text": "synthetic-api-body"}},
                        }
                    ]
                }
            }
            browser_status = {
                "complete": True,
                "count": 1,
                "observed": 2,
                "cache_skipped": 1,
                "body_unavailable": 1,
                "body_unavailable_cache_skipped": 1,
                "wire_304_responses": 0,
                "wire_304_ambiguous": 0,
                "cache_evidence_ambiguous": 0,
                "request_timing_missing": 0,
                "bodyless_cache_candidate_count": 2,
                "failed_messages": 0,
                "bodyless_cache_candidates": [retained, skipped],
                "browser_request_evidence": [self._request_evidence(0)],
            }
            api_status = {
                "complete": True,
                "count": 1,
                "observed": 1,
                "cache_skipped": 0,
                "body_unavailable": 0,
                "body_unavailable_cache_skipped": 0,
                "wire_304_responses": 0,
                "wire_304_ambiguous": 0,
                "cache_evidence_ambiguous": 0,
                "request_timing_missing": 0,
                "bodyless_cache_candidate_count": 0,
                "failed_messages": 0,
                "bodyless_cache_candidates": [],
                "browser_request_evidence": [],
            }
            (browser_dir / "browser.har").write_text(json.dumps(browser_har), encoding="utf-8")
            (api_dir / "api.har").write_text(json.dumps(api_har), encoding="utf-8")
            (browser_dir / "browser.status.json").write_text(json.dumps(browser_status), encoding="utf-8")
            (api_dir / "api.status.json").write_text(json.dumps(api_status), encoding="utf-8")
            logs = runner.parse_caddy_access_log_lines(
                [
                    self._access_log(method="GET", uri="/assets/retained.bin?private=retained-query-sentinel", status=200, started_at=1000),
                    self._access_log(method="GET", uri="/api/items", status=200, started_at=1002),
                ]
            )

            result = runner.reconcile_capture_directory(
                capture_dir, logs, expected_origin="https://localhost:18443"
            )

            self.assertTrue(result.complete)
            self.assertEqual(result.cache_skipped_confirmed, 1)
            self.assertNotIn(SENTINEL, repr(result))
            self.assertNotIn("skipped-query-sentinel", repr(result))
            self.assertNotIn("synthetic-body-sentinel", repr(result))

    def test_fails_closed_when_bodyless_candidate_count_is_missing_or_divergent(self) -> None:
        for mode in ("missing", "divergent"):
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as root_text:
                capture_dir = Path(root_text)
                for source in ("browser", "api-request-context"):
                    source_dir = capture_dir / source
                    source_dir.mkdir()
                    status = {
                        "complete": True,
                        "count": 0,
                        "observed": 0,
                        "cache_skipped": 0,
                        "body_unavailable": 0,
                        "body_unavailable_cache_skipped": 0,
                        "wire_304_responses": 0,
                        "wire_304_ambiguous": 0,
                        "cache_evidence_ambiguous": 0,
                        "request_timing_missing": 0,
                        "bodyless_cache_candidate_count": 0,
                        "failed_messages": 0,
                        "bodyless_cache_candidates": [],
                        "browser_request_evidence": [],
                    }
                    if source == "browser" and mode == "missing":
                        status.pop("bodyless_cache_candidate_count")
                    elif source == "browser" and mode == "divergent":
                        status["bodyless_cache_candidate_count"] = 1
                    (source_dir / "run.status.json").write_text(
                        json.dumps(status), encoding="utf-8"
                    )

                result = runner.reconcile_capture_directory(
                    capture_dir, [], expected_origin="https://localhost:18443"
                )

                self.assertFalse(result.complete)
                browser_status = json.loads(
                    (capture_dir / "browser/run.status.json").read_text(encoding="utf-8")
                )
                self.assertFalse(browser_status["complete"])

    def test_fails_closed_when_request_timing_is_missing_or_nonzero(self) -> None:
        for mode in ("missing", "nonzero"):
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as root_text:
                capture_dir = Path(root_text)
                for source in ("browser", "api-request-context"):
                    source_dir = capture_dir / source
                    source_dir.mkdir()
                    status = {
                        "complete": True,
                        "count": 0,
                        "observed": 0,
                        "cache_skipped": 0,
                        "body_unavailable": 0,
                        "body_unavailable_cache_skipped": 0,
                        "wire_304_responses": 0,
                        "wire_304_ambiguous": 0,
                        "cache_evidence_ambiguous": 0,
                        "request_timing_missing": 0,
                        "bodyless_cache_candidate_count": 0,
                        "failed_messages": 0,
                        "bodyless_cache_candidates": [],
                        "browser_request_evidence": [],
                    }
                    if source == "browser" and mode == "missing":
                        status.pop("request_timing_missing")
                    elif source == "browser" and mode == "nonzero":
                        status["request_timing_missing"] = 1
                    (source_dir / "run.status.json").write_text(
                        json.dumps(status), encoding="utf-8"
                    )

                result = runner.reconcile_capture_directory(
                    capture_dir, [], expected_origin="https://localhost:18443"
                )

                self.assertFalse(result.complete)
                browser_status = json.loads(
                    (capture_dir / "browser/run.status.json").read_text(encoding="utf-8")
                )
                self.assertFalse(browser_status["complete"])

    def test_caddy_log_reader_uses_read_only_compose_logs_and_discards_raw_output(self) -> None:
        raw_log = self._access_log(
            method="GET",
            uri="/api/items?token=synthetic-log-query-sentinel",
            status=200,
            started_at=1000.0,
        )
        completed = SimpleNamespace(returncode=0, stdout=raw_log)
        with patch.object(runner.subprocess, "run", return_value=completed) as run:
            records = runner.read_compose_caddy_access_logs(
                Path("compose.yml"),
                "lab-solos-ci-browser-security",
                None,
                datetime(1970, 1, 1, tzinfo=timezone.utc),
            )

        command = run.call_args.args[0]
        self.assertIn("logs", command)
        self.assertIn("proxy", command)
        self.assertNotIn("up", command)
        self.assertNotIn("--follow", command)
        self.assertNotIn("zap", command)
        self.assertEqual(len(records), 1)
        self.assertNotIn("synthetic-log-query-sentinel", repr(records))
        self.assertEqual(completed.stdout, "")

    def test_fails_closed_on_duplicate_or_missing_access_correlation(self) -> None:
        candidate = {
            "method": "GET",
            "url": "https://localhost:18443/api/items",
            "started_at": 1000.0,
            "status": 200,
            "cache_source": "network",
            "body_unavailable": True,
            "skipped": False,
            "cache_event_observed": False,
        }
        duplicate_logs = runner.parse_caddy_access_log_lines(
            [
                json.dumps(
                    {
                        "logger": "http.log.access.log0",
                        "ts": 1000.1,
                        "duration": 0.1,
                        "status": 200,
                        "request": {
                            "method": "GET",
                            "host": "localhost:18443",
                            "uri": "/api/items",
                        },
                    }
                ),
                json.dumps(
                    {
                        "logger": "http.log.access.log0",
                        "ts": 1000.2,
                        "duration": 0.2,
                        "status": 200,
                        "request": {
                            "method": "GET",
                            "host": "localhost:18443",
                            "uri": "/api/items",
                        },
                    }
                ),
            ]
        )

        duplicate_result = runner.reconcile_caddy_access_logs(
            [candidate], duplicate_logs, expected_origin="https://localhost:18443"
        )
        missing_result = runner.reconcile_caddy_access_logs(
            [candidate], [], expected_origin="https://localhost:18443"
        )
        one_log = runner.parse_caddy_access_log_lines(
            [
                self._access_log(
                    method="GET", uri="/api/items", status=200, started_at=1000.0
                )
            ]
        )
        duplicate_observation = {**candidate, "started_at": 1000.0}
        colliding_result = runner.reconcile_caddy_access_logs(
            [candidate, duplicate_observation],
            one_log,
            expected_origin="https://localhost:18443",
        )

        self.assertFalse(duplicate_result.complete)
        self.assertGreater(duplicate_result.ambiguous, 0)
        self.assertFalse(missing_result.complete)
        self.assertEqual(missing_result.cache_skipped_confirmed, 0)
        self.assertFalse(colliding_result.complete)
        self.assertGreater(colliding_result.ambiguous, 0)

    def test_matches_repeated_requests_one_to_one_by_unique_closest_start_time(self) -> None:
        observations = [
            {
                "method": "GET",
                "url": "https://localhost:18443/api/items",
                "started_at": 1000.0,
                "status": 200,
                "cache_source": "network",
                "body_unavailable": False,
                "skipped": False,
            },
            {
                "method": "GET",
                "url": "https://localhost:18443/api/items",
                "started_at": 1000.2,
                "status": 200,
                "cache_source": "network",
                "body_unavailable": False,
                "skipped": False,
            },
        ]
        logs = runner.parse_caddy_access_log_lines(
            [
                self._access_log(
                    method="GET", uri="/api/items", status=200, started_at=1000.01
                ),
                self._access_log(
                    method="GET", uri="/api/items", status=200, started_at=1000.19
                ),
            ]
        )

        result = runner.reconcile_caddy_access_logs(
            observations, logs, expected_origin="https://localhost:18443"
        )

        self.assertTrue(result.complete)
        self.assertEqual(result.matched_access_records, 2)
        self.assertEqual(result.unmatched_access_records, 0)
        self.assertEqual(result.unmatched_capture_requests, 0)
        self.assertEqual(result.ambiguous, 0)

    def test_removes_raw_har_and_status_sentinels_after_success_or_test_failure(self) -> None:
        with tempfile.TemporaryDirectory() as root_text:
            root = Path(root_text)
            temp_root = root / "runner-temp"
            temp_root.mkdir()
            reports = root / "reports"
            commands: list[str] = []
            captures: list[Path] = []

            def fake_runner(command, cwd, env):
                del cwd
                capture_dir = Path(env["SECURITY_ZAP_CAPTURE_DIR"])
                captures.append(capture_dir)
                if "test:e2e" in command:
                    commands.append("playwright")
                    self.assertEqual(
                        command[command.index("--grep") + 1],
                        "synthetic focused test title",
                    )
                    source = capture_dir / "api-request-context"
                    source.mkdir(parents=True)
                    (source / "sentinel.har").write_text(SENTINEL, encoding="utf-8")
                    (source / "sentinel.status.json").write_text("{}", encoding="utf-8")
                    return 1
                commands.append("zap")
                self.assertTrue((capture_dir / "api-request-context/sentinel.har").is_file())
                self.assertFalse(
                    json.loads(
                        (capture_dir / "api-request-context/sentinel.status.json").read_text(
                            encoding="utf-8"
                        )
                    )["complete"]
                )
                Path(command[command.index("--report") + 1]).write_text(
                    '{"status":"inconclusive"}', encoding="utf-8"
                )
                return 2

            output = StringIO()
            with redirect_stdout(output):
                exit_code, report = runner.run_pipeline(
                    frontend=root,
                    env={},
                    command_runner=fake_runner,
                    temp_root=temp_root,
                    report_root=reports,
                    test_grep="synthetic focused test title",
                    access_log_reader=lambda *_args: [],
                )

            self.assertEqual(commands, ["playwright", "zap"])
            self.assertEqual(exit_code, 1)
            self.assertIn(
                "[security-zap-access-log] complete=false evidence=capture_sidecar_missing",
                output.getvalue(),
            )
            self.assertNotIn(SENTINEL, output.getvalue())
            self.assertTrue(report.is_file())
            self.assertNotIn(SENTINEL, report.read_text(encoding="utf-8"))
            self.assertTrue(captures)
            self.assertTrue(all(not path.exists() for path in captures))

    def test_cancellation_cleans_capture_files(self) -> None:
        with tempfile.TemporaryDirectory() as root_text:
            root = Path(root_text)
            temp_root = root / "runner-temp"
            temp_root.mkdir()
            captures: list[Path] = []

            def cancel(command, cwd, env):
                del command, cwd
                capture_dir = Path(env["SECURITY_ZAP_CAPTURE_DIR"])
                captures.append(capture_dir)
                source = capture_dir / "browser"
                source.mkdir(parents=True)
                (source / "sentinel.har").write_text(SENTINEL, encoding="utf-8")
                raise KeyboardInterrupt

            with self.assertRaises(KeyboardInterrupt):
                runner.run_pipeline(
                    frontend=root,
                    env={},
                    command_runner=cancel,
                    temp_root=temp_root,
                    report_root=root / "reports",
                    access_log_reader=lambda *_args: [],
                )

            self.assertTrue(captures)
            self.assertFalse(captures[0].exists())

    def test_refuses_to_recursively_delete_an_unowned_path(self) -> None:
        with tempfile.TemporaryDirectory() as root_text:
            root = Path(root_text)
            valuable = root / "user-data"
            valuable.mkdir()
            with self.assertRaises(RuntimeError):
                runner.cleanup_capture_directory(valuable, temp_root=root)
            self.assertTrue(valuable.is_dir())

    def test_failure_fallback_report_is_sanitized_and_inconclusive(self) -> None:
        with tempfile.TemporaryDirectory() as root_text:
            report_path = Path(root_text) / "report.json"

            self.assertTrue(runner.write_capture_failure_report(report_path))

            report = json.loads(report_path.read_text(encoding="utf-8"))
            self.assertEqual(report["status"], "inconclusive")
            self.assertEqual(report["reason"], "capture_incomplete")
            self.assertEqual(report["alerts"], [])
            self.assertNotIn(SENTINEL, report_path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
