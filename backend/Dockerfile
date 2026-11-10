# Etapa 1: Build (usa o SDK para compilar)
FROM mcr.microsoft.com/dotnet/sdk:8.0.428-bookworm-slim@sha256:1b955f179b02df4f0eb5fadedaa898cbe44d620a64aab52eec72c8e91d1355b5 AS build
WORKDIR /src

# Otimização de cache: copia primeiro os arquivos de projeto/solução
COPY Directory.Build.props Directory.Build.targets .editorconfig ./
COPY LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj LabSolos-Server-DotNet8/
COPY LabSolos-Server-DotNet8/packages.lock.json LabSolos-Server-DotNet8/
COPY backend.sln .
COPY TestSupport/HealthProbe/. TestSupport/HealthProbe/

RUN dotnet restore TestSupport/HealthProbe/HealthProbe.csproj --locked-mode --force \
    && dotnet publish TestSupport/HealthProbe/HealthProbe.csproj -c Release -o /app/health-probe --no-restore

# Copiar o restante dos arquivos
WORKDIR /src
COPY LabSolos-Server-DotNet8/. LabSolos-Server-DotNet8/

RUN dotnet restore LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj --locked-mode --force

WORKDIR /src/LabSolos-Server-DotNet8
RUN dotnet publish LabSolos-Server-DotNet8.csproj -c Release -o /app/out --no-restore

# Runtime (usa apenas para rodar a aplicação)
# Chiseled-extra mantém ICU/fusos horários e dispensa shell e gerenciador de pacotes.
FROM mcr.microsoft.com/dotnet/aspnet:8.0.34-noble-chiseled-extra@sha256:85063596009fe20db4108253acfff4edd36a60c343fec5d2fd6da53d4f1d9f5d AS runtime
WORKDIR /app

# Mudar para o usuário não-root
USER app

COPY --from=build /app/out ./
COPY --from=build /app/health-probe/ /health-probe/

# Expor a porta (portas > 1024 não exigem privilégio root)
EXPOSE 8080

# Configuração do Kestrel
ENV ASPNETCORE_URLS=http://*:8080

# Comando de entrada para iniciar a API
ENTRYPOINT ["dotnet", "LabSolos-Server-DotNet8.dll"]
