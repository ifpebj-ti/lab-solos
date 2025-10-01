# Etapa de build
FROM node:18 AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa de produção
FROM nginx:1.28.0-alpine

# Cria um usuário e grupo 'nginx' com ID 101 (comum)
RUN addgroup -g 101 nginx && \
    adduser -S -D -H -u 101 -G nginx nginx

# Copia build e ajusta permissões para o novo usuário
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Copia os arquivos de configuração
COPY --chown=nginx:nginx .env.template.js /usr/share/nginx/html/
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Altera o arquivo de configuração do Nginx para usar o usuário não-root
RUN sed -i 's/user  nginx;/user  nginx;/' /etc/nginx/nginx.conf

# MUDAR PARA O USUÁRIO NÃO-ROOT
USER nginx

# Usa entrypoint customizado
ENTRYPOINT ["/entrypoint.sh"]

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
