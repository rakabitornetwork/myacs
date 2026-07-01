# Port layout — Dual ACS di VPS yang sama

| Layanan | Port | URL contoh |
|---------|------|------------|
| **GenieACS CWMP** (CPE lama) | `7547` | `http://IP:7547` |
| **GenieACS UI** | `3000` | `http://IP:3000` |
| **GenieACS NBI** | `7557` | `http://IP:7557` |
| **MyACS** (panel + CWMP baru) | `3001` | `https://myacs.teslatech.my.id` |
| **HTTPS** (Apache/Nginx) | `443` | proxy → `127.0.0.1:3001` |

## Masalah umum

### Port 3000 sudah dipakai GenieACS

Jangan jalankan MyACS di port 3000. Gunakan `PORT=3001` di `.env`.

### Domain menampilkan halaman Apache default

`myacs.teslatech.my.id` perlu virtual host Apache/Nginx yang **proxy** ke MyACS, bukan DocumentRoot statis.

**Apache (terdeteksi di VPS Anda):**

```bash
sudo cp deploy/apache/myacs.conf /etc/apache2/sites-available/myacs.conf
sudo a2enmod proxy proxy_http ssl headers rewrite
sudo a2ensite myacs
sudo certbot --apache -d myacs.teslatech.my.id
sudo systemctl reload apache2
```

**Nginx:**

```bash
sudo cp deploy/nginx/myacs.conf /etc/apache2/sites-available/myacs  # atau sites-enabled nginx
sudo certbot --nginx -d myacs.teslatech.my.id
```

## Deploy manual (tanpa SSH key dari PC)

### 1. Buat paket di Windows

```powershell
.\scripts\package-release.ps1
```

Upload `dist/myacs-release.zip` ke VPS (WinSCP / FileZilla).

### 2. Di VPS

```bash
cd /var/www
unzip myacs-release.zip -d myacs
cd myacs
cp .env.production.dual .env
nano .env   # SESSION_SECRET + cek PORT=3001
bash deploy/post-deploy.sh
```

### 3. Apache proxy

```bash
sudo cp deploy/apache/myacs.conf /etc/apache2/sites-available/myacs.conf
sudo a2ensite myacs && sudo systemctl reload apache2
```

### 4. Verifikasi

```bash
curl http://127.0.0.1:3001/health
curl https://myacs.teslatech.my.id/health
```
