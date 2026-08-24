#!/usr/bin/env bash
set -Eeuo pipefail

deploy_dir="${LABON_DEPLOY_DIR:-/opt/labon}"
state_file="${LABON_STATE_FILE:-${deploy_dir}/.deployed-version}"
repository="${LABON_GITHUB_REPOSITORY:-ifpebj-ti/lab-solos}"
deploy_script="${LABON_DEPLOY_SCRIPT:-${deploy_dir}/infra/oci/scripts/deploy-release.sh}"

latest_version="$(
  curl --fail --silent --show-error --location --retry 3 \
    -H 'Accept: application/vnd.github+json' \
    "https://api.github.com/repos/${repository}/releases/latest" \
    | jq --raw-output '.tag_name'
)"

if [[ ! "$latest_version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
  echo "Release estável inválida: ${latest_version}" >&2
  exit 1
fi

deployed_version=""
if [[ -f "$state_file" ]]; then
  deployed_version="$(tr -d '\r\n' < "$state_file")"
fi

if [[ "$deployed_version" == "$latest_version" ]]; then
  printf '[labon-update] A versão %s já está implantada\n' "$latest_version"
  exit 0
fi

printf '[labon-update] Nova release: %s (atual: %s)\n' \
  "$latest_version" "${deployed_version:-nenhuma}"
exec "$deploy_script" "$latest_version"
