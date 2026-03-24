# Docker Installation Guide for Windows 11

## Prerequisites
- Windows 11 64-bit: Pro, Enterprise, or Education
- 4GB RAM minimum (8GB recommended)
- Virtualization enabled in BIOS

## Installation Steps

### Step 1: Enable WSL 2
Open PowerShell as Administrator and run:
```powershell
wsl --install
```
Restart your computer after this completes.

### Step 2: Download Docker Desktop
1. Go to: https://www.docker.com/products/docker-desktop/
2. Click "Download for Windows"
3. Run the installer (Docker Desktop Installer.exe)

### Step 3: Install Docker Desktop
1. Run the installer
2. Check "Use WSL 2 instead of Hyper-V" (recommended)
3. Click "Install"
4. Wait for installation to complete
5. Click "Close" to finish

### Step 4: Start Docker Desktop
1. Search for "Docker Desktop" in Start menu
2. Click to open
3. Wait for the Docker whale icon in the taskbar to stabilize

### Step 5: Verify Installation
Open PowerShell and run:
```powershell
docker --version
docker-compose --version
```

Expected output:
```
Docker version 24.x.x
Docker Compose v2.x.x
```

## Running the Bazzar App

After Docker is installed and running:

1. Open a new terminal in the project directory:
```bash
cd C:/Users/sgrgr/Desktop/Ecommerce
```

2. Start all services:
```bash
docker-compose up -d
```

3. Wait 2-3 minutes for all containers to start

4. Check status:
```bash
docker-compose ps
```

5. Access the app:
- Frontend: http://localhost:3000
- API Gateway: http://localhost:8080
- MongoDB: localhost:27017
- Redis: localhost:6379

## Troubleshooting

### Docker won't start
- Make sure WSL 2 is installed: `wsl --list --verbose`
- Enable virtualization in BIOS

### Containers fail to start
- Check logs: `docker-compose logs`
- Restart Docker: Right-click Docker icon → Restart

### Port conflicts
- Stop other services using port 3000, 8080, 27017, 6379
