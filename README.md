<p align="center">
  <img src="logo.png" width="96" alt="CloudStorageBrowser Logo" />
</p>

<h1 align="center">CloudStorageBrowser</h1>

<p align="center">
  <strong>Your modern personal cloud browser with native TrueNAS & ZFS Shadow Copy time travel.</strong>
</p>

---

## 🚀 Key Features

- 🐳 **Run Anywhere with Docker in Seconds**: Deploy with a single `docker compose up` command. No external database, no complex dependencies, and minimal resource usage.
- 📂 **Works with Your Existing Folders (Zero Lock-In)**: No painful migrations or proprietary database schemas. Just point CloudStorageBrowser to your existing drives, NAS shares, or folders, and it handles the rest. You don't need to manage everything through the app—keep organizing your files via SMB, NFS, or the terminal, and changes reflect instantly.
- 🕒 **ZFS Shadow Copy & Snapshot Time Travel**: Accidentally deleted a file or want to revert an edit? Travel back in time and view, preview, or download previous versions directly from your TrueNAS / ZFS snapshots without leaving the browser.
- 🖼️ **Instant Media Gallery & Document Viewers**:
  - **Photos & Images**: Smooth full-screen gallery with zoom, rotation, and keyboard navigation.
  - **Videos & Audio**: Stream multimedia directly in your browser.
  - **PDFs & Documents**: Built-in full-featured PDF reader.
  - **Markdown Editor**: Integrated WYSIWYG & split live preview editor to take notes and write documentation on the fly.
- ⚡ **Lightning-Fast Thumbnail Caching**: Browse folders with thousands of photos and videos effortlessly with automatic, smart thumbnail generation.
- 🔒 **Safe & Protected Storage**: Mount volumes with Read-Write (`:rw`) or Read-Only (`:ro`) permissions to protect critical archives from accidental modifications.
- ✨ **Simplicity & Minimalism First**: A clean, modern, and uncluttered interface that stays out of your way and lets your content take center stage.
- 🌐 **Multi-Language & Dark Mode**: Ready out of the box in **English**, **Portuguese**, and **Spanish**, featuring an eye-friendly dark/light theme switch.

---

## 📦 Volume Structure

| Mount Point | Purpose |
|---|---|
| `/data/datasets` | Root directory where user datasets are mounted (e.g. `/data/datasets/photos:rw`, `/data/datasets/backups:ro`). |
| `/data/config` | Isolated directory for SQLite database storage (`cloudstorage.db`). |
| `/data/cache` | Dedicated directory for generated thumbnails and temporary files. |

---

## 🐳 Running with Docker Compose

An example `docker-compose.yml` is provided in the repository root:

```yaml
services:
  cloudstorage:
    build:
      context: .
      dockerfile: Dockerfile
    image: hudsonventura/cloudstoragebrowser:latest
    container_name: cloudstoragebrowser
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - DATASETS_DIR=/data/datasets
      - CONFIG_DIR=/data/config
      - CACHE_DIR=/data/cache
      - JWT_SECRET=CloudStorageBrowser_SuperSecureKey_WithAtLeast32Characters!
    volumes:
      # Persistent configuration & SQLite database
      - ./data/config:/data/config
      # Dedicated thumbnail cache (auto-reconstructed on-demand if lost)
      - ./data/cache:/data/cache
      # User datasets (supports both :rw and :ro flags)
      - ./data/datasets/dados:/data/datasets/dados:rw
      - ./data/datasets/backup:/data/datasets/backup:ro
```

### Quick Start:

1. Start the container:
```bash
docker compose up -d
```

2. Access the application in your browser: `http://localhost:8080`. The default user and pass are:
   - **Username:** `admin`
   - **Password:** `admin`

3. To stop the application:
```bash
docker compose down
```

---

## 🗄️ TrueNAS SCALE Deployment (Custom App / YAML)

To deploy on **TrueNAS SCALE (24.10+)** via **Apps → Discover Apps → Custom App → Install via YAML**:

```yaml
services:
  cloudstoragebrowser:
    image: ghcr.io/hudsonventura/cloudstoragebrowser:1.0.0
    restart: unless-stopped
    ports:
      - "30624:8080"
    environment:
      - DATASETS_DIR=/data/datasets
      - CONFIG_DIR=/data/config
      - CACHE_DIR=/data/cache
      - JWT_SECRET=ReplaceWithARandomSecretKeyAtLeast32CharactersLong!
    volumes:
      - /mnt/YOUR_POOL/apps/cloudstoragebrowser/config:/data/config
      - /mnt/YOUR_POOL/apps/cloudstoragebrowser/cache:/data/cache
      - /mnt/YOUR_POOL/your-files:/data/datasets/your-files:rw
      - /mnt/YOUR_POOL/backups:/data/datasets/backups:ro
```

> **Tip for ZFS Snapshot Time Travel:** To browse `.zfs/snapshot` inside TrueNAS datasets, make sure **ZFS Snapshot Directory** (`snapdir`) is set to **Visible** on the dataset settings in TrueNAS.

---

## 🛠️ Local Development

### Prerequisites
- .NET 10 SDK (or .NET 9)
- Node.js 22+ and npm
- FFmpeg installed locally (for thumbnail generation)

### Building Backend and Frontend

```bash
# 1. Restore and build the .NET solution
dotnet build CloudStorageBrowser.slnx

# 2. Run unit tests
dotnet test tests/CloudStorageBrowser.UnitTests/CloudStorageBrowser.UnitTests.csproj

# 3. Build the React frontend
cd src/frontend
npm install
npm run build
cd ../..

# 4. Copy built frontend assets to ASP.NET Core wwwroot
cp -r src/frontend/dist/* src/CloudStorageBrowser.Web/wwwroot/

# 5. Run the web server
dotnet run --project src/CloudStorageBrowser.Web/CloudStorageBrowser.Web.csproj
```

---

## 🧪 Automated Testing

The unit test suite validates:
- **ZFS Snapshots**: Virtual `.zfs/snapshot` directory detection, modified-only filtering, and historical file downloads.
- **Security & Auth**: 30-day JWT generation/validation, password hashing with concatenated salt, and login verification.
- **Storage & Permissions**: Read-only (`:ro`) write protection, path traversal defenses (`../../`), and hidden item filtering.
- **Pagination & Sorting**: 100-item default pagination and column sorting (Name, Size, Modified Date, Type).
- **Thumbnails**: High-quality antialiased scaling and SkiaSharp fallback.

Run tests at any time with:
```bash
dotnet test tests/CloudStorageBrowser.UnitTests/CloudStorageBrowser.UnitTests.csproj --no-restore
```

---

## 📄 License

This project is licensed under the MIT License.
