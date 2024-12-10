# Etapa de build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

# Configurar o diretório de trabalho
WORKDIR /app

# Copiar os arquivos do projeto e restaurar dependências
COPY LabSolos-Server-DotNet8/*.csproj ./
RUN dotnet restore

# Copiar o restante do código do backend
COPY LabSolos-Server-DotNet8/ ./

# Publicar a aplicação
RUN dotnet publish -c Release -o /publish

# Etapa de execução
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime

# Configurar o diretório de trabalho no container
WORKDIR /app

# Copiar os arquivos publicados da etapa de build
COPY --from=build /publish .

# Expor a porta usada pela aplicação
EXPOSE 5000

# Definir o comando de entrada
ENTRYPOINT ["dotnet", "LabSolos-Server-DotNet8.dll"]
