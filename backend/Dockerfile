# Etapa 1: Build (usa o SDK para compilar)
FROM mcr.microsoft.com/dotnet/sdk:8.0.419-bookworm-slim@sha256:dd09bcce84d9130e7f3e85c83a8ce9709e1d95e45c48c722a0d7923b38d8024c AS build
WORKDIR /src

# Otimização de cache: copia primeiro os arquivos de projeto/solução
COPY Directory.Build.props Directory.Build.targets .editorconfig ./
COPY LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj LabSolos-Server-DotNet8/
COPY LabSolos-Server-DotNet8/packages.lock.json LabSolos-Server-DotNet8/
COPY backend.sln .

# Copiar o restante dos arquivos
WORKDIR /src
COPY LabSolos-Server-DotNet8/. LabSolos-Server-DotNet8/

RUN dotnet restore LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj --locked-mode --force

WORKDIR /src/LabSolos-Server-DotNet8
RUN dotnet publish LabSolos-Server-DotNet8.csproj -c Release -o /app/out --no-restore

# Runtime (usa apenas para rodar a aplicação)
FROM mcr.microsoft.com/dotnet/aspnet:8.0.30-bookworm-slim@sha256:787c228ea85457bec43c8b084e6ac360b26ea43b5c2fcbe861f721f2e8670dd3 AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install --no-install-recommends --yes libpcre2-8-0 \
    && rm -rf /var/lib/apt/lists/*

# Mudar para o usuário não-root
USER app

COPY --from=build /app/out ./

# Expor a porta (portas > 1024 não exigem privilégio root)
EXPOSE 8080

# Configuração do Kestrel
ENV ASPNETCORE_URLS=http://*:8080

# Comando de entrada para iniciar a API
ENTRYPOINT ["dotnet", "LabSolos-Server-DotNet8.dll"]
