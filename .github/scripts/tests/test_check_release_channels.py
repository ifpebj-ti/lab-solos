from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from test_validate_container_manifest import descriptor, index


SCRIPT = Path(__file__).parents[1] / "check_release_channels.py"
REPOSITORY = "example/lab-solos"
VERSION = "2.7.5"
SHA = "a" * 40
OTHER_SHA = "b" * 40
RELEASE_URL = f"https://github.com/{REPOSITORY}/releases/tag/{VERSION}"
REVISION = "org.opencontainers.image.revision"


def digest(character: str) -> str:
    return f"sha256:{character * 64}"


def image(module: str, index_hash: str) -> dict:
    return {
        "status": "present",
        "reference": f"ghcr.io/{REPOSITORY}-{module}:{VERSION}",
        "index_digest": digest(index_hash),
        "manifest": index(descriptor("linux/amd64", "1"), descriptor("linux/arm64", "2")),
        "labels": {digest("1"): {REVISION: SHA}, digest("2"): {REVISION: SHA}},
    }


def evidence() -> dict:
    return {
        "git": {
            "status": "present",
            "ref": f"refs/tags/{VERSION}",
            "object_type": "commit",
            "object_id": SHA,
        },
        "release": {
            "status": "present",
            "tagName": VERSION,
            "targetCommitish": "main",
            "isDraft": False,
            "isPrerelease": False,
            "publishedAt": "2026-11-10T12:00:00Z",
            "url": RELEASE_URL,
        },
        "frontend": image("frontend", "3"),
        "backend": image("backend", "4"),
    }


def proof() -> dict:
    return {
        "repository": REPOSITORY,
        "version": VERSION,
        "sha": SHA,
        "images": {
            module: {
                "index_digest": digest(index_hash),
                "platforms": {"linux/amd64": digest("1"), "linux/arm64": digest("2")},
            }
            for module, index_hash in (("frontend", "3"), ("backend", "4"))
        },
    }


class ReleaseChannelTests(unittest.TestCase):
    def verify(self, observed: dict, *, expected: dict | None = None) -> tuple[int, dict]:
        with tempfile.TemporaryDirectory() as temp:
            observations_path = Path(temp) / "observations.json"
            observations_path.write_text(json.dumps(observed), encoding="utf-8")
            command = [
                sys.executable, str(SCRIPT), "--repository", REPOSITORY,
                "--version", VERSION, "--sha", SHA, "--observations", str(observations_path),
            ]
            if expected is not None:
                proof_path = Path(temp) / "proof.json"
                proof_path.write_text(json.dumps(expected), encoding="utf-8")
                command.extend(["--proof", str(proof_path)])
            result = subprocess.run(
                command, capture_output=True, text=True, encoding="utf-8", timeout=10,
            )
        self.assertTrue(result.stdout, result.stderr)
        return result.returncode, json.loads(result.stdout)

    def test_confirms_four_channels_using_git_commit_not_release_target_branch(self):
        exit_code, report = self.verify(evidence(), expected=proof())

        self.assertEqual(0, exit_code)
        self.assertEqual(VERSION, report["version"])
        self.assertEqual(SHA, report["sha"])
        self.assertEqual(
            ["consistent"] * 4,
            [report["channels"][name]["status"] for name in ("git", "release", "frontend", "backend")],
        )
        self.assertEqual(RELEASE_URL, report["channels"]["release"]["url"])
        self.assertEqual(digest("3"), report["channels"]["frontend"]["index_digest"])
        self.assertEqual(
            digest("2"), report["channels"]["frontend"]["platforms"]["linux/arm64"],
        )

    def test_annotated_tag_releases_point_to_the_peeled_commit(self):
        observed = evidence()
        observed["git"].update(
            object_type="tag", object_id=OTHER_SHA, peeled_type="commit", peeled_id=SHA,
        )
        exit_code, report = self.verify(observed, expected=proof())

        self.assertEqual(0, exit_code)
        self.assertEqual(SHA, report["channels"]["git"]["commit"])

    def test_reports_conflicting_git_target_and_non_commit_annotation(self):
        for target, message in (
            ({"object_id": OTHER_SHA}, "commit_mismatch"),
            ({"object_type": "tag", "peeled_type": "tree", "peeled_id": SHA}, "not_commit"),
        ):
            with self.subTest(target=target):
                observed = evidence()
                observed["git"].update(target)
                exit_code, report = self.verify(observed, expected=proof())
                channel = report["channels"]["git"]

                self.assertEqual(1, exit_code)
                self.assertEqual("conflict", channel["status"])
                self.assertEqual(message, channel["reason"])

    def test_release_missing_draft_or_prerelease_cannot_confirm_stable_version(self):
        for change, status, reason in (
            ({"status": "missing"}, "missing", "reference_missing"),
            ({"isDraft": True}, "conflict", "draft"),
            ({"isPrerelease": True}, "conflict", "prerelease"),
            ({"tagName": f"v{VERSION}"}, "conflict", "reference_mismatch"),
        ):
            with self.subTest(change=change):
                observed = evidence()
                observed["release"].update(change)
                exit_code, report = self.verify(observed, expected=proof())
                channel = report["channels"]["release"]

                self.assertEqual(1, exit_code)
                self.assertEqual(status, channel["status"])
                self.assertEqual(reason, channel["reason"])

    def test_keeps_missing_image_separate_from_unavailable_query_and_omits_raw_errors(self):
        observed = evidence()
        observed["frontend"] = {"status": "missing"}
        observed["backend"] = {"status": "unavailable", "error": "token=secret"}
        exit_code, report = self.verify(observed, expected=proof())

        self.assertEqual(2, exit_code)
        self.assertEqual("missing", report["channels"]["frontend"]["status"])
        self.assertEqual("inconclusive", report["channels"]["backend"]["status"])
        self.assertNotIn("secret", json.dumps(report))

    def test_rejects_changed_digest_even_when_oci_revision_labels_match(self):
        cases = (
            ("index", "index_digest_mismatch"),
            ("platform", "platform_digest_mismatch"),
        )
        for changed, reason in cases:
            with self.subTest(changed=changed):
                observed = evidence()
                if changed == "index":
                    observed["frontend"]["index_digest"] = digest("8")
                else:
                    observed["frontend"]["manifest"]["manifests"][0]["digest"] = digest("8")
                    observed["frontend"]["labels"][digest("8")] = {REVISION: SHA}
                exit_code, report = self.verify(observed, expected=proof())

                self.assertEqual(1, exit_code)
                self.assertEqual(reason, report["channels"]["frontend"]["reason"])

    def test_rejects_wrong_revision_or_platform_set_before_comparing_digest(self):
        for changed, reason in (
            ("revision", "revision_mismatch"),
            ("platforms", "invalid_platforms"),
        ):
            with self.subTest(changed=changed):
                observed = evidence()
                if changed == "revision":
                    observed["backend"]["labels"][digest("2")][REVISION] = OTHER_SHA
                else:
                    observed["backend"]["manifest"]["manifests"].pop()
                exit_code, report = self.verify(observed, expected=proof())

                self.assertEqual(1, exit_code)
                self.assertEqual(reason, report["channels"]["backend"]["reason"])

    def test_missing_labels_keep_image_inconclusive(self):
        observed = evidence()
        observed["frontend"]["labels"].pop(digest("2"))
        exit_code, report = self.verify(observed, expected=proof())

        self.assertEqual(2, exit_code)
        self.assertEqual("inconclusive", report["channels"]["frontend"]["status"])

    def test_historical_release_without_independent_image_proof_stays_unverifiable(self):
        exit_code, report = self.verify(evidence())

        self.assertEqual(2, exit_code)
        self.assertEqual("unverifiable", report["channels"]["frontend"]["status"])
        self.assertEqual("unverifiable", report["channels"]["backend"]["status"])

    def test_proof_for_different_version_or_sha_cannot_verify_a_release(self):
        for field, value in (
            ("repository", "different/lab-solos"), ("version", "2.7.6"), ("sha", OTHER_SHA),
        ):
            with self.subTest(field=field):
                expected = proof()
                expected[field] = value
                exit_code, report = self.verify(evidence(), expected=expected)

                self.assertEqual(1, exit_code)
                self.assertEqual("proof_identity_mismatch", report["channels"]["frontend"]["reason"])

    def test_release_commitish_cannot_replace_incomplete_git_peel(self):
        observed = evidence()
        observed["git"]["object_type"] = "tag"
        observed["release"]["targetCommitish"] = SHA
        exit_code, report = self.verify(observed, expected=proof())

        self.assertEqual(2, exit_code)
        self.assertEqual("tag_peel_incomplete", report["channels"]["git"]["reason"])
        self.assertEqual("tag_unconfirmed", report["channels"]["release"]["reason"])

    def test_omits_unverified_release_url_from_diagnostics(self):
        observed = evidence()
        observed["release"]["url"] = f"{RELEASE_URL}?token=secret"
        exit_code, report = self.verify(observed, expected=proof())

        self.assertEqual(2, exit_code)
        self.assertEqual("release_url_unconfirmed", report["channels"]["release"]["reason"])
        self.assertNotIn("secret", json.dumps(report))


if __name__ == "__main__":
    unittest.main()
