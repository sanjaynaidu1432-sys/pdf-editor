# Permanent Deployment Guide for AuraPDF

This guide explains how to make your PDF Editor application run permanently 24/7 as a website.

---

## Option 1: 100% Free Cloud Deployment on the Internet (Recommended)

Host the website in the cloud so anyone can access it anywhere in the world on a permanent public URL (e.g. `https://your-app.onrender.com`).

### Deploying to Render.com (Free Tier)
1. Initialize git and push this folder to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of AuraPDF"
   git remote add origin https://github.com/YOUR_USERNAME/pdf-editor.git
   git push -u origin main
   ```
2. Go to **[Render.com](https://render.com)** and sign in (Free).
3. Click **"New +"** → **"Web Service"**.
4. Select your `pdf-editor` GitHub repository.
5. Choose **"Docker"** as the Environment (Render will automatically detect [`Dockerfile`](file:///Users/sanjay/Downloads/pdf%20editor/Dockerfile) and [`render.yaml`](file:///Users/sanjay/Downloads/pdf%20editor/render.yaml)).
6. Click **"Deploy Web Service"**.
7. Render will build and launch your application, giving you a permanent HTTPS URL like `https://aurapdf.onrender.com`.

---

## Option 2: Host from Your Mac with a Free Permanent Public HTTPS Link

If you want the app to run on your Mac and be accessible to anyone on the internet without port forwarding:

### Step 1: Install Cloudflare Tunnel
```bash
brew install cloudflared
```

### Step 2: Run the Public Tunnel
```bash
cloudflared tunnel --url http://127.0.0.1:8000
```
Cloudflare will generate a free, secure public HTTPS address (e.g., `https://random-words.trycloudflare.com`) that routes traffic directly to your running editor.

---

## Option 3: Run Permanently in the Background on your Mac (Local 24/7)

To have the app automatically start whenever you turn on your computer and restart if killed:

### Install as macOS Background Service
Run the included installation script:
```bash
./setup_mac_service.sh install
```

- The app will now run continuously in the background at `http://127.0.0.1:8000`.
- It will automatically launch when macOS boots up.
- Logs will be saved to `service.log`.

To stop and remove the service later:
```bash
./setup_mac_service.sh uninstall
```

---

## Option 4: Deploy using Docker / Docker Compose

If deploying to a VPS (Ubuntu, Debian, DigitalOcean, AWS EC2, or Hetzner):

```bash
docker compose up -d --build
```
The container will run with `restart: always` on port `8000`.
