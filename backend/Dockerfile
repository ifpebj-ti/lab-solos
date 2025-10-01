# Etapa 1: Build (usa o SDK para compilar)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Otimização de cache: copia primeiro os arquivos de projeto/solução
COPY LabSolos-Server-DotNet8/*.csproj LabSolos-Server-DotNet8/
COPY backend.sln .

WORKDIR /src/LabSolos-Server-DotNet8
RUN dotnet restore

# Copiar o restante dos arquivos
WORKDIR /src
COPY LabSolos-Server-DotNet8/. LabSolos-Server-DotNet8/

WORKDIR /src/LabSolos-Server-DotNet8
RUN dotnet publish -c Release -o /app/out

# Runtime (usa apenas para rodar a aplicação)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# SEGURANÇA: Cria um usuário não-root para rodar a aplicação
RUN addgroup -g 1000 app && \
    adduser -S -D -H -u 1000 -G app app

# Mudar para o usuário não-root
USER app

COPY --from=build /app/out ./

# Expor a porta (portas > 1024 não exigem privilégio root)
EXPOSE 8080

# Configuração do Kestrel
ENV ASPNETCORE_URLS=http://*:8080

# Comando de entrada para iniciar a API
ENTRYPOINT ["dotnet", "LabSolos-Server-DotNet8.dll"]
