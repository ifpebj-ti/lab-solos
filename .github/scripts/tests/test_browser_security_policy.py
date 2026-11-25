import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
EXPECTED_POLICY = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'wasm-unsafe-eval'"],
    "script-src-attr": ["'none'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", "data:"],
    "object-src": ["'none'"],
    "base-uri": ["'none'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'self'"],
    "frame-src": ["'none'"],
    "worker-src": ["'none'"],
}
EXPECTED_API_POLICY = {
    "default-src": ["'none'"],
    "base-uri": ["'none'"],
    "form-action": ["'none'"],
    "frame-ancestors": ["'none'"],
}
EXPECTED_API_PERMISSIONS_POLICY = "camera=(), geolocation=(), microphone=()"


def read_caddy_sources():
    caddyfile = ROOT / "Caddyfile"
    main = caddyfile.read_text(encoding="utf-8")
    imported = []
    for relative_path in re.findall(
        r"(?m)^\s*import\s+(infra/[\w./-]+\.caddy)(?:\s+#.*)?\s*$", main
    ):
        imported.append((ROOT / relative_path).read_text(encoding="utf-8"))
    return main, "\n".join([main, *imported])


def parse_policy(policy):
    directives = {}
    for directive in policy.split(";"):
        tokens = directive.strip().split()
        if not tokens:
            continue
        name, *sources = tokens
        if name in directives:
            raise AssertionError(f"Diretiva CSP duplicada: {name}")
        directives[name] = sources
    return directives


class BrowserSecurityPolicyTests(unittest.TestCase):
    def test_production_frontend_and_api_have_separate_csp_policies(self):
        main, combined = read_caddy_sources()
        csp_values = re.findall(r'Content-Security-Policy\s+"([^"]+)"', combined)

        self.assertEqual(len(csp_values), 2, "frontend e API devem ter políticas CSP próprias")
        self.assertIn("@api path /api /api/*", main)
        self.assertIn("import api_security_policy", main)
        self.assertIn("handle {", main)
        self.assertEqual(main.count("import frontend_content_security_policy"), 1)
        self.assertIn("import common_security_headers", main)
        api_start = main.index("handle @api")
        frontend_start = main.index("handle {", api_start)
        api_branch = main[api_start:frontend_start]
        frontend_branch = main[frontend_start:]
        self.assertIn("reverse_proxy backend:8080", api_branch)
        self.assertIn("import api_security_policy", api_branch)
        self.assertNotIn("frontend_content_security_policy", api_branch)
        self.assertIn("import frontend_content_security_policy", frontend_branch)

    def test_policy_allows_only_inventoried_sources_and_restricts_active_content(self):
        _, combined = read_caddy_sources()
        csp_values = re.findall(r'Content-Security-Policy\s+"([^"]+)"', combined)
        self.assertEqual(len(csp_values), 2, "frontend e API devem ter políticas CSP próprias")
        policy = parse_policy(csp_values[0])
        self.assertEqual(policy, EXPECTED_POLICY)

        api_policy = parse_policy(csp_values[1])
        self.assertEqual(api_policy, EXPECTED_API_POLICY)

        script_sources = policy["script-src"]
        self.assertIn("'wasm-unsafe-eval'", script_sources)
        self.assertNotIn("'unsafe-eval'", script_sources)
        self.assertNotIn("'unsafe-inline'", script_sources)
        self.assertNotIn("blob:", script_sources)

        all_sources = [source for sources in policy.values() for source in sources]
        self.assertFalse(
            any(re.match(r"(?i)^https?://", source) for source in all_sources),
            "a política não deve autorizar origens HTTP(S)",
        )
        self.assertNotIn("*", all_sources)

    def test_proxy_api_branch_limits_bodies_and_contracts_edge_errors(self):
        main, _ = read_caddy_sources()
        testing = (ROOT / "infra" / "testing" / "Caddyfile.security-e2e").read_text(encoding="utf-8")
        shared = (ROOT / "infra" / "proxy" / "security-headers.caddy").read_text(encoding="utf-8")

        for caddyfile, upstream in ((main, "backend:8080"), (testing, "api:8080")):
            self.assertIn("@api path /api /api/*", caddyfile)
            self.assertIn(f"reverse_proxy {upstream}", caddyfile)
            self.assertIn("import api_security_policy", caddyfile)
            self.assertIn("import api_request_body_limit", caddyfile)
            self.assertIn("import api_proxy_error_contract", caddyfile)
        self.assertIn("path /api/Usuarios /api/Emprestimos", shared)
        self.assertIn("method POST", shared)
        self.assertIn("max_size 1MiB", shared)
        self.assertIn("handle_errors {", shared)
        self.assertIn("{err.status_code} == 413", shared)
        self.assertIn("{err.status_code} in [502, 503, 504]", shared)
        self.assertIn('"status":413,"code":"request_body_too_large"', shared)
        self.assertIn('"status":503,"code":"service_unavailable"', shared)
        self.assertIn("X-Correlation-ID {err.id}", shared)
        self.assertIn('Cache-Control "no-store"', shared)
        self.assertIn(f'Permissions-Policy "{EXPECTED_API_PERMISSIONS_POLICY}"', shared)

    def test_nginx_fallback_serves_role_routes_but_missing_assets_and_other_paths_are_404(self):
        nginx = (ROOT / "frontend" / "nginx.conf").read_text(encoding="utf-8")
        self.assertIn("location = /", nginx)
        self.assertIn("location ~ ^/admin", nginx)
        self.assertIn("location ~ ^/mentor", nginx)
        self.assertIn("location ~ ^/mentee", nginx)
        self.assertIn("location ~ ^/(?:change-password-required|forgot-your-password|reset-password|create-account)", nginx)
        self.assertIn("location ~ ^/(?:boot|pre)/?$", nginx)
        self.assertIn("try_files $uri =404;", nginx)
        self.assertIn("try_files $uri /index.html;", nginx)
        asset_location = nginx.index(r"location ~* \.(?:")
        profile_fallback = r"location ~ ^/(?:admin|mentor|mentee)/"
        self.assertIn(profile_fallback, nginx)
        self.assertLess(asset_location, nginx.index(profile_fallback))
        self.assertIn("location / {\n        try_files $uri =404;", nginx)
        self.assertNotIn("try_files $uri $uri/ /index.html;", nginx)

    def test_frontend_nginx_has_no_competing_policy(self):
        nginx = (ROOT / "frontend" / "nginx.conf").read_text(encoding="utf-8")
        self.assertNotRegex(nginx, r"(?i)Content-Security-Policy")


if __name__ == "__main__":
    unittest.main()
