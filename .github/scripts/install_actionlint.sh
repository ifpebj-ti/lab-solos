#!/usr/bin/env bash
set -euo pipefail

readonly ACTIONLINT_VERSION="1.7.12"
readonly ACTIONLINT_REPOSITORY="rhysd/actionlint"
readonly ACTIONLINT_ARCHIVE="actionlint_1.7.12_linux_amd64.tar.gz"

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <destination-directory>" >&2
  exit 2
fi

readonly destination=$1
temporary_directory=$(mktemp -d)
trap 'rm -rf -- "$temporary_directory"' EXIT
readonly archive_path="$temporary_directory/$ACTIONLINT_ARCHIVE"

gh release download "v$ACTIONLINT_VERSION" \
  --repo "$ACTIONLINT_REPOSITORY" \
  --pattern "$ACTIONLINT_ARCHIVE" \
  --dir "$temporary_directory"

gh attestation verify "$archive_path" --repo "$ACTIONLINT_REPOSITORY"

tar -xzf "$archive_path" -C "$temporary_directory" actionlint
mkdir -p -- "$destination"
install -m 0755 "$temporary_directory/actionlint" "$destination/actionlint"

version_output=$("$destination/actionlint" -version)
installed_version=${version_output%%$'\n'*}
if [[ "$installed_version" != "$ACTIONLINT_VERSION" ]]; then
  echo "unexpected actionlint version: $installed_version" >&2
  exit 1
fi
