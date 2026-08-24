#!/usr/bin/env bash
set -Eeuo pipefail

deploy_dir="${LABON_DEPLOY_DIR:-/opt/labon}"
compose_file="${LABON_COMPOSE_FILE:-${deploy_dir}/docker-compose-prod.yml}"
env_file="${LABON_ENV_FILE:-${deploy_dir}/.env}"
state_file="${LABON_STATE_FILE:-${deploy_dir}/.deployed-version}"
lock_file="${LABON_LOCK_FILE:-${deploy_dir}/.deploy.lock}"
target_version="${1:-}"

log() {
  printf '[labon-deploy] %s\n' "$*"
}

fail() {
  log "ERRO: $*" >&2
  exit 1
}

validate_version() {
  [[ "$1" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]
}

read_env_value() {
  local key="$1"
  sed -n "s/^${key}=//p" "$env_file" | tail -n 1
}

write_env_value() {
  local key="$1"
  local value="$2"
  local temporary
  temporary="$(mktemp "${deploy_dir}/.env.XXXXXX")"
  awk -v key="$key" -v value="$value" '
    BEGIN { found = 0 }
    $0 ~ "^" key "=" { print key "=" value; found = 1; next }
    { print }
    END { if (!found) print key "=" value }
  ' "$env_file" > "$temporary"
  chmod 600 "$temporary"
  mv -- "$temporary" "$env_file"
}

compose() {
  docker compose --env-file "$env_file" -f "$compose_file" "$@"
}

wait_until_healthy() {
  local attempt
  local health
  for attempt in $(seq 1 36); do
    if compose exec -T proxy wget -qO /dev/null http://frontend:80 \
      && health="$(compose exec -T proxy wget \
        --header='X-Forwarded-Proto: https' \
        --header='Host: labon.nmvr.me' \
        -qO- http://backend:8080/api/System/health 2>/dev/null)" \
      && [[ "$health" == *'"status":"healthy'* ]]; then
      return 0
    fi
    sleep 5
  done
  return 1
}

[[ -f "$compose_file" ]] || fail "Compose não encontrado: ${compose_file}"
[[ -f "$env_file" ]] || fail "Arquivo de ambiente não encontrado: ${env_file}"
validate_version "$target_version" || fail "Versão inválida: ${target_version:-vazia}"

exec 9> "$lock_file"
flock -n 9 || fail "Outro deploy está em execução"

if [[ -f "$state_file" ]] && [[ "$(tr -d '\r\n' < "$state_file")" == "$target_version" ]]; then
  log "A versão ${target_version} já está implantada"
  exit 0
fi

frontend_image="$(read_env_value LABON_FRONTEND_IMAGE)"
backend_image="$(read_env_value LABON_BACKEND_IMAGE)"
frontend_image="${frontend_image:-ghcr.io/ifpebj-ti/lab-solos-frontend}"
backend_image="${backend_image:-ghcr.io/ifpebj-ti/lab-solos-backend}"
previous_version=""
if [[ -f "$state_file" ]]; then
  previous_version="$(tr -d '\r\n' < "$state_file")"
fi

log "Validando imagens da release ${target_version}"
docker manifest inspect "${frontend_image}:${target_version}" >/dev/null
docker manifest inspect "${backend_image}:${target_version}" >/dev/null

rollback() {
  local failure_status=$?
  trap - ERR
  if validate_version "$previous_version"; then
    log "Falha na ${target_version}; revertendo para ${previous_version}"
    export LABON_IMAGE_VERSION="$previous_version"
    compose pull frontend backend
    compose up -d --remove-orphans db frontend backend proxy
    if wait_until_healthy; then
      write_env_value LABON_IMAGE_VERSION "$previous_version"
      printf '%s\n' "$previous_version" > "$state_file"
      log "Rollback para ${previous_version} concluído"
    else
      log "ERRO: rollback para ${previous_version} não ficou saudável" >&2
    fi
  else
    log "ERRO: não existe versão anterior válida para rollback" >&2
  fi
  exit "$failure_status"
}

trap rollback ERR
export LABON_IMAGE_VERSION="$target_version"
log "Baixando imagens ${target_version} do GHCR"
compose pull frontend backend
compose up -d --remove-orphans db frontend backend proxy
wait_until_healthy

write_env_value LABON_IMAGE_VERSION "$target_version"
printf '%s\n' "$target_version" > "$state_file"
chmod 600 "$state_file"
trap - ERR

log "Release ${target_version} implantada e validada"
compose ps
