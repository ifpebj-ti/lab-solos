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
        self.assertIn("@api path /api/*", proxy)
        self.assertIn("reverse_proxy api:8080", proxy)
        self.assertIn("import /etc/caddy/security-headers.caddy", proxy)
        self.assertIn("import frontend_content_security_policy", proxy)
        self.assertRegex(proxy, r"(?s)@api path /api/\*.*?handle @api.*?reverse_proxy api:8080")
        self.assertNotRegex(proxy, r"(?s)@api path /api/\*.*?handle @api[^}]*frontend_content_security_policy")

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
        self.assertIn("contentSecurityPolicy).toBeNull()", smoke)
        self.assertIn("allowOrigin).toBeNull()", smoke)
        self.assertRegex(smoke, r"expect\s*\.poll")
        self.assertIn("https://localhost", helper)
        self.assertIn("/api/", helper)
        self.assertNotRegex(smoke, r"(?i)bearer\s+|password\s*=|access.?token")


if __name__ == "__main__":
    unittest.main()
