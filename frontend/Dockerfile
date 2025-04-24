# Etapa de build
FROM node:18 AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa de produção
FROM nginx:1.25-alpine

# Copia build
COPY --from=build /app/dist /usr/share/nginx/html

# Copia o template de .env.js
COPY .env.template.js /usr/share/nginx/html/

# Copia o entrypoint.sh
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Usa entrypoint customizado
ENTRYPOINT ["/entrypoint.sh"]

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
