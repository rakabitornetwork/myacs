# MyACS + Cloudflare

Panduan untuk `myacs.teslatech.my.id` dengan Cloudflare.

Ada **dua mode** berbeda — jangan dicampur:

| Mode | Alur | Apache proxy? |
|------|------|---------------|
| **A. Cloudflare Tunnel** (Zero Trust) | CF → `cloudflared` → `localhost:3001` | **Tidak perlu** |
| **B. DNS Proxied (A record)** | CF → IP VPS → Apache → `:3001` | **Wajib** |

Setup TeslaTech memakai **Cloudflare Tunnel "VPS"** — lihat [bagian Tunnel](#cloudflare-tunnel-zero-trust).

---

## Cloudflare Tunnel (Zero Trust)

### Konfigurasi yang benar (screenshot Anda)

| Hostname | Service lokal |
|----------|---------------|
| `vpanel.teslatech.my.id` | `https://localhost:10000` |
| `acs.teslatech.my.id` | `http://localhost:3000` (GenieACS UI) |
| `myacs.teslatech.my.id` | `http://localhost:3001` (MyACS) ✅ |

Route MyACS **sudah benar** — langsung ke port 3001.

### Alur traffic

```text
Browser/CPE → Cloudflare Edge (HTTPS) → Tunnel cloudflared → localhost:3001 (MyACS)
```

Apache **tidak terlibat** untuk `myacs.teslatech.my.id` jika tunnel aktif.

### Checklist — jika masih 403 / 404

#### 1. `cloudflared` harus jalan di VPS

```bash
sudo systemctl status cloudflared
# atau
ps aux | grep cloudflared
```

Jika mati:

```bash
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

#### 2. MyACS harus jalan di port 3001

```bash
pm2 status
curl -s http://127.0.0.1:3001/health
curl -s http://localhost:3001/login | head -5
```

#### 3. Jangan bentrok DNS A record + Tunnel

Di **Cloudflare DNS**, untuk `myacs`:

- ✅ **Benar:** CNAME ke `xxxx.cfargotunnel.com` (dibuat otomatis saat publish route di Zero Trust)
- ❌ **Salah:** A record ke IP VPS **sekaligus** tunnel route → traffic bisa ke Apache (403/404)

**Hapus** record A `myacs` → IP VPS jika sudah pakai tunnel route.

Cek:

```bash
dig myacs.teslatech.my.id +short
# Harusnya CNAME ke cfargotunnel.com, BUKAN IP VPS langsung
```

#### 4. `.env` production

```env
APP_URL=https://myacs.teslatech.my.id
PORT=3001
NODE_ENV=production
```

```bash
pm2 reload myacs
```

#### 5. Tes dari luar

```bash
curl -s https://myacs.teslatech.my.id/health
```

Harapan: `{"status":"ok",...}`

### Cache & CWMP (Tunnel)

Di Cloudflare Dashboard → **Cache Rules**:

- Path contains `/cwmp` → **Bypass cache**
- Path contains `/login` → **Bypass cache**

CWMP = POST SOAP, tidak boleh di-cache.

### CPE ACS URL

| CPE | URL |
|-----|-----|
| Baru (MyACS) | `https://myacs.teslatech.my.id/cwmp` |
| Lama (GenieACS) | `http://IP_VPS:7547` (langsung, **bukan** tunnel) |

Port **7547** tidak melalui Cloudflare Tunnel.

---

## DNS Proxied (A record) — alternatif

Gunakan hanya jika **tidak** memakai Tunnel.

### Kenapa 403 Forbidden?

Cloudflare → Apache VPS → folder `public_html` tanpa proxy → **403**.

### Apache reverse proxy

```bash
cd ~/public_html
sudo cp deploy/apache/myacs.conf /etc/apache2/sites-available/myacs.conf
sudo a2enmod proxy proxy_http ssl headers rewrite
sudo a2ensite myacs
sudo systemctl reload apache2
sudo certbot --apache -d myacs.teslatech.my.id
```

### DNS

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `myacs` | IP VPS | Proxied (orange) |

---

## Troubleshooting

| Gejala | Penyebab (Tunnel) | Solusi |
|--------|-------------------|--------|
| 403 Forbidden | DNS A record ke Apache, bukan tunnel | Hapus A record, pakai CNAME tunnel |
| 404 Not Found | Tunnel mati / route salah | Cek `cloudflared`, route `localhost:3001` |
| 502 Bad Gateway | MyACS / PM2 mati | `pm2 restart myacs` |
| Login loop | `APP_URL` salah | `APP_URL=https://myacs.teslatech.my.id` |
| CWMP gagal | Cache CF | Bypass cache `/cwmp` |

| Gejala | Penyebab (A record) | Solusi |
|--------|---------------------|--------|
| 403 Forbidden | Apache tanpa proxy | `deploy/apache/myacs.conf` |
| 502 | PM2 mati | `pm2 status` |

### Diagnosa

```bash
pm2 status
curl -s http://localhost:3001/health
sudo systemctl status cloudflared
dig myacs.teslatech.my.id +short
curl -sI https://myacs.teslatech.my.id/
```

---

## Ringkasan setup TeslaTech

```text
myacs.teslatech.my.id  →  Tunnel VPS  →  localhost:3001  →  PM2 MyACS
acs.teslatech.my.id    →  Tunnel VPS  →  localhost:3000  →  GenieACS UI
vpanel.teslatech.my.id →  Tunnel VPS  →  localhost:10000 →  Virtualmin
CPE lama               →  langsung IP :7547               →  GenieACS CWMP
```
