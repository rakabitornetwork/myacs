# Deploy ke VPS Tanpa `npm run build`

Beberapa hosting (vPanel/shared) **tidak mengizinkan** `npm run build` di server. Gunakan alur berikut.

## Ringkasan

| Jenis perubahan | Perlu build di VPS? | Yang dilakukan |
|-----------------|---------------------|----------------|
| Backend saja (`app/`, `routes/`, `server.js`) | **Tidak** | `git pull` + `pm2 restart` |
| Frontend (`resources/js/`, CSS) | **Ya** (di PC lokal) | Build di PC → upload `public/build/` |
| Dependency baru di `package.json` | **Ya** | `npm ci` di VPS (biasanya diizinkan) atau paket zip |

---

## Opsi A — Hanya backend (paling sering)

Cocok untuk fix CWMP, session, task queue, auth, dll.

**Di VPS:**

```bash
cd ~/public_html
git pull origin main
npm ci --omit=dev
pm2 restart myacs
```

> `npm ci --omit=dev` hanya install dependency production (tanpa Vite). Biasanya **diizinkan** meski `npm run build` tidak.

**Di PC lokal** (opsional, untuk verifikasi):

```bash
git pull
npm ci
npm test
```

---

## Opsi B — Build di PC, upload folder `public/build`

Cocok jika ada perubahan tampilan (React/Tailwind).

### 1. Build di komputer Anda (Laragon)

```powershell
cd C:\laragon\www\myacs
git pull origin main
npm ci
npm run build
```

### 2. Upload ke VPS

**WinSCP / FileZilla:**

- Lokal: `C:\laragon\www\myacs\public\build\`
- VPS: `/home/myacs/public_html/public/build/`
- Mode: **replace** semua isi folder

**Atau SCP (Git Bash / WSL):**

```bash
scp -r public/build/* myacs@IP_VPS:~/public_html/public/build/
```

### 3. Restart di VPS

```bash
pm2 restart myacs
```

---

## Opsi C — Paket zip lengkap (tanpa git di VPS)

Dari PC Windows:

```powershell
cd C:\laragon\www\myacs
git pull
npm run package:release
```

Upload `dist/myacs-release.zip` ke VPS, extract, lalu:

```bash
cd ~/public_html
# backup .env dulu!
cp .env /tmp/myacs.env.bak
unzip -o ../myacs-release.zip
cp /tmp/myacs.env.bak .env
pm2 restart myacs
```

---

## Opsi D — GitHub Actions (otomatis)

Setiap push ke `main`, CI menjalankan `npm run build` + test.

Lihat artefak build di: **GitHub → Actions → workflow terbaru → Artifacts**

Download `frontend-build.zip`, extract ke `public/build/` di VPS.

---

## Checklist setelah update

```bash
curl -s http://127.0.0.1:3001/health
pm2 logs myacs --lines 10 --nostream
```

Browser: https://myacs.teslatech.my.id/login

---

## Update task pending (fix terbaru)

Fix CWMP/task queue = **backend only**. Di VPS cukup:

```bash
cd ~/public_html
git pull origin main
npm ci --omit=dev
pm2 restart myacs
```

Tombol **Cancel** di halaman Tasks butuh upload `public/build/` (Opsi B) jika ingin UI-nya juga.

---

## Yang jangan dilupakan

- File `.env` **tidak** ikut git — jangan tertimpa saat unzip
- `node_modules` di VPS: jalankan `npm ci --omit=dev` setelah pull jika `package.json` berubah
- `pm2 save` setelah restart sukses
