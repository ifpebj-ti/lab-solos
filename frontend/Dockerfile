# Etapa de build
FROM node:20.20.2-bookworm-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0 AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_APP_VERSION=container
ARG VITE_APP_GIT_HASH=container
ARG VITE_APP_BUILD_DATE=1970-01-01T00:00:00.000Z
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_APP_GIT_HASH=$VITE_APP_GIT_HASH
ENV VITE_APP_BUILD_DATE=$VITE_APP_BUILD_DATE
RUN npm run build

# Etapa de produção
FROM nginx:1.29.3-alpine-slim@sha256:4c175d0d849aae0e0eedc64d718ef6323bed2bc68ee673e2d0a1bd5d501d0e5f

# Atualiza os pacotes do sistema para as versões seguras
RUN apk update && apk upgrade --no-cache && apk add --no-cache gettext

# Copia build e ajusta permissões para o novo usuário
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Copia os arquivos de configuração
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx .env.template.js /usr/share/nginx/html/
COPY docker/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

# Altera o arquivo de configuração do Nginx para usar o usuário não-root
RUN sed -i 's/user  nginx;/user  nginx;/' /etc/nginx/nginx.conf

# AJUSTE DE PERMISSÃO
RUN chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html

# Usa entrypoint customizado
ENTRYPOINT ["/entrypoint.sh"]

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
