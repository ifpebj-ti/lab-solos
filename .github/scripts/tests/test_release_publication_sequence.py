import unittest
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).parents[1]))
from release_publication_sequence import plan_publication


SHA = "a" * 40
OTHER_SHA = "b" * 40
INDEX = "sha256:" + "1" * 64
PLATFORMS = {
    "linux/amd64": "sha256:" + "2" * 64,
    "linux/arm64": "sha256:" + "3" * 64,
}
WORKFLOW = Path(__file__).parents[3] / ".github" / "workflows" / "container-release.yml"


def intent(*, run_id="100", version="1.2.3", sha=SHA, release="true"):
    return {
        "repository": "ifpebj-ti/lab-solos",
        "run_id": run_id,
        "event": "workflow_dispatch",
        "sha": sha,
        "release": release,
        "version": version if release == "true" else "",
        "change_type": "dispatch" if release == "true" else "outros",
    }


def proof(identity):
    return {
        "repository": identity["repository"],
        "run_id": identity["run_id"],
        "event": identity["event"],
        "version": identity["version"],
        "sha": identity["sha"],
        "change_type": identity["change_type"],
        "release": identity["release"],
        "images": {
            component: {"index_digest": INDEX, "platforms": PLATFORMS}
            for component in ("frontend", "backend")
        },
    }


def channels(git="missing", release="missing", frontend="missing", backend="missing"):
    return {
        "git": {"status": git},
        "release": {"status": release},
        "frontend": {"status": frontend},
        "backend": {"status": backend},
    }


def latest(status="missing", *, matches_target=False):
    return {
        component: {
            "status": status,
            "index_digest": INDEX if matches_target else "sha256:" + "4" * 64,
        }
        for component in ("frontend", "backend")
    }


class ReleasePublicationSequenceTests(unittest.TestCase):
    def plan(self, identity, observations, manifest=None):
        return plan_publication(identity, observations, manifest)

    def test_initial_publication_allows_only_the_missing_channels_and_latest_tags(self):
        result = self.plan(
            intent(),
            {
                "channels": channels(),
                "latest_version": None,
                "latest": latest(),
            },
        )

        self.assertEqual("publish", result["mode"])
        self.assertEqual([], result["recover_channels"])
        self.assertEqual("promote", result["latest_action"])
        self.assertEqual(["frontend", "backend"], result["promote_latest"])

    def test_other_change_type_skips_without_channel_writes(self):
        result = self.plan(
            intent(release="false"),
            {"channels": channels(), "latest_version": None, "latest": latest()},
        )

        self.assertEqual("skip", result["mode"])
        self.assertEqual([], result["recover_channels"])
        self.assertEqual("none", result["latest_action"])

    def test_repeated_identical_publication_is_read_only(self):
        identity = intent()
        result = self.plan(
            identity,
            {
                "channels": channels("consistent", "consistent", "consistent", "consistent"),
                "latest_version": "1.2.3",
                "latest": latest("present", matches_target=True),
            },
            proof(identity),
        )

        self.assertEqual("verify", result["mode"])
        self.assertEqual([], result["recover_channels"])
        self.assertEqual("verify", result["latest_action"])
        self.assertEqual([], result["promote_latest"])

    def test_old_release_reexecution_preserves_a_newer_latest(self):
        identity = intent(version="1.2.3")
        result = self.plan(
            identity,
            {
                "channels": channels("consistent", "consistent", "consistent", "consistent"),
                "latest_version": "1.3.0",
                "latest": latest("present"),
            },
            proof(identity),
        )

        self.assertEqual("verify", result["mode"])
        self.assertEqual("preserve-newer", result["latest_action"])
        self.assertEqual([], result["promote_latest"])

    def test_partial_publication_recovers_only_missing_channels_from_matching_proof(self):
        identity = intent()
        result = self.plan(
            identity,
            {
                "channels": channels("consistent", "draft", "consistent", "missing"),
                "latest_version": "1.2.2",
                "latest": {
                    "frontend": {"status": "present", "index_digest": "sha256:" + "4" * 64},
                    "backend": {"status": "present", "index_digest": "sha256:" + "5" * 64},
                },
            },
            proof(identity),
        )

        self.assertEqual("resume", result["mode"])
        self.assertEqual(["backend"], result["recover_channels"])
        self.assertEqual("promote", result["latest_action"])
        self.assertEqual(["frontend", "backend"], result["promote_latest"])

    def test_conflicting_channel_stops_before_any_write(self):
        identity = intent()
        result = self.plan(
            identity,
            {
                "channels": channels("consistent", "consistent", "conflict", "missing"),
                "latest_version": "1.2.2",
                "latest": latest("present"),
            },
            proof(identity),
        )

        self.assertEqual("stop", result["mode"])
        self.assertEqual([], result["recover_channels"])
        self.assertEqual("none", result["latest_action"])

    def test_incomplete_query_and_ambiguous_write_stop_without_retry(self):
        identity = intent()
        result = self.plan(
            identity,
            {
                "channels": channels("consistent", "inconclusive", "consistent", "consistent"),
                "latest_version": "1.2.2",
                "latest": latest("present"),
            },
            proof(identity),
        )

        self.assertEqual("stop", result["mode"])
        self.assertEqual("none", result["latest_action"])
        self.assertIn("inconclusive", result["reason"])

    def test_wrong_proof_identity_stops_recovery(self):
        identity = intent()
        manifest = proof(identity)
        manifest["sha"] = OTHER_SHA
        result = self.plan(
            identity,
            {
                "channels": channels("consistent", "draft", "consistent", "missing"),
                "latest_version": "1.2.2",
                "latest": latest("present"),
            },
            manifest,
        )

        self.assertEqual("stop", result["mode"])
        self.assertEqual([], result["recover_channels"])

    def test_same_version_with_divergent_latest_is_a_collision(self):
        identity = intent()
        result = self.plan(
            identity,
            {
                "channels": channels("consistent", "consistent", "consistent", "consistent"),
                "latest_version": "1.2.3",
                "latest": latest("present"),
            },
            proof(identity),
        )

        self.assertEqual("stop", result["mode"])
        self.assertIn("latest", result["reason"])


class ReleasePublicationWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = WORKFLOW.read_text(encoding="utf-8")
        cls.jobs = yaml.safe_load(cls.text)["jobs"]

    @staticmethod
    def step(job, fragment):
        matches = [
            step for step in job["steps"]
            if fragment in step.get("name", "")
            or fragment in step.get("run", "")
            or fragment in step.get("with", {}).get("name", "")
        ]
        if len(matches) != 1:
            raise AssertionError(f"expected one step matching {fragment!r}, got {len(matches)}")
        return matches[0]

    def test_release_intent_uses_the_original_run_and_attempt_and_is_retained(self):
        prepare = self.jobs["prepare"]
        resolve = self.step(prepare, "resolve_container_version.py")
        script = resolve["run"]
        for argument in ("--repository", "--run-id", "--run-attempt", "--sha", "--intent-file"):
            with self.subTest(argument=argument):
                self.assertIn(argument, script)
        self.assertIn("release-intent-", self.text)
        self.assertRegex(self.text, r"(?s)release-intent-.*?retention-days:\s*90")
        self.assertIn("Restore the original release intent", self.text)
        restore = self.step(prepare, "Restore the original release intent")["run"]
        self.assertIn("for ((previous_attempt = RUN_ATTEMPT - 1; previous_attempt >= 1; previous_attempt--))", restore)
        self.assertIn('"release-proof-${previous_attempt}"', restore)

    def test_verified_image_digests_are_persisted_as_a_release_proof(self):
        promote = self.jobs["promote-version"]
        verify = self.step(promote, "Verify both version manifests")
        upload = self.step(promote, "release-proof-")
        self.assertLess(promote["steps"].index(verify), promote["steps"].index(upload))
        self.assertIn("release-proof.json", upload.get("with", {}).get("path", ""))
        self.assertEqual(90, upload.get("with", {}).get("retention-days"))
        self.assertIn("release-proof", self.text.split("  finalize-release:", 1)[1])

    def test_publication_planner_runs_after_observations_and_before_any_write(self):
        finalize = self.jobs["finalize-release"]
        run = self.step(finalize, "release_publication_sequence.py")
        script = run["run"]
        self.assertIn("--input", script)
        self.assertIn("--output", script)
        self.assertIn("--proof .tmp/release-proof.json", script)
        self.assertIn('plan["mode"] == "stop"', script)
        planner_index = finalize["steps"].index(run)
        recovery = self.step(finalize, "Recover only proven missing version channels")
        execution = self.step(finalize, "Plan and execute the verified sequence")
        self.assertLess(planner_index, finalize["steps"].index(recovery))
        self.assertLess(finalize["steps"].index(recovery), finalize["steps"].index(execution))
        self.assertIn("digests['linux/amd64']", recovery["run"])
        self.assertIn("gh release create", recovery["run"])
        self.assertIn("Git tag changed after planning", recovery["run"])
        self.assertIn("version tag changed after planning", recovery["run"])
        first_write = finalize["steps"].index(recovery)
        self.assertLess(planner_index, first_write)
        self.assertIn("frontend", script)
        self.assertIn("backend", script)
        self.assertIn("git", script)
        self.assertIn("release", script)

    def test_release_proof_asset_precedes_latest_and_stable_release_is_last_write(self):
        finalize = self.jobs["finalize-release"]
        recovery = self.step(finalize, "Recover only proven missing version channels")
        script = self.step(finalize, "Plan and execute the verified sequence")["run"]
        publish = self.step(finalize, "Verify release draft and version channels before stable publication")
        publish_script = publish["run"]
        self.assertIn("--draft", recovery["run"])
        self.assertIn("gh release upload", recovery["run"])
        first_latest = script.index('imagetools create --tag "$FRONTEND_LATEST"')
        self.assertNotIn("PATCH", script)
        check = publish_script.index("check_release_channels.py")
        publish_write = publish_script.index("--method PATCH")
        self.assertLess(check, publish_write)
        self.assertIn('"git", "frontend", "backend"', publish_script)
        verify = self.step(finalize, "Verify all four release channels after publication")
        self.assertLess(finalize["steps"].index(recovery), finalize["steps"].index(verify))
        self.assertLess(finalize["steps"].index(self.step(finalize, "Plan and execute the verified sequence")),
                        finalize["steps"].index(publish))
        self.assertLess(finalize["steps"].index(publish), finalize["steps"].index(verify))
        self.assertIn("release-proof.json", recovery["run"])

    def test_preserve_newer_plan_cannot_execute_a_latest_write(self):
        finalize = self.jobs["finalize-release"]
        script = self.step(finalize, "Plan and execute the verified sequence")["run"]
        self.assertEqual('${{ steps.plan.outputs.latest_action }}',
                         self.step(finalize, "Plan and execute the verified sequence")["env"]["LATEST_ACTION"])
        self.assertIn('if [[ "$LATEST_ACTION" == "preserve-newer" ]]; then', script)
        self.assertIn('"$FRONTEND_STATE" == needs-promotion && "$PROMOTE_FRONTEND" == true', script)
        self.assertIn('"$BACKEND_STATE" == needs-promotion && "$PROMOTE_BACKEND" == true', script)
        self.assertIn("STABLE_LATEST_VERSION", script)
        self.assertIn("A newer stable release appeared after planning", script)
        self.assertIn("PROMOTE_FRONTEND=false", script)
        self.assertIn("PROMOTE_BACKEND=false", script)


if __name__ == "__main__":
    unittest.main()
