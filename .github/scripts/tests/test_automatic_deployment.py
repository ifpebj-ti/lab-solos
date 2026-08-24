import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
COMPOSE = ROOT / "docker-compose-prod.yml"
DEPLOY = ROOT / "infra" / "oci" / "scripts" / "deploy-release.sh"
UPDATER = ROOT / "infra" / "oci" / "scripts" / "update-from-github.sh"
SERVICE = ROOT / "infra" / "oci" / "systemd" / "labon-update.service"
TIMER = ROOT / "infra" / "oci" / "systemd" / "labon-update.timer"


class AutomaticDeploymentTests(unittest.TestCase):
    def test_compose_uses_versioned_ghcr_images_without_local_builds(self):
        text = COMPOSE.read_text(encoding="utf-8")
        self.assertIn("ghcr.io/ifpebj-ti/lab-solos-frontend", text)
        self.assertIn("ghcr.io/ifpebj-ti/lab-solos-backend", text)
        self.assertEqual(text.count("LABON_IMAGE_VERSION:?"), 2)
        self.assertNotIn("build:", text)
        self.assertIn("pg_data:/var/lib/postgresql/data", text)

    def test_deploy_validates_both_images_before_changing_containers(self):
        text = DEPLOY.read_text(encoding="utf-8")
        first_up = text.index("compose up -d")
        self.assertLess(text.index('docker manifest inspect "${frontend_image}:${target_version}"'), first_up)
        self.assertLess(text.index('docker manifest inspect "${backend_image}:${target_version}"'), first_up)
        self.assertIn("flock -n 9", text)

    def test_deploy_has_health_gate_and_rollback(self):
        text = DEPLOY.read_text(encoding="utf-8")
        self.assertIn("wait_until_healthy", text)
        self.assertIn("/api/System/health", text)
        self.assertIn("trap rollback ERR", text)
        self.assertIn('export LABON_IMAGE_VERSION="$previous_version"', text)
        health_gate = text.rindex("wait_until_healthy")
        state_write = text.rindex("printf '%s\\n' \"$target_version\" > \"$state_file\"")
        self.assertLess(health_gate, state_write)

    def test_updater_only_consumes_latest_stable_release(self):
        text = UPDATER.read_text(encoding="utf-8")
        self.assertIn("/releases/latest", text)
        self.assertIn(".tag_name", text)
        self.assertIn('exec "$deploy_script" "$latest_version"', text)
        self.assertNotIn(":latest", text)

    def test_systemd_runs_as_unprivileged_user_on_a_timer(self):
        service = SERVICE.read_text(encoding="utf-8")
        timer = TIMER.read_text(encoding="utf-8")
        self.assertIn("User=ubuntu", service)
        self.assertIn("SupplementaryGroups=docker", service)
        self.assertIn("NoNewPrivileges=true", service)
        self.assertIn("OnUnitActiveSec=5min", timer)
        self.assertIn("Persistent=true", timer)


if __name__ == "__main__":
    unittest.main()
