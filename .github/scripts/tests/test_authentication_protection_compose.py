from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[3]


def service_block(document: str, service_name: str) -> str:
    lines = document.splitlines()
    start = next(
        index for index, line in enumerate(lines)
        if re.fullmatch(rf"  {re.escape(service_name)}:", line)
    )
    end = next(
        (
            index for index in range(start + 1, len(lines))
            if re.match(r"^  [A-Za-z0-9_-]+:", lines[index])
        ),
        len(lines),
    )
    return "\n".join(lines[start:end])


class AuthenticationProtectionComposeTests(unittest.TestCase):
    def setUp(self):
        self.prod = (ROOT / "docker-compose-prod.yml").read_text(encoding="utf-8")
        self.dev = (ROOT / "docker-compose-dev.yml").read_text(encoding="utf-8")
        self.e2e = (ROOT / "docker-compose-e2e.yml").read_text(encoding="utf-8")
        self.prod_env = (ROOT / ".env.prod.example").read_text(encoding="utf-8")
        self.dev_env = (ROOT / ".env.example").read_text(encoding="utf-8")

    def test_production_pins_caddy_proxy_and_does_not_publish_the_api(self):
        proxy = service_block(self.prod, "proxy")
        backend = service_block(self.prod, "backend")

        self.assertIn("ipv4_address: ${CADDY_PROXY_IP", proxy)
        self.assertIn("subnet: ${PUBLIC_NETWORK_SUBNET", self.prod)
        self.assertIn("ip_range: ${PUBLIC_NETWORK_DYNAMIC_RANGE", self.prod)
        self.assertIn(
            "AuthenticationProtection__ForwardedHeaders__KnownProxies__0: ${CADDY_PROXY_IP",
            backend,
        )
        self.assertNotRegex(backend, r"(?m)^\s+ports:")
        self.assertRegex(backend, r"(?m)^\s+expose:\s*\n\s+- ['\"]?8080")

    def test_production_proxy_is_outside_the_dynamic_allocation_range(self):
        import ipaddress
        values = dict(
            line.split("=", 1) for line in self.prod_env.splitlines()
            if line and not line.startswith("#")
        )
        subnet = ipaddress.ip_network(values["PUBLIC_NETWORK_SUBNET"])
        dynamic = ipaddress.ip_network(values["PUBLIC_NETWORK_DYNAMIC_RANGE"])
        proxy = ipaddress.ip_address(values["CADDY_PROXY_IP"])
        self.assertTrue(dynamic.subnet_of(subnet))
        self.assertIn(proxy, subnet)
        self.assertNotIn(proxy, dynamic)

    def test_secret_files_are_mounted_read_only_with_path_only_examples(self):
        backend = service_block(self.prod, "backend")

        self.assertIn("AuthenticationProtection__KeyHashSecretFile: /run/secrets/authentication-throttle-key", backend)
        self.assertIn(
            "AuthenticationProtection__RecoveryEncryptionKeysFile: /run/secrets/recovery-encryption-keys.json",
            backend,
        )
        for target in (
            "/run/secrets/authentication-throttle-key",
            "/run/secrets/recovery-encryption-keys.json",
        ):
            target_position = backend.index(f"target: {target}")
            self.assertIn("read_only: true", backend[target_position:target_position + 120])

        for document in (self.prod_env, self.dev_env):
            self.assertRegex(document, r"(?m)^AUTHENTICATION_THROTTLE_KEY_FILE=.+$")
            self.assertRegex(document, r"(?m)^RECOVERY_ENCRYPTION_KEYS_FILE=.+$")
            for name in ("JWT_KEY", "EMAIL_SENHA", "DB_PASSWORD"):
                match = re.search(rf"(?m)^{name}=(.*)$", document)
                self.assertIsNotNone(match)
                self.assertTrue(match.group(1).startswith("SUBSTITUA_"))

    def test_production_mounts_the_security_snippet_imported_by_caddy(self):
        proxy = service_block(self.prod, "proxy")
        caddy = (ROOT / "Caddyfile").read_text(encoding="utf-8")
        self.assertIn("import infra/proxy/security-headers.caddy", caddy)
        self.assertIn(
            "./infra/proxy/security-headers.caddy:/etc/caddy/infra/proxy/security-headers.caddy:ro",
            proxy,
        )

    def test_development_and_e2e_configure_exact_origins_and_trusted_proxy(self):
        dev_backend = service_block(self.dev, "backend")
        e2e_backend = service_block(self.e2e, "backend")

        self.assertIn("AuthenticationProtection__ForwardedHeaders__KnownProxies__0=127.0.0.1", dev_backend)
        self.assertIn("AuthenticationProtection__Cors__DevelopmentOrigins__0=", dev_backend)
        self.assertIn("AuthenticationProtection__Cors__DevelopmentOrigins__1=", dev_backend)
        self.assertIn("AuthenticationProtection__KeyHashSecretFile=/run/secrets/authentication-throttle-key", dev_backend)
        self.assertIn("AuthenticationProtection__RecoveryEncryptionKeysFile=/run/secrets/recovery-encryption-keys.json", dev_backend)

        self.assertIn("AuthenticationProtection__ForwardedHeaders__KnownProxies__0:", e2e_backend)
        self.assertIn("AuthenticationProtection__Cors__DevelopmentOrigins__0: http://127.0.0.1:4173", e2e_backend)
        self.assertIn("AuthenticationProtection__KeyHashSecretFile: /run/secrets/authentication-throttle-key", e2e_backend)
        self.assertIn("AuthenticationProtection__RecoveryEncryptionKeysFile: /run/secrets/recovery-encryption-keys.json", e2e_backend)
        self.assertIn("e2e_smtp_certs:/run/secrets:ro", e2e_backend)

    def test_e2e_generates_only_ephemeral_synthetic_authentication_keys(self):
        generator = service_block(self.e2e, "smtp-cert")

        self.assertIn("authentication-throttle-key", generator)
        self.assertIn("recovery-encryption-keys.json", generator)
        self.assertIn("e2e_smtp_certs:/certs", generator)
        self.assertRegex(self.e2e, r"(?m)^\s+condition: service_completed_successfully$")


if __name__ == "__main__":
    unittest.main()
