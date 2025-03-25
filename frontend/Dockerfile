# Etapa de build
FROM node:18 AS build

# Configurar o diretório de trabalho
WORKDIR /app

# Copiar arquivos package.json e package-lock.json para o contexto de trabalho
COPY package.json package-lock.json ./

# Instalar dependências
RUN npm install

# Copiar o restante do código do projeto
COPY . .

# Rodar o build da aplicação
RUN npm run build

# Etapa de produção
FROM nginx:1-alpine-slim
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
