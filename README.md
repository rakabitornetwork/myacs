# MyACS

Platform manajemen **TR-069 ACS** (Auto Configuration Server) mirip GenieACS — dibangun untuk **TeslaTech / Rakabitor Network**.

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6%2B-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-Private-red)]()

**Repository:** [github.com/rakabitornetwork/myacs](https://github.com/rakabitornetwork/myacs)  
**Production:** [myacs.teslatech.my.id](https://myacs.teslatech.my.id)

---

## Daftar isi

- [Fitur](#fitur)
- [Tech stack](#tech-stack)
- [Persyaratan](#persyaratan)
- [Instalasi lokal](#instalasi-lokal)
- [Mode ACS](#mode-acs)
- [Deploy ke VPS](#deploy-ke-vps)
- [Update dari GitHub (git pull)](#update-dari-github-git-pull)
- [Konfigurasi CPE](#konfigurasi-cpe)
- [Role pengguna](#role-pengguna)
- [Perintah npm](#perintah-npm)
- [Struktur proyek](#struktur-proyek)

---

## Fitur

- Login & session (MongoDB store)
- RBAC multi-user (`admin` / `operator` / `viewer`)
- Dashboard statistik & system health (admin)
- Device registry otomatis dari CWMP Inform
- Task queue: Reboot, Factory Reset, Get/Set Parameter, GetParameterNames, Download, Upload
- CWMP SOAP handler + cookie session + preset on BOOT
- Upload file dari CPE (`/cwmp/upload/:taskId`)
- Preset CRUD (`value`, `add_object`, `delete_object`)
- Upload firmware & file manager
- Connection Request (HTTP GET + Digest auth)
- Halaman Faults
- **Dual ACS** — MyACS + GenieACS paralel (CPE terpisah)
- Integrasi GenieACS NBI (reboot, task, sync device)

---

## Tech stack

| Layer | Teknologi |
|-------|-----------|
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB |
| Frontend | React 19, Inertia.js, Tailwind CSS v4, Vite |
| CWMP | TR-069 SOAP (`fast-xml-parser`) |
| Process | PM2 |

---

## Persyaratan

- **Node.js** 20+
- **MongoDB** 6+
- **PM2** (production)
- **Nginx** atau **Apache** + SSL (production HTTPS)

---

## Instalasi lokal

### 1. Clone repository

```bash
git clone https://github.com/rakabitornetwork/myacs.git
cd myacs
```

### 2. Environment

```bash
cp .env.example .env
```

Edit `.env` sesuai kebutuhan (lihat [Mode ACS](#mode-acs)).

### 3. Install & jalankan

```bash
npm install
npm run build
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

### Kredensial default (development)

User dibuat otomatis saat server pertama kali dijalankan:

| Field | Nilai |
|-------|-------|
| Email | `amon@teslatech.my.id` |
| Password | `gantengmax` |

> **Penting:** Ganti password default sebelum deploy production. Kelola user tambahan di menu **Users** (role admin).

### MongoDB di Laragon (Windows)

```text
Start: C:\laragon\bin\mongodb\start-mongod.bat
Data:  C:\laragon\data\mongodb\
URI:   mongodb://127.0.0.1:27017/myacs
```

---

## Mode ACS

Atur via `ACS_MODE` di `.env`:

| Mode | CWMP MyACS | Sync GenieACS | Use case |
|------|------------|---------------|----------|
| `standalone` | ✅ | ❌ | Hanya MyACS |
| `dual` | ✅ | ✅ | MyACS + GenieACS paralel (**disarankan**) |
| `genieacs-panel` | ❌ | ✅ | Panel saja, CWMP di GenieACS |

Template environment:

| File | Kegunaan |
|------|----------|
| `.env.example` | Development |
| `.env.production.dual` | Production dual ACS |
| `.env.production.genieacs` | Production panel-only |

### Dual ACS — CPE terpisah

| | CPE Lama | CPE Baru |
|---|----------|----------|
| **ACS** | GenieACS | MyACS |
| **URL** | `http://VPS:7547` | `https://myacs.teslatech.my.id/cwmp` |
| **MongoDB** | `genieacs` | `myacs` |

---

## Deploy ke VPS

### Port di VPS (Dual ACS)

> **GenieACS UI memakai port 3000** — MyACS **wajib** port lain.

| Layanan | Port |
|---------|------|
| GenieACS CWMP | `7547` |
| GenieACS UI | `3000` |
| GenieACS NBI | `7557` |
| **MyACS** | **`3001`** |
| HTTPS | `443` → proxy ke `3001` |

Detail: [`deploy/PORTS.md`](deploy/PORTS.md)  
Cloudflare proxied: [`deploy/CLOUDFLARE.md`](deploy/CLOUDFLARE.md)  
VPS tanpa `npm run build`: [`deploy/VPS-NO-BUILD.md`](deploy/VPS-NO-BUILD.md)

### Clone pertama kali di VPS

```bash
cd /var/www
git clone https://github.com/rakabitornetwork/myacs.git myacs
cd myacs

cp .env.production.dual .env
nano .env
```

Isi wajib di `.env`:

```env
NODE_ENV=production
PORT=3001
APP_URL=https://myacs.teslatech.my.id
SESSION_SECRET=<string-acak-panjang-min-32-karakter>
ACS_MODE=dual
MONGODB_URI=mongodb://127.0.0.1:27017/myacs
GENIEACS_MONGODB_URI=mongodb://127.0.0.1:27017/genieacs
GENIEACS_CWMP_URL=http://IP_VPS:7547
GENIEACS_NBI_URL=http://IP_VPS:7557
```

Generate `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Validasi config:

```bash
npm run check:env:prod
```

Deploy:

```bash
npm ci
npm run build
bash deploy/post-deploy.sh
pm2 save
```

### Apache reverse proxy

VPS TeslaTech memakai Apache. Gunakan template:

```bash
sudo cp deploy/apache/myacs.conf /etc/apache2/sites-available/myacs.conf
sudo a2enmod proxy proxy_http ssl headers rewrite
sudo a2ensite myacs
sudo certbot --apache -d myacs.teslatech.my.id
sudo systemctl reload apache2
```

### Nginx (alternatif)

```bash
sudo cp deploy/nginx/myacs.conf /etc/apache2/sites-available/myacs
sudo certbot --nginx -d myacs.teslatech.my.id
```

### Firewall

```bash
sudo ufw allow 443/tcp    # MyACS HTTPS
sudo ufw allow 7547/tcp   # GenieACS CWMP
```

### Verifikasi

```bash
curl http://127.0.0.1:3001/health
curl https://myacs.teslatech.my.id/health
pm2 status
pm2 logs myacs --lines 30
```

Response sukses: `{"status":"ok",...}`

---

## Update dari GitHub (git pull)

Setiap ada perubahan di GitHub, jalankan di **terminal VPS**:

```bash
cd /var/www/myacs
git pull origin main
npm ci
npm run build
bash deploy/post-deploy.sh
```

> Jika branch utama Anda `master`, ganti `main` dengan `master`.

**Satu baris:**

```bash
cd /var/www/myacs && git pull origin main && npm ci && npm run build && bash deploy/post-deploy.sh
```

Catatan:

- File `.env` **tidak** ikut Git — tetap aman di VPS
- Folder `public/build/` tidak di-commit — **wajib** `npm run build` setelah pull
- `deploy/post-deploy.sh` otomatis reload PM2 dan cek health

---

## Konfigurasi CPE

| CPE | ACS URL |
|-----|---------|
| **Lama** (GenieACS) | `http://IP_VPS:7547` |
| **Baru** (MyACS) | `https://myacs.teslatech.my.id/cwmp` |

---

## Role pengguna

| Role | Akses |
|------|-------|
| `admin` | Full access + kelola user, hapus preset/file |
| `operator` | Device task, preset, upload, sync GenieACS |
| `viewer` | Read only |

---

## Perintah npm

| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Development dengan hot reload |
| `npm run build` | Build frontend (Vite → `public/build/`) |
| `npm start` | Jalankan production |
| `npm test` | Unit test |
| `npm run check:env` | Validasi `.env` |
| `npm run check:env:prod` | Validasi template production dual |
| `npm run package:release` | Buat zip deploy (Windows) |

---

## Struktur proyek

```text
myacs/
├── app/
│   ├── config/          # Konfigurasi & validasi env
│   ├── Http/Controllers/
│   ├── jobs/            # Offline device, GenieACS sync
│   ├── models/
│   ├── services/
│   │   ├── cwmp/        # TR-069 handler, session, RPC
│   │   └── genieacs/    # NBI client
│   └── middleware/
├── deploy/
│   ├── apache/          # Virtual host Apache
│   ├── nginx/           # Config Nginx
│   ├── post-deploy.sh   # Script deploy di VPS
│   └── setup-vps.sh     # Setup awal VPS
├── resources/js/        # React pages (Inertia)
├── routes/              # Web & CWMP routes
├── scripts/             # Deploy & check-env
├── public/build/        # Output Vite (generate, tidak di-git)
├── server.js            # Entry point
└── ecosystem.config.cjs # PM2
```

---

## CI

GitHub Actions menjalankan build & test pada setiap push/PR:

```text
.github/workflows/ci.yml
```

---

## Kontribusi & lisensi

Proyek ini dikelola oleh **Rakabitor Network / TeslaTech**.  
Untuk akses, issue, atau kontribusi internal, hubungi maintainer repository.

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `/health` 404 di port 3000 | Port 3000 = GenieACS UI. MyACS harus di **3001** |
| Domain tampil halaman Apache default | Setup virtual host → `deploy/apache/myacs.conf` |
| `SESSION_SECRET` error saat start | Ganti secret di `.env`, jalankan `npm run check:env:prod` |
| Asset 404 setelah pull | Jalankan `npm run build` |
| Device GenieACS tidak bisa di-task | Set `GENIEACS_NBI_URL` di `.env` |

---

**MyACS** — TR-069 ACS Management by [Rakabitor Network](https://github.com/rakabitornetwork)
