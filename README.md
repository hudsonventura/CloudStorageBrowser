# CloudStorageBrowser

A modern web-based directory navigator and file viewer (inspired by Cloudreve and Nextcloud), developed with **ASP.NET Core** (Clean Architecture) and **React**, packaged into a **single unified Docker container**. Features native support for mounted datasets (`:rw` or `:ro`), dedicated cache with on-demand reconstruction, SQLite configuration storage, and complete compatibility with **TrueNAS / ZFS Shadow Copies (Snapshots)**.

---

## 🚀 Key Features

### 🏛️ Clean Architecture & Strict Enums
- Backend built across `Domain`, `Application`, `Infrastructure`, and `Web` layers.
- Strict enums for access modes, sorting fields, sort directions, file categories, and snapshot change states.

### 🔒 Local Authentication & Security
- Self-contained local authentication with no external cloud dependencies.
- Signed JWT token valid for 30 days.
- Initial default administrator account: **`admin`** / **`admin`** (seeded automatically on first run).
- Password change modal with salt concatenation and SHA-256 hashing.

### 📁 Dataset Support & Permissions (`:ro` and `:rw`)
- Map any local or TrueNAS directory as a dataset via Docker volume mounts.
- Automatic detection of the `:ro` (read-only) flag, disabling write operations in the user interface and strictly enforcing HTTP 403 Forbidden on the backend.

### 🖼️ High-Quality FFmpeg Thumbnails & Regenerative Cache
- High-quality image and video thumbnail generation using **FFmpeg** with the Lanczos scaling filter (`flags=lanczos`) for smooth antialiasing.
- Dedicated cache volume stored at `/data/cache/thumbnails`.
- **On-demand reconstruction**: if the cache volume is deleted or lost, thumbnails are automatically regenerated on the fly during navigation.

### 🛡️ TrueNAS / ZFS Shadow Copies (Snapshots)
- Automatic detection of virtual `.zfs/snapshot` directories.
- Previous versions listed under file and folder properties.
- **Smart modification filter**: enabled by default to display **only snapshots with actual changes**, hiding daily snapshots where the file remained untouched.
- **File Actions**: preview or download the exact historical version of any file.
- **Directory Action**: **"Open in new tab"** button to browse the entire directory tree at that exact snapshot in read-only mode with a snapshot banner.

### 🎨 Modern Web Interface (Cloudreve-Inspired)
- **Themes**: Seamless Light and Dark modes with persistent user preference (deep gray and black tones in dark mode).
- **Navigation & Search**: Interactive breadcrumbs, instant search bar (press `/`), and `+ New` button (New Folder, Upload Files, New Text Document).
- **View Modes**: **Thumbnails / Grid**, **Details Table**, and **List**.
- **Interactive Column Sorting**: Clickable table headers in Details view to sort by **Name**, **Size**, **Last Modified**, and **Type** (ascending/descending).
- **Selection & Preview**: Single-click selects any item; double-click opens the preview.
- **Persistent Properties Sidebar**: Always visible on the right. When nothing is selected, it displays current directory/dataset usage and stats; when an item is selected, it presents file details and EXIF metadata (camera model, exposure, aperture, ISO, GPS coordinates).
- **Pagination**: Default 100 items per page with customizable limits (50, 100, 250, 500).
- **Drag & Drop**: Drag files from your desktop to upload; drag items between folders to move them.
- **Context Menu**: Full right-click menu (Open, Download, Rename, Copy, Move, Delete, Properties).
- **Hidden Items Preference**: Checkbox in user profile menu to toggle visibility of hidden items starting with `.` (dot).
- **Backdrop Modal UX**: Click outside any modal or press `Escape` to close it.

### 👁️ Built-in File Viewers & Media Navigation
- **Image & Video Viewer**: Floating `<` and `>` navigation buttons plus keyboard arrow keys (`ArrowLeft`, `ArrowRight`) to cycle smoothly through images and videos in the folder without closing the modal.
- **Audio Player**: Integrated HTML5 streaming player.
- **PDF Viewer**: Embedded browser document viewer.
- **Text & Code Editor**: In-browser code and text editor with syntax styling and file saving (disabled on read-only datasets).
- **Unsupported File Modal**: Clean modal for non-previewable formats (executables `.exe`, archives `.zip`, `.tar`, `.rar`, etc.) showing file specifications and a direct download button.

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

2. Access the application in your browser: `http://localhost:8080`
   - **Username:** `admin`
   - **Password:** `admin`

3. To stop the application:
```bash
docker compose down
```

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
