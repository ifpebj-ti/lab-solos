FROM node:18 AS build
WORKDIR /app

# Copiar os arquivos de configuração e dependências
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

# Copiar o código da aplicação
COPY . .

# Copiar o arquivo de configuração do TypeScript
COPY tsconfig.json ./

# Rodar o build da aplicação
RUN npm run build

# Expor a porta 3000 e iniciar a aplicação
EXPOSE 5173
CMD ["npm", "run", "dev"]

# Agora vai
