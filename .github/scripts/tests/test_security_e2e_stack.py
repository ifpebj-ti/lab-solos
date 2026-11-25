"""Static contracts for the disposable, same-origin security E2E stack."""

from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[3]


class SecurityE2EStackTests(unittest.TestCase):
    def require_text(self, relative_path: str, message: str) -> str:
        path = ROOT / relative_path
        self.assertTrue(path.is_file(), message)
        return path.read_text(encoding="utf-8")

    def test_compose_uses_an_isolated_production_stack_and_shared_csp(self) -> None:
        compose = self.require_text(
            "docker-compose-security-e2e.yml",
            "The disposable security E2E composition is missing.",
        )
        proxy = self.require_text(
            "infra/testing/Caddyfile.security-e2e",
            "The security E2E Caddy configuration is missing.",
        )

        for service in ("db:", "api:", "smtp:", "frontend:", "proxy:"):
            self.assertIn(service, compose)
        self.assertRegex(compose, r"(?m)^\s*image:\s*postgres:15(?:-[\w.]+)?(?:@sha256:[0-9a-f]+)?\s*$")
        self.assertRegex(
            compose,
            r"(?m)^\s*ASPNETCORE_ENVIRONMENT:\s*Production\s*$",
        )
        self.assertIn("127.0.0.1:${SECURITY_E2E_HTTPS_PORT:-18443}:443", compose)
        self.assertIn("security_e2e_secrets:/run/secrets:ro", compose)
        self.assertIn("security_e2e_postgres_data:/var/lib/postgresql/data", compose)
        self.assertIn("security_e2e_caddy_data:/data", compose)
        self.assertIn("AuthenticationProtection__ForwardedHeaders__KnownProxies__0: 172.29.240.10", compose)
        self.assertIn("ipv4_address: 172.29.240.10", compose)
        self.assertIn("subnet: 172.29.240.0/24", compose)
        self.assertIn("VITE_API_URL: /api/", compose)
        self.assertIn("SSL_CERT_FILE: /run/secrets/ca.crt", compose)
        self.assertIn("MP_SMTP_REQUIRE_STARTTLS: \"true\"", compose)
        self.assertEqual(len(re.findall(r"(?m)^\s+ports:", compose)), 1)
        smtp_service = compose.split("\n  smtp:\n", 1)[1].split("\n  api:\n", 1)[0]
        self.assertNotIn("ports:", smtp_service)
        self.assertRegex(compose, r"(?s)security_private:\n\s+internal: true")
        self.assertRegex(compose, r"(?s)security_app:\n\s+internal: true")
        self.assertIn("https://localhost", proxy)
        self.assertIn("tls internal", proxy)
        self.assertIn("@api path /api /api/*", proxy)
        self.assertIn("reverse_proxy api:8080", proxy)
        self.assertIn("import /etc/caddy/security-headers.caddy", proxy)
        self.assertIn("import frontend_content_security_policy", proxy)
        self.assertRegex(proxy, r"(?s)@api path /api /api/\*.*?handle @api.*?reverse_proxy api:8080")
        self.assertNotRegex(proxy, r"(?s)@api path /api /api/\*.*?handle @api[^}]*frontend_content_security_policy")

    def test_security_access_logs_are_temporary_unsampled_json(self) -> None:
        compose = self.require_text(
            "docker-compose-security-e2e.yml",
            "The disposable security E2E composition is missing.",
        )
        proxy = self.require_text(
            "infra/testing/Caddyfile.security-e2e",
            "The security E2E Caddy configuration is missing.",
        )

        proxy_service = compose.split("\n  proxy:\n", 1)[1].split(
            "\n  zap-passive:\n", 1
        )[0]
        self.assertEqual(
            proxy_service.count(
                "./infra/testing/Caddyfile.security-e2e:/etc/caddy/Caddyfile:ro"
            ),
            1,
        )
        self.assertNotIn("./Caddyfile:/etc/caddy/Caddyfile", proxy_service)

        site = proxy.split("https://localhost {", 1)[1].rsplit("\n}", 1)[0]
        self.assertRegex(
            site,
            r"(?m)^\tlog \{\n\t\toutput stdout\n\t\tformat json\n\t\}",
        )
        self.assertEqual(len(re.findall(r"(?m)^\tlog \{", site)), 1)
        self.assertNotRegex(site, r"(?mi)^\s*(?:sampling|log_skip)\b")

    def test_playwright_lists_future_auth_and_security_specs_explicitly(self) -> None:
        config = self.require_text(
            "frontend/playwright.config.ts",
            "The Playwright configuration is missing.",
        )

        for expected in (
            "authentication-protection.real.spec.ts",
            "authentication-protection.ui.spec.ts",
            "browser-security.real.spec.ts",
            "security-smoke.e2e.ts",
            "name: 'security'",
            "trace: 'off'",
            "ignoreHTTPSErrors: true",
        ):
            self.assertIn(expected, config)

        capture_fixture = self.require_text(
            "frontend/e2e/infra/security-passive-capture.ts",
            "The passive capture fixture is missing.",
        )
        self.assertRegex(
            capture_fixture,
            r"session\.send\(\s*['\"]Network\.enable['\"]\s*,\s*CDP_RESPONSE_BUFFER_OPTIONS\s*\)",
            "CDP body retrieval must configure the same bounded buffers as capture.",
        )
        for expected in (
            "context.on('requestfinished'",
            "wrappedRequestMethods",
            "response.url()",
            "response.headersArray()",
            "toApiHarEntry",
            "classifyUnavailableBody",
            "body_unavailable",
            "writeCapture(",
            "'browser',",
            "'api-request-context',",
            "allowedOrigin",
        ):
            self.assertIn(expected, capture_fixture)
        self.assertIn("event.request.url", capture_fixture)
        self.assertIn("security-passive-capture", self.require_text(
            "frontend/e2e/infra/security-smoke.e2e.ts", "Security smoke is missing."
        ))
        self.assertIn("security-passive-capture", self.require_text(
            "frontend/e2e/browser-security.real.spec.ts", "Real security E2E is missing."
        ))

    def test_binary_capture_reads_paused_cdp_response_without_replay(self) -> None:
        capture_fixture = self.require_text(
            "frontend/e2e/infra/security-passive-capture.ts",
            "The passive capture fixture is missing.",
        )

        self.assertIn("Fetch.enable", capture_fixture)
        self.assertIn("requestStage: 'Response'", capture_fixture)
        self.assertIn("Fetch.requestPaused", capture_fixture)
        self.assertIn("Fetch.getResponseBody", capture_fixture)
        self.assertIn("Fetch.continueRequest", capture_fixture)
        self.assertIn("urlPattern: `${allowedOrigin}/*`", capture_fixture)
        self.assertIn("unavailableReason === 'binary_media'", capture_fixture)
        self.assertIn("page.on('download', trackDownload)", capture_fixture)
        self.assertIn("isCaptureWithinLimits(", capture_fixture)

    def test_context_capture_recovers_binary_responses_outside_page_fixture(self) -> None:
        capture_fixture = self.require_text(
            "frontend/e2e/infra/security-passive-capture.ts",
            "The passive capture fixture is missing.",
        )
        page_capture = capture_fixture.split("function captureBinaryResponse", 1)[
            1
        ].split("async function takeDownloadBody", 1)[0]
        page_fixture = capture_fixture.split("page: async", 1)[1].split(
            "context: async", 1
        )[0]
        context_fixture = capture_fixture.split("context: async", 1)[1].split(
            "request: async", 1
        )[0]

        self.assertIn(
            "let capturedBinaryRequests = new WeakSet<Request>()", capture_fixture
        )
        self.assertIn(
            "capturedBinaryRequests = new WeakSet<Request>()", page_fixture
        )
        self.assertIn("capturedBinaryRequests.has(request)", page_capture)
        self.assertIn("capturedBinaryRequests.add(request)", page_capture)
        self.assertIn("capturedBinaryRequests.has(request)", context_fixture)
        self.assertIn("capturedBinaryRequests.add(request)", context_fixture)
        self.assertIn(
            "recordCapturedResult(await toHarEntry(response, request))",
            context_fixture,
        )

    def test_cdp_session_outlives_page_fixture_and_drains_before_cleanup(self) -> None:
        capture_fixture = self.require_text(
            "frontend/e2e/infra/security-passive-capture.ts",
            "The passive capture fixture is missing.",
        )
        self.assertIn("pendingFetchContinuations.add", capture_fixture)
        self.assertIn("pendingCaptureOperations.add", capture_fixture)
        self.assertIn("pendingCaptureOperations.delete", capture_fixture)
        self.assertIn("url: event.request.url", capture_fixture)
        self.assertIn("method: event.request.method", capture_fixture)
        self.assertIn("resourceType: event.type", capture_fixture)
        self.assertIn(
            "reconcileFinishedBrowserRequest(cdpInFlightSameOriginRequests",
            capture_fixture,
        )
        self.assertIn("cdpInFlightSameOriginRequests.delete(event.requestId)", capture_fixture)
        self.assertIn("drainCdpCaptureEvents(cdpCaptureDrainState", capture_fixture)

        page_fixture = capture_fixture.split("page: async", 1)[1].split(
            "context: async", 1
        )[0]
        page_teardown = page_fixture.split("} finally {", 1)[1]
        context_fixture = capture_fixture.split("context: async", 1)[1].split(
            "request: async", 1
        )[0]
        self.assertNotIn("cdpSession.detach()", page_teardown)
        self.assertNotIn("page.off('response', captureBinaryResponse)", page_teardown)
        self.assertNotIn("page.off('download', trackDownload)", page_teardown)
        self.assertNotIn("downloadBodies.clear()", page_teardown)
        self.assertNotIn("fetchBodies.clear()", page_teardown)
        self.assertNotIn("Promise.all(", page_teardown)
        self.assertIn("deadlineAtMs: cdpCaptureDrainDeadlineAtMs", page_teardown)
        self.assertIn("context.off('requestfinished', captureFinishedRequest)", context_fixture)
        self.assertRegex(context_fixture, r"trackCaptureOperation\(\s*request")
        self.assertIn("cdpDrainComplete &&", context_fixture)
        self.assertIn("pendingOperations: pendingCaptureOperations.size", capture_fixture)
        self.assertIn("pendingContinuations: pendingFetchContinuations.size", capture_fixture)
        self.assertIn(
            "pendingExtraInfo: countPendingCdpExtraInfo(cdpExtraInfoTracker)",
            capture_fixture,
        )
        self.assertIn("cdp_extra_info_pending=", capture_fixture)
        self.assertIn("inflight_same_origin_resource_types=", capture_fixture)
        self.assertIn(
            "summarizeCdpResourceTypes([...cdpInFlightSameOriginRequests.values()].map(({ resourceType }) => resourceType))",
            capture_fixture,
        )
        self.assertIn("extractSettledCaptureResults", capture_fixture)
        self.assertIn(
            "browserResponseEventCaptureStates.filter((state) => state.settled)",
            context_fixture,
        )
        self.assertNotIn("Promise.all(browserResponseEventCaptures)", context_fixture)
        self.assertIn("function releaseActiveCapturePageListeners()", capture_fixture)
        self.assertIn("page.off('response', captureBinaryResponse)", capture_fixture)
        self.assertIn("page.off('download', trackDownload)", capture_fixture)
        self.assertLess(
            context_fixture.index("await writeCapture("),
            context_fixture.index("await session.detach()"),
        )
        self.assertLess(
            context_fixture.index("await session.detach()"),
            context_fixture.index("fetchBodies.clear()"),
        )
        context_drain_index = context_fixture.index("drainCdpCaptureEvents(")
        release_index = context_fixture.index(
            "releaseActiveCapturePageListeners();"
        )
        self.assertLess(
            context_fixture.index("cdpCaptureDrainState", context_drain_index),
            release_index,
        )
        self.assertLess(
            release_index,
            context_fixture.index("observedMessages += browserResponseEventMessages"),
        )
        self.assertLess(
            context_fixture.index("await writeCapture("),
            context_fixture.rindex("releaseActiveCapturePageListeners();"),
        )

    def test_cdp_cache_diagnostic_uses_redacted_aggregate_counters(self) -> None:
        capture_fixture = self.require_text(
            "frontend/e2e/infra/security-passive-capture.ts",
            "The passive capture fixture is missing.",
        )

        self.assertIn("Network.requestServedFromCache", capture_fixture)
        self.assertIn("Network.responseReceived", capture_fixture)
        self.assertIn("Network.responseReceivedExtraInfo", capture_fixture)
        self.assertIn("redirectHasExtraInfo", capture_fixture)
        self.assertIn("hasExtraInfo", capture_fixture)
        self.assertIn("recordCdpResponseStatus(", capture_fixture)
        self.assertIn("event.response.status", capture_fixture)
        self.assertIn("countNetwork304", capture_fixture)
        self.assertIn("request.timing().startTime", capture_fixture)
        self.assertIn("event.wallTime * 1000", capture_fixture)
        self.assertIn("cdp_response_sources=", capture_fixture)
        self.assertIn("cdp_cache_sources=", capture_fixture)
        self.assertIn("body_unavailable_by_cache_source=", capture_fixture)
        self.assertIn("cdp_timing_delta_summary=", capture_fixture)
        self.assertIn("cdp_temporal_cache_sources=", capture_fixture)
        self.assertIn("body_unavailable_by_temporal_cache_source=", capture_fixture)
        self.assertIn("bodyless_cache_candidate_extra_info=", capture_fixture)
        self.assertIn("wire_304_responses=", capture_fixture)
        self.assertIn("wire_304_ambiguous=", capture_fixture)
        self.assertIn("cdp_extra_info_missing=", capture_fixture)
        self.assertIn("cdp_extra_info_unexpected=", capture_fixture)
        self.assertIn("cdp_extra_info_unexpected_expected_false=", capture_fixture)
        self.assertIn("cdp_extra_info_unmatched=", capture_fixture)
        self.assertIn("cdp_extra_info_drain_complete=", capture_fixture)
        self.assertIn("cache_evidence_ambiguous=", capture_fixture)
        self.assertIn("cache_skipped=", capture_fixture)
        self.assertIn("body_unavailable_cache_skipped=", capture_fixture)
        self.assertIn('cache_skipped: cacheSkipped', capture_fixture)
        self.assertIn("metadata_missing", capture_fixture)
        self.assertIn("ambiguous", capture_fixture)

        diagnostic = re.search(
            r"console\.info\(\s*`([^`]*)`\s*\)", capture_fixture, re.DOTALL
        )
        self.assertIsNotNone(diagnostic)
        message = diagnostic.group(1)
        for forbidden in (
            "requestId",
            "request.url",
            "response.url",
            "headers",
            "event.",
            "wallTimeMs",
            "startTimeMs",
        ):
            self.assertNotIn(forbidden, message)

    def test_zap_analyzer_is_pinned_passive_offline_and_has_no_published_interface(self) -> None:
        compose = self.require_text(
            "docker-compose-security-e2e.yml",
            "The disposable security E2E composition is missing.",
        )
        policy = self.require_text(
            ".github/quality/zap/passive-policy.json",
            "The passive ZAP policy is missing.",
        )
        checker = self.require_text(
            ".github/scripts/check_zap_passive.py",
            "The passive ZAP collector is missing.",
        )

        zap = compose.split("\n  zap-passive:\n", 1)[1].split("\nvolumes:", 1)[0]
        self.assertRegex(zap, r"(?m)^    image: ghcr\.io/zaproxy/zaproxy:stable@sha256:[0-9a-f]{64}$")
        self.assertIn("network_mode: none", zap)
        self.assertNotIn("ports:", zap)
        self.assertIn("- 127.0.0.1", zap)
        self.assertIn("api.addrs.addr.regex=false", zap)
        self.assertNotIn("spider", zap.lower())
        self.assertNotIn("activeScan", zap)
        self.assertIn('"passive_only": true', policy)
        self.assertIn('"send_requests": false', policy)
        self.assertIn('"risk": "High"', policy)
        self.assertIn('"confidence": "High"', policy)
        self.assertIn('"owner": "CI quality maintainer"', policy)
        self.assertIn('"sendRequests": "false"', checker)
        self.assertIn('"docker", "rm", "--force", container_id', checker)
        self.assertIn('"status": "inconclusive"', checker)
        self.assertIn('"url"', checker)

    def test_security_smoke_asserts_real_proxy_headers_and_api_response(self) -> None:
        smoke = self.require_text(
            "frontend/e2e/infra/security-smoke.e2e.ts",
            "The security smoke spec is missing.",
        )
        helper = self.require_text(
            "frontend/e2e/infra/security-e2e-data.ts",
            "The isolated security E2E data helper is missing.",
        )

        self.assertIn("content-security-policy", smoke)
        self.assertIn("protectedApiPath", smoke)
        self.assertIn("credentials: 'omit'", smoke)
        self.assertIn("apiResult.status).toBe(401)", smoke)
        self.assertIn("contentSecurityPolicy).toBe(", smoke)
        self.assertIn("allowOrigin).toBeNull()", smoke)
        self.assertRegex(smoke, r"expect\s*\.poll")
        self.assertIn("https://localhost", helper)
        self.assertIn("/api/", helper)
        self.assertNotRegex(smoke, r"(?i)bearer\s+|password\s*=|access.?token")


if __name__ == "__main__":
    unittest.main()
