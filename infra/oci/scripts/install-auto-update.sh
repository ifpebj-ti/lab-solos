#!/usr/bin/env bash
set -Eeuo pipefail

deploy_dir="${LABON_DEPLOY_DIR:-/opt/labon}"
systemd_dir="${deploy_dir}/infra/oci/systemd"

chmod 0755 \
  "${deploy_dir}/infra/oci/scripts/deploy-release.sh" \
  "${deploy_dir}/infra/oci/scripts/update-from-github.sh" \
  "${deploy_dir}/infra/oci/scripts/install-auto-update.sh"
install -m 0644 "${systemd_dir}/labon-update.service" /etc/systemd/system/labon-update.service
install -m 0644 "${systemd_dir}/labon-update.timer" /etc/systemd/system/labon-update.timer

systemctl daemon-reload
systemctl enable --now labon-update.timer
systemctl start labon-update.service
systemctl --no-pager status labon-update.timer
