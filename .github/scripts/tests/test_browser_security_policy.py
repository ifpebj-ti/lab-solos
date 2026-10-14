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
    def test_production_frontend_has_one_csp_and_api_branch_is_separate(self):
        main, combined = read_caddy_sources()
        csp_values = re.findall(r'Content-Security-Policy\s+"([^"]+)"', combined)

        self.assertEqual(len(csp_values), 1, "deve existir uma única política CSP de produção")
        self.assertIn("handle @api", main)
        self.assertIn("handle {", main)
        self.assertEqual(main.count("import frontend_content_security_policy"), 1)
        self.assertIn("import common_security_headers", main)
        api_start = main.index("handle @api")
        frontend_start = main.index("handle {", api_start)
        api_branch = main[api_start:frontend_start]
        frontend_branch = main[frontend_start:]
        self.assertIn("reverse_proxy backend:8080", api_branch)
        self.assertNotIn("frontend_content_security_policy", api_branch)
        self.assertIn("import frontend_content_security_policy", frontend_branch)

    def test_policy_allows_only_inventoried_sources_and_restricts_active_content(self):
        _, combined = read_caddy_sources()
        csp_values = re.findall(r'Content-Security-Policy\s+"([^"]+)"', combined)
        self.assertEqual(len(csp_values), 1, "deve existir uma única política CSP de produção")
        policy = parse_policy(csp_values[0])
        self.assertEqual(policy, EXPECTED_POLICY)

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

    def test_frontend_nginx_has_no_competing_policy(self):
        nginx = (ROOT / "frontend" / "nginx.conf").read_text(encoding="utf-8")
        self.assertNotRegex(nginx, r"(?i)Content-Security-Policy")


if __name__ == "__main__":
    unittest.main()
