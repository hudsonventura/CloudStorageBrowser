# Stage 1: Build React Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY src/frontend/package*.json ./
RUN npm install
COPY src/frontend ./
RUN npm run build

# Stage 2: Build ASP.NET Core Backend
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-builder
WORKDIR /app
COPY src/CloudStorageBrowser.Domain/ src/CloudStorageBrowser.Domain/
COPY src/CloudStorageBrowser.Application/ src/CloudStorageBrowser.Application/
COPY src/CloudStorageBrowser.Infrastructure/ src/CloudStorageBrowser.Infrastructure/
COPY src/CloudStorageBrowser.Web/ src/CloudStorageBrowser.Web/

RUN dotnet restore src/CloudStorageBrowser.Web/CloudStorageBrowser.Web.csproj
RUN dotnet publish src/CloudStorageBrowser.Web/CloudStorageBrowser.Web.csproj -c Release -o /app/publish --no-restore

# Stage 3: Unified Production Runtime (Debian-based for TrueNAS SCALE compatibility)
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libfontconfig1 \
    libfreetype6 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=backend-builder /app/publish .
COPY --from=frontend-builder /app/frontend/dist ./wwwroot

ENV ASPNETCORE_URLS=http://+:8080
ENV DATASETS_DIR=/data/datasets
ENV CACHE_DIR=/data/cache
ENV CONFIG_DIR=/data/config

# Create default volume mount points
RUN mkdir -p /data/datasets /data/cache /data/config

EXPOSE 8080
ENTRYPOINT ["dotnet", "CloudStorageBrowser.Web.dll"]
