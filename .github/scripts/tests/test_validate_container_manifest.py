from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).parents[1] / "validate_container_manifest.py"
OCI_MANIFEST = "application/vnd.oci.image.manifest.v1+json"


def descriptor(platform: str, digest_suffix: str) -> dict[str, object]:
    os_name, architecture = platform.split("/", maxsplit=1)
    return {
        "mediaType": OCI_MANIFEST,
        "digest": f"sha256:{digest_suffix * 64}",
        "size": 123,
        "platform": {"os": os_name, "architecture": architecture},
    }


def index(*descriptors: dict[str, object]) -> dict[str, object]:
    return {
        "schemaVersion": 2,
        "mediaType": "application/vnd.oci.image.index.v1+json",
        "manifests": list(descriptors),
    }


class ManifestCliTests(unittest.TestCase):
    def run_cli(
        self,
        payload: object | str,
        *,
        compare: object | str | None = None,
    ) -> subprocess.CompletedProcess[str]:
        with tempfile.TemporaryDirectory() as temp_dir:
            manifest_path = Path(temp_dir) / "manifest.json"
            manifest_path.write_text(
                payload if isinstance(payload, str) else json.dumps(payload),
                encoding="utf-8",
            )
            command = [sys.executable, str(SCRIPT), str(manifest_path)]
            if compare is not None:
                compare_path = Path(temp_dir) / "compare.json"
                compare_path.write_text(
                    compare if isinstance(compare, str) else json.dumps(compare),
                    encoding="utf-8",
                )
                command.extend(["--compare", str(compare_path)])
            return subprocess.run(
                command,
                capture_output=True,
                text=True,
                check=False,
                timeout=10,
            )

    def test_accepts_exact_platform_set_and_prints_deterministic_order(self):
        payload = index(
            descriptor("linux/arm64", "b"),
            descriptor("linux/amd64", "a"),
        )

        result = self.run_cli(payload)

        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual("linux/amd64\nlinux/arm64\n", result.stdout)

    def test_rejects_single_platform_as_contract_violation(self):
        result = self.run_cli(index(descriptor("linux/amd64", "a")))

        self.assertEqual(1, result.returncode)
        self.assertIn("linux/arm64", result.stderr)

    def test_rejects_extra_platform_as_contract_violation(self):
        result = self.run_cli(
            index(
                descriptor("linux/amd64", "a"),
                descriptor("linux/arm64", "b"),
                descriptor("linux/s390x", "c"),
            )
        )

        self.assertEqual(1, result.returncode)
        self.assertIn("linux/s390x", result.stderr)

    def test_rejects_duplicate_platform_as_contract_violation(self):
        result = self.run_cli(
            index(
                descriptor("linux/amd64", "a"),
                descriptor("linux/amd64", "c"),
                descriptor("linux/arm64", "b"),
            )
        )

        self.assertEqual(1, result.returncode)
        self.assertIn("duplicada", result.stderr.lower())

    def test_rejects_attestation_descriptor_in_strict_mode(self):
        result = self.run_cli(
            index(
                descriptor("linux/amd64", "a"),
                descriptor("linux/arm64", "b"),
                descriptor("unknown/unknown", "c"),
            )
        )

        self.assertEqual(1, result.returncode)
        self.assertIn("não executável", result.stderr.lower())

    def test_invalid_json_is_an_input_error(self):
        result = self.run_cli("{invalid json")

        self.assertEqual(2, result.returncode)
        self.assertIn("json", result.stderr.lower())

    def test_malformed_descriptor_is_an_input_error(self):
        malformed = descriptor("linux/amd64", "a")
        del malformed["digest"]

        result = self.run_cli(index(malformed, descriptor("linux/arm64", "b")))

        self.assertEqual(2, result.returncode)
        self.assertIn("digest", result.stderr.lower())

    def test_missing_input_is_an_input_error(self):
        result = subprocess.run(
            [sys.executable, str(SCRIPT), "missing-manifest.json"],
            capture_output=True,
            text=True,
            check=False,
            timeout=10,
        )

        self.assertEqual(2, result.returncode)
        self.assertIn("não foi possível ler", result.stderr.lower())

    def test_compare_accepts_identical_platform_digests(self):
        version = index(
            descriptor("linux/amd64", "a"),
            descriptor("linux/arm64", "b"),
        )
        latest = index(
            descriptor("linux/arm64", "b"),
            descriptor("linux/amd64", "a"),
        )

        result = self.run_cli(version, compare=latest)

        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual("linux/amd64\nlinux/arm64\n", result.stdout)

    def test_compare_rejects_divergent_platform_digest(self):
        version = index(
            descriptor("linux/amd64", "a"),
            descriptor("linux/arm64", "b"),
        )
        latest = index(
            descriptor("linux/amd64", "a"),
            descriptor("linux/arm64", "c"),
        )

        result = self.run_cli(version, compare=latest)

        self.assertEqual(1, result.returncode)
        self.assertIn("linux/arm64", result.stderr)
        self.assertIn("diverge", result.stderr.lower())


if __name__ == "__main__":
    unittest.main()
