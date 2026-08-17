import re
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
WORKFLOW = REPOSITORY_ROOT / ".github" / "workflows" / "container-release.yml"


class ContainerReleaseWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = WORKFLOW.read_text(encoding="utf-8") if WORKFLOW.exists() else ""

    def assert_has(self, fragment: str):
        self.assertIn(fragment, self.text)

    def finalization(self):
        match = re.search(
            r"(?ms)^  finalize-release:\n(?P<body>.*?)(?=^  [a-z][a-z-]*:\n|\Z)",
            self.text,
        )
        self.assertIsNotNone(match)
        return match.group("body")

    def test_release_workflow_exists(self):
        self.assertTrue(WORKFLOW.is_file())

    def test_events_are_merged_pull_request_to_main_and_manual_dispatch(self):
        self.assertRegex(self.text, r"(?ms)^on:\n  pull_request:\n    branches:\n      - main\n    types:\n      - closed")
        self.assertRegex(self.text, r"(?ms)  workflow_dispatch:\n    inputs:\n      version:\n        description: .+\n        required: true\n        type: string")
        self.assert_has("github.event.pull_request.merged == true")
        self.assert_has("DISPATCH_REF: ${{ github.ref }}")
        self.assert_has('--ref "$DISPATCH_REF"')

    def test_release_runs_are_serial_and_never_cancelled(self):
        self.assertRegex(
            self.text,
            r"(?ms)^concurrency:\n  group: container-release\n  cancel-in-progress: false$",
        )

    def test_prepare_resolves_version_once_before_registry_writes(self):
        self.assertEqual(self.text.count("resolve_container_version.py"), 1)
        self.assertRegex(self.text, r"(?ms)^  prepare:.*?permissions:\n      contents: read")
        self.assertRegex(self.text, r"(?ms)^  build:\n    needs: prepare\n    if: needs\.prepare\.outputs\.release == 'true'")
        self.assert_has("ref: ${{ steps.source.outputs.sha }}")
        self.assertGreaterEqual(self.text.count("ref: ${{ needs.prepare.outputs.sha }}"), 2)

    def test_permissions_are_isolated_by_job(self):
        self.assertRegex(self.text, r"(?ms)^permissions: \{\}$")
        self.assertRegex(
            self.text,
            r"(?ms)^  build:.*?permissions:\n      contents: read\n      packages: write",
        )
        self.assertRegex(
            self.text,
            r"(?ms)^  scan:.*?permissions:\n      contents: read\n      packages: read\n      security-events: write",
        )
        self.assertRegex(
            self.text,
            r"(?ms)^  promote-version:.*?permissions:\n      contents: read\n      packages: write",
        )
        self.assertRegex(
            self.text,
            r"(?ms)^  finalize-release:.*?permissions:\n      contents: write\n      packages: write",
        )
        self.assertNotIn("packages: delete", self.text)

    def test_build_matrix_contains_exactly_two_components_and_platforms(self):
        build = self.text.split("\n  build:\n", 1)[1].split("\n  scan:\n", 1)[0]
        self.assertEqual(build.count("component: frontend"), 2)
        self.assertEqual(build.count("component: backend"), 2)
        self.assertEqual(build.count("platform: linux/amd64"), 2)
        self.assertEqual(build.count("platform: linux/arm64"), 2)
        self.assertEqual(build.count("image: ghcr.io/ifpebj-ti/lab-solos-frontend"), 2)
        self.assertEqual(build.count("image: ghcr.io/ifpebj-ti/lab-solos-backend"), 2)

    def test_scan_matrix_covers_the_same_four_component_platform_pairs(self):
        scan = self.text.split("\n  scan:\n", 1)[1]
        expected = {
            ("frontend", "linux/amd64", "amd64"),
            ("frontend", "linux/arm64", "arm64"),
            ("backend", "linux/amd64", "amd64"),
            ("backend", "linux/arm64", "arm64"),
        }
        entries = re.findall(
            r"- component: (frontend|backend)\n"
            r"\s+image: ghcr\.io/ifpebj-ti/lab-solos-(?:frontend|backend)\n"
            r"\s+platform: (linux/(?:amd64|arm64))\n"
            r"\s+arch: (amd64|arm64)",
            scan,
        )
        self.assertEqual(set(entries), expected)
        self.assertEqual(len(entries), 4)

    def test_build_pushes_only_canonical_digests_without_attestations(self):
        self.assert_has("push-by-digest=true")
        self.assert_has("name-canonical=true")
        self.assert_has("push=true")
        self.assert_has("provenance: false")
        self.assert_has("sbom: false")
        self.assert_has("DIGEST: ${{ steps.build.outputs.digest }}")
        self.assert_has("printf 'digest=%s\\n' \"$DIGEST\" >> \"$GITHUB_OUTPUT\"")
        self.assertNotRegex(self.text, r"(?m)^\s+tags:")

    def test_four_digests_have_deterministic_artifact_names(self):
        self.assert_has("name: digest-${{ matrix.component }}-${{ matrix.arch }}")
        self.assert_has("${{ matrix.component }}-${{ matrix.arch }}.txt")
        self.assert_has("needs:\n      - prepare\n      - build")

    def test_scan_consumes_immutable_image_reference(self):
        self.assert_has("SCAN_REFERENCE: ${{ matrix.image }}@${{ steps.digest.outputs.digest }}")
        self.assertGreaterEqual(self.text.count('"$SCAN_REFERENCE"'), 3)
        self.assertNotRegex(self.text, r"trivy image[^\n]*:[Ll][Aa][Tt][Ee][Ss][Tt]")

    def test_scan_emits_table_sarif_artifacts_and_a_final_gate(self):
        self.assert_has("--format table")
        self.assert_has("--format sarif")
        self.assert_has("github/codeql-action/upload-sarif@")
        self.assert_has("name: trivy-${{ matrix.component }}-${{ matrix.arch }}")
        self.assert_has("retention-days: 30")
        self.assert_has("--exit-code 1")
        self.assertLess(self.text.index("--format sarif"), self.text.index("--exit-code 1"))

    def test_only_ghcr_authentication_is_present(self):
        self.assertEqual(self.text.count("registry: ghcr.io"), 4)
        self.assert_has("username: ${{ github.actor }}")
        self.assert_has("password: ${{ secrets.GITHUB_TOKEN }}")
        forbidden = ("docker.io", "dockerhub", "docker scout", "azure/login", "container-apps-deploy")
        lowered = self.text.lower()
        for term in forbidden:
            with self.subTest(term=term):
                self.assertNotIn(term, lowered)

    def test_version_promotion_waits_for_every_scan_and_collects_every_digest(self):
        promotion = self.text.split("\n  promote-version:\n", 1)[1]
        self.assertRegex(
            promotion,
            r"(?ms)^    needs:\n      - prepare\n      - scan$",
        )
        self.assert_has("pattern: digest-*")
        self.assert_has("merge-multiple: true")
        for digest_file in (
            "frontend-amd64.txt",
            "frontend-arm64.txt",
            "backend-amd64.txt",
            "backend-arm64.txt",
        ):
            with self.subTest(digest_file=digest_file):
                self.assertIn(digest_file, promotion)

    def test_both_version_tags_use_the_same_semver_and_current_image_names(self):
        promotion = self.text.split("\n  promote-version:\n", 1)[1]
        self.assert_has("VERSION: ${{ needs.prepare.outputs.version }}")
        self.assert_has("FRONTEND_IMAGE: ghcr.io/ifpebj-ti/lab-solos-frontend")
        self.assert_has("BACKEND_IMAGE: ghcr.io/ifpebj-ti/lab-solos-backend")
        self.assert_has('FRONTEND_TAG="${FRONTEND_IMAGE}:${VERSION}"')
        self.assert_has('BACKEND_TAG="${BACKEND_IMAGE}:${VERSION}"')
        self.assertNotIn("-amd64:", promotion)
        self.assertNotIn("-arm64:", promotion)

    def test_collisions_are_checked_for_both_images_before_any_tag_write(self):
        promotion = self.text.split("\n  promote-version:\n", 1)[1]
        first_create = promotion.index("docker buildx imagetools create")
        frontend_check = promotion.index(
            'check_version_tag "$FRONTEND_TAG"'
        )
        backend_check = promotion.index('check_version_tag "$BACKEND_TAG"')
        self.assertLess(frontend_check, first_create)
        self.assertLess(backend_check, first_create)
        self.assert_has("manifest unknown|unexpected status.*404|: not found$")
        self.assert_has('return "$inspect_status"')
        self.assert_has("--compare")
        self.assert_has("tag-state-frontend")
        self.assert_has("tag-state-backend")

    def test_version_tags_are_created_from_the_two_scanned_digests(self):
        promotion = self.text.split("\n  promote-version:\n", 1)[1]
        for fragment in (
            '"${FRONTEND_IMAGE}@${FRONTEND_AMD64}"',
            '"${FRONTEND_IMAGE}@${FRONTEND_ARM64}"',
            '"${BACKEND_IMAGE}@${BACKEND_AMD64}"',
            '"${BACKEND_IMAGE}@${BACKEND_ARM64}"',
        ):
            with self.subTest(fragment=fragment):
                self.assertIn(fragment, promotion)
        self.assertEqual(promotion.count("docker buildx imagetools create"), 2)

    def test_both_raw_version_manifests_are_validated_against_candidates(self):
        promotion = self.text.split("\n  promote-version:\n", 1)[1]
        self.assertIn(
            'docker buildx imagetools inspect --raw "$FRONTEND_TAG"', promotion
        )
        self.assertIn(
            'docker buildx imagetools inspect --raw "$BACKEND_TAG"', promotion
        )
        self.assertIn(
            "validate_container_manifest.py .tmp/manifests/frontend-version.json --compare .tmp/manifests/frontend-candidate.json",
            promotion,
        )
        self.assertIn(
            "validate_container_manifest.py .tmp/manifests/backend-version.json --compare .tmp/manifests/backend-candidate.json",
            promotion,
        )

    def test_finalization_waits_for_verified_versions_and_owns_final_writes(self):
        finalization = self.finalization()
        self.assertRegex(
            finalization,
            r"(?ms)^    needs:\n      - prepare\n      - promote-version$",
        )
        self.assert_has("contents: write")
        self.assert_has("packages: write")
        self.assertNotIn("contents: write", self.text.split("\n  finalize-release:\n", 1)[0])

    def test_latest_state_is_captured_before_either_latest_tag_is_written(self):
        finalization = self.finalization()
        first_latest_write = finalization.index('imagetools create --tag "$FRONTEND_LATEST"')
        for fragment in (
            'capture_latest "$FRONTEND_LATEST" frontend',
            'capture_latest "$BACKEND_LATEST" backend',
            ".tmp/manifests/frontend-latest-before.json",
            ".tmp/manifests/backend-latest-before.json",
            "FRONTEND_PREVIOUS_DIGEST",
            "BACKEND_PREVIOUS_DIGEST",
        ):
            with self.subTest(fragment=fragment):
                self.assertLess(finalization.index(fragment), first_latest_write)

    def test_latest_is_promoted_from_verified_version_digests_and_compared(self):
        finalization = self.finalization()
        for component in ("frontend", "backend"):
            upper = component.upper()
            with self.subTest(component=component):
                self.assertIn(
                    f'"${{{upper}_IMAGE}}@${{{upper}_VERSION_DIGEST}}"',
                    finalization,
                )
                self.assertIn(
                    f"validate_container_manifest.py .tmp/manifests/{component}-latest.json --compare .tmp/manifests/{component}-version.json",
                    finalization,
                )

    def test_failure_during_latest_promotion_restores_every_written_tag(self):
        finalization = self.finalization()
        self.assertIn("trap rollback_latest ERR", finalization)
        self.assertIn('if [[ "$FRONTEND_WRITTEN" == true ]]', finalization)
        self.assertIn('if [[ "$BACKEND_WRITTEN" == true ]]', finalization)
        self.assertIn('"${FRONTEND_IMAGE}@${FRONTEND_PREVIOUS_DIGEST}"', finalization)
        self.assertIn('"${BACKEND_IMAGE}@${BACKEND_PREVIOUS_DIGEST}"', finalization)
        self.assertIn("frontend-latest-restored.json --compare .tmp/manifests/frontend-latest-before.json", finalization)
        self.assertIn("backend-latest-restored.json --compare .tmp/manifests/backend-latest-before.json", finalization)
        self.assertIn("Rollback compensation failed; manual intervention is required", finalization)

    def test_github_release_is_idempotent_and_is_the_last_external_write(self):
        finalization = self.finalization()
        self.assertEqual(finalization.count('gh release create "$VERSION"'), 1)
        self.assertIn('gh release view "$VERSION"', finalization)
        self.assertIn("existing-identical", finalization)
        self.assertIn("Release conflict", finalization)
        last_latest_write = finalization.rindex("imagetools create --tag")
        release_write = finalization.index('gh release create "$VERSION"')
        self.assertLess(last_latest_write, release_write)

    def test_final_summary_records_release_identity_and_verified_digests(self):
        finalization = self.finalization()
        for fragment in (
            "Actor: ${GITHUB_ACTOR}",
            "SHA: ${RELEASE_SHA}",
            "Version: ${VERSION}",
            "FRONTEND_VERSION_DIGEST",
            "BACKEND_VERSION_DIGEST",
            "FRONTEND_LATEST_DIGEST",
            "BACKEND_LATEST_DIGEST",
            "Release: ${RELEASE_URL}",
            "${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}",
        ):
            with self.subTest(fragment=fragment):
                self.assertIn(fragment, finalization)

    def test_all_actions_are_pinned_to_full_commit_shas(self):
        uses = re.findall(r"(?m)^\s*uses:\s*([^\s#]+)", self.text)
        self.assertGreaterEqual(len(uses), 10)
        for action in uses:
            with self.subTest(action=action):
                self.assertRegex(action, r"^[^@]+@[0-9a-f]{40}$")


if __name__ == "__main__":
    unittest.main()
