FROM mcr.microsoft.com/dotnet/sdk:8.0.419-bookworm-slim@sha256:dd09bcce84d9130e7f3e85c83a8ce9709e1d95e45c48c722a0d7923b38d8024c AS build
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

FROM mcr.microsoft.com/dotnet/aspnet:8.0.30-bookworm-slim@sha256:787c228ea85457bec43c8b084e6ac360b26ea43b5c2fcbe861f721f2e8670dd3
WORKDIR /app
COPY --from=build /app/out ./
ENTRYPOINT ["dotnet", "E2ESeed.dll"]
