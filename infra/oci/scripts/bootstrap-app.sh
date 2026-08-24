#!/usr/bin/env bash
set -Eeuo pipefail

cd /opt/labon
umask 077

latest_version="$(
  curl --fail --silent --show-error --location --retry 3 \
    -H 'Accept: application/vnd.github+json' \
    https://api.github.com/repos/ifpebj-ti/lab-solos/releases/latest \
    | jq --raw-output '.tag_name'
)"

if [[ ! "$latest_version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
  echo "Release estável inválida: ${latest_version}" >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  db_password="$(openssl rand -hex 24)"
  jwt_key="$(openssl rand -hex 48)"
  admin_password="$(openssl rand -hex 16)"

  cat > .env <<ENV
APP_DOMAIN=labon.nmvr.me
VITE_API_URL=https://labon.nmvr.me/api/
LABON_FRONTEND_IMAGE=ghcr.io/ifpebj-ti/lab-solos-frontend
LABON_BACKEND_IMAGE=ghcr.io/ifpebj-ti/lab-solos-backend
LABON_IMAGE_VERSION=${latest_version}
ASPNETCORE_ENVIRONMENT=Production
DB_NAME=labon
DB_USER=labon
DB_PASSWORD=${db_password}
EMAIL_SMTP_HOST=localhost
EMAIL_SMTP_PORT=25
EMAIL_USUARIO=disabled
EMAIL_SENHA=disabled
EMAIL_DE=noreply@nmvr.me
JWT_KEY=${jwt_key}
JWT_ISSUER=labon
JWT_AUDIENCE=labon-web
JWT_EXPIRES_IN_MINUTES=60
ALLOWED_HOSTS=labon.nmvr.me
PRODUCTION_ADMIN_NAME=Administrador LabOn
PRODUCTION_ADMIN_EMAIL=admin@nmvr.me
PRODUCTION_ADMIN_PASSWORD=${admin_password}
ENV

  cat > admin-credentials.txt <<CREDS
URL=https://labon.nmvr.me
EMAIL=admin@nmvr.me
PASSWORD=${admin_password}
CREDS

  chmod 600 .env admin-credentials.txt
fi

bash ./infra/oci/scripts/deploy-release.sh "$latest_version"
sudo bash ./infra/oci/scripts/install-auto-update.sh
