#!/bin/sh

# Gera env.js a partir do template substituindo as variáveis
envsubst < /usr/share/nginx/html/.env.template.js > /usr/share/nginx/html/.env.js

exec "$@"
