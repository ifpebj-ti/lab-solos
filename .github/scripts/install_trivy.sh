#!/usr/bin/env bash
set -euo pipefail

TRIVY_VERSION="0.72.0"
readonly TRIVY_VERSION
readonly TRIVY_REPOSITORY="aquasecurity/trivy"

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <destination-directory>" >&2
  exit 2
fi

case "$(uname -s)" in
  Linux) readonly operating_system="Linux" ;;
  *)
    echo "unsupported operating system: $(uname -s)" >&2
    exit 2
    ;;
esac

case "$(uname -m)" in
  x86_64 | amd64) readonly architecture="64bit" ;;
  aarch64 | arm64) readonly architecture="ARM64" ;;
  *)
    echo "unsupported architecture: $(uname -m)" >&2
    exit 2
    ;;
esac

readonly destination=$1
readonly archive="trivy_${TRIVY_VERSION}_${operating_system}-${architecture}.tar.gz"
readonly checksum_file="trivy_${TRIVY_VERSION}_checksums.txt"
readonly release_url="https://github.com/${TRIVY_REPOSITORY}/releases/download/v${TRIVY_VERSION}"

temporary_directory=$(mktemp -d)
readonly temporary_directory
trap 'rm -rf -- "$temporary_directory"' EXIT

curl --fail --silent --show-error --location \
  "${release_url}/${archive}" \
  --output "${temporary_directory}/${archive}"
curl --fail --silent --show-error --location \
  "${release_url}/${checksum_file}" \
  --output "${temporary_directory}/${checksum_file}"

expected_checksum=$(awk -v archive="$archive" '$2 == archive { print; exit }' \
  "${temporary_directory}/${checksum_file}")
if [[ -z "$expected_checksum" ]]; then
  echo "checksum for ${archive} is absent from the published checksum file" >&2
  exit 1
fi

if ! (cd "$temporary_directory" && printf '%s\n' "$expected_checksum" | sha256sum --check --status); then
  echo "checksum verification failed for ${archive}" >&2
  exit 1
fi

tar --extract --gzip --file "${temporary_directory}/${archive}" \
  --directory "$temporary_directory" trivy
mkdir --parents "$destination"
install --mode 0755 "${temporary_directory}/trivy" "${destination}/trivy"

installed_version=$("${destination}/trivy" version | awk '/^Version:/ { print $2; exit }')
if [[ "$installed_version" != "$TRIVY_VERSION" ]]; then
  echo "unexpected Trivy version: expected ${TRIVY_VERSION}, got ${installed_version:-unknown}" >&2
  exit 1
fi

echo "Trivy ${TRIVY_VERSION} installed at ${destination}/trivy"
