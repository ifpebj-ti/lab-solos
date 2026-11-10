FROM mcr.microsoft.com/dotnet/sdk:8.0.428-bookworm-slim@sha256:1b955f179b02df4f0eb5fadedaa898cbe44d620a64aab52eec72c8e91d1355b5 AS build
WORKDIR /src
COPY Directory.Build.props Directory.Build.targets .editorconfig ./
COPY LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj LabSolos-Server-DotNet8/
COPY LabSolos-Server-DotNet8/packages.lock.json LabSolos-Server-DotNet8/
COPY TestSupport/E2ESeed/E2ESeed.csproj TestSupport/E2ESeed/
COPY TestSupport/E2ESeed/packages.lock.json TestSupport/E2ESeed/
COPY LabSolos-Server-DotNet8/. LabSolos-Server-DotNet8/
COPY TestSupport/E2ESeed/. TestSupport/E2ESeed/
RUN dotnet restore TestSupport/E2ESeed/E2ESeed.csproj --locked-mode --force
RUN dotnet publish TestSupport/E2ESeed/E2ESeed.csproj -c Release -o /app/out --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0.34-bookworm-slim@sha256:dccacae9e0e103b5d3ba5fbe442dd8d3316b990cd8f2ec9be0a0ec9db0c0e520
WORKDIR /app
COPY --from=build /app/out ./
ENTRYPOINT ["dotnet", "E2ESeed.dll"]
