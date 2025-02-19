# Etapa 1: Build (usa o SDK para compilar)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copiar os arquivos do projeto
COPY . ./
RUN dotnet restore
RUN dotnet publish -c Release -o out

# Etapa 2: Runtime (usa apenas para rodar a aplicação)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/out ./

# Expor a porta correta
EXPOSE 5000

# Comando de entrada para iniciar a API
ENTRYPOINT ["dotnet", "LabSolos-Server-DotNet8.dll"]
