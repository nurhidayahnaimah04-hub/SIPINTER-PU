# SIPINTER - Sistem Monitoring Progress Kerja Internal 

## DEVELOPED BY:
### - Brisbane Jovan Rivaldi Sihombing
### - Yehezkiel Sitomorang
### - Petra Igor Keliat

Aplikasi web untuk mencatat, mendelegasikan, memantau, dan memverifikasi progres pekerjaan secara berjenjang di lingkungan Balai PU mulai dari Kepala Balai, Kasubag, Ketua Tim (Katim), hingga Anggota tim di lapangan.

Awalnya dibangun dengan Laravel, kini backend telah dimigrasi ke **Express.js (Node.js)** dengan database **PostgreSQL (Supabase)**, sementara tampilan dan fitur frontend **React + Vite + Tailwind** tetap sama persis seperti versi sebelumnya.

```
sipinter/
├── backend/    -> REST API Express.js + PostgreSQL (Supabase)
└── frontend/   -> React + Vite + Tailwind CSS
```

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Teknologi](#teknologi)
- [Alur Kerja Aplikasi](#alur-kerja-aplikasi)
- [Peran Pengguna](#peran-pengguna)
- [Struktur Proyek](#struktur-proyek)
- [Persiapan](#persiapan)
- [Instalasi & Menjalankan](#instalasi--menjalankan)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Buat Project Supabase](#2-buat-project-supabase)
  - [3. Konfigurasi Backend](#3-konfigurasi-backend)
  - [4. Konfigurasi Frontend](#4-konfigurasi-frontend)
  - [5. Migrasi & Seed Database](#5-migrasi--seed-database)
  - [6. Jalankan Aplikasi](#6-jalankan-aplikasi)
- [Akun Demo](#akun-demo)
- [Variabel Environment](#variabel-environment)
- [Build Production](#build-production)
- [Troubleshooting](#troubleshooting)
- [Lisensi](#lisensi)

## Fitur Utama

- Manajemen periode (tahun anggaran) dan pengelompokan data per semester.
- Pendelegasian tugas besar (Kasubag → Katim) dan pemecahan menjadi subtugas (Katim → Anggota).
- Pelaporan progres pekerjaan (0–100%) lengkap dengan unggah bukti kerja (foto/dokumen/PDF).
- **Verifikasi berjenjang dua tahap**: Katim (tahap 1) → Kasubag (tahap 2/final).
- Progres tugas besar terhitung otomatis dari rata-rata progres seluruh subtugasnya.
- Dashboard berbeda untuk tiap role, dengan filter periode/semester dan rekap per tim.
- Notifikasi real-time (Server-Sent Events) untuk setiap peristiwa penting.
- Manajemen pengguna dan tim kerja (tambah/ubah/nonaktifkan akun, atur anggota tim).
- Penyimpanan file terpusat di Supabase Storage dengan URL publik.

## Teknologi

| Bagian | Teknologi |
|---|---|
| Frontend | React 19, Vite 6, Tailwind CSS, axios, react-router-dom |
| Backend | Express.js (Node.js), REST API |
| Database | PostgreSQL — dihosting di [Supabase](https://supabase.com) |
| Penyimpanan File | Supabase Storage (bucket publik) |
| Autentikasi | Token bearer kustom (hash tersimpan di tabel `auth_tokens`), setara konsep Laravel Sanctum |
| Realtime | Server-Sent Events (SSE) untuk notifikasi |

> Supabase dipakai untuk dua hal: database PostgreSQL (`DATABASE_URL`) dan Supabase Storage untuk file upload. Aplikasi **tidak** memakai fitur Auth bawaan Supabase — sistem login dibuat sendiri di backend.

## Alur Kerja Aplikasi

1. **Kepala Balai** membuka/mengaktifkan periode (tahun anggaran).
2. **Kasubag** membuat tugas besar untuk sebuah tim, lengkap dengan deadline.
3. **Katim** memecah tugas besar menjadi beberapa subtugas dan membagikannya ke anggota timnya.
4. **Anggota** mengerjakan subtugas dan melaporkan progres beserta bukti kerja secara berkala.
5. **Katim** memverifikasi laporan progres anggotanya (verifikasi tahap 1).
6. **Kasubag** memverifikasi ulang laporan yang sudah disetujui Katim (verifikasi tahap 2, final).
7. Progres tugas besar ter-update otomatis dari rata-rata progres subtugas di dalamnya.
8. **Kepala Balai** dan **Kasubag** memantau seluruh perkembangan lewat dashboard rekap per tim/periode/semester.

Status subtugas mengikuti alur:
`Belum Dimulai → Sedang Berjalan → Menunggu Verifikasi Katim → Menunggu Verifikasi Kasubag → Selesai` (atau `Terlambat` jika melewati deadline).

## Peran Pengguna

| Role | Hak Akses Utama |
|---|---|
| **Kepala Balai** (`kabalai`) | Dashboard rekap seluruh tim & tugas tingkat balai, kelola periode (tahun anggaran) |
| **Kasubag** | Buat & distribusikan tugas besar ke tim, verifikasi tahap akhir, kelola user & tim |
| **Ketua Tim / Katim** | Pecah tugas menjadi subtugas untuk anggota, verifikasi tahap pertama |
| **Anggota** | Kerjakan subtugas, laporkan progres & bukti kerja |

Setiap endpoint API dibatasi sesuai role melalui middleware (`authenticate` + `role(...)`).

## Struktur Proyek

```
backend/
├── src/
│   ├── controllers/   -> logika tiap fitur (auth, tugas, subtugas, verifikasi, dst.)
│   ├── db/             -> koneksi database, schema.sql, migrate.js, seed.js
│   ├── lib/             -> koneksi ke Supabase Storage (supabase.js)
│   ├── middleware/    -> autentikasi, cek role, upload file
│   ├── routes/          -> daftar seluruh endpoint API (api.js)
│   ├── services/        -> fungsi bantu proses bisnis
│   ├── utils/            -> util (perhitungan semester, notifikasi, dll.)
│   └── server.js        -> entry point aplikasi backend
├── .env.example
└── package.json

frontend/
├── src/
│   ├── api/             -> konfigurasi axios
│   ├── components/    -> komponen UI yang dipakai berulang
│   ├── context/        -> AuthContext, PeriodeContext
│   ├── layouts/        -> layout dashboard
│   ├── lib/             -> helper, koneksi notifikasi real-time (SSE)
│   ├── pages/           -> halaman per role: kabalai/, kasubag/, katim/, anggota/, auth/
│   ├── App.jsx / AppRoutes.jsx
│   └── main.jsx
├── .env.example
├── vite.config.js       -> proxy /api & /storage ke backend saat development
└── package.json
```

## Persiapan

Pastikan sudah terpasang di komputer Anda:

- **Node.js** v18 ke atas (disarankan versi LTS terbaru)
- **Git**
- **Akun [Supabase](https://supabase.com)** (gratis) — untuk database PostgreSQL & Storage

```bash
node -v
npm -v
git --version
```

## Instalasi & Menjalankan

### 1. Clone Repository

```bash
git clone https://github.com/brisbane26/sipinter.git
cd sipinter
```

### 2. Buat Project Supabase

1. Buka [supabase.com](https://supabase.com) → **New Project**.
2. Isi nama project, buat **Database Password** yang kuat (catat baik-baik), pilih region terdekat, plan **Free**.
3. Setelah project aktif, buka **Project Settings → Database**, salin **Connection String (URI)** — ini akan jadi `DATABASE_URL`.
4. Buka **Project Settings → API**, salin **Project URL** (`SUPABASE_URL`) dan **service_role key** (`SUPABASE_SERVICE_ROLE_KEY`).
5. Buka menu **Storage → New bucket**, buat bucket bernama `sipinter-files`, lalu **aktifkan opsi Public**.

> ⚠️ `service_role key` bersifat rahasia dan dapat melewati semua aturan keamanan. Jangan pernah ditaruh di kode frontend atau di-commit ke repository publik.

### 3. Konfigurasi Backend

```bash
cd backend
cp .env.example .env
```

<<<<<<< HEAD
Semua akun demo dari `npm run db:seed` memakai password: `password`
- kabalai@pu.go.id (Kepala Balai)
- kasubag@pu.go.id (Kasubag)
- katim.kpa@pu.go.id / katim.koi@pu.go.id / katim.upb@pu.go.id (Katim)
- rudi@pu.go.id, dewi@pu.go.id, dst. (Anggota)
=======
Lengkapi `backend/.env`:
>>>>>>> 30d95213f1c9e70a738a6beb2e285c4d412f73cd

```env
PORT=8000
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173

DATABASE_URL=postgresql://postgres:PASSWORD_ANDA@db.xxxxxxxxxxxx.supabase.co:5432/postgres
DB_SSL=true

BCRYPT_ROUNDS=12

SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_STORAGE_BUCKET=sipinter-files
```

> Baris `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, dan `SUPABASE_STORAGE_BUCKET` **tidak** ada di `.env.example` bawaan — tambahkan sendiri, karena fitur upload (foto profil, lampiran tugas, bukti kerja) bergantung pada tiga variabel ini.

### 4. Konfigurasi Frontend

```bash
cd ../frontend
cp .env.example .env
```

Untuk pengembangan lokal, biarkan seperti berikut (Vite otomatis proxy ke backend):

```env
VITE_API_URL=
VITE_BACKEND_URL=http://localhost:8000
```

### 5. Migrasi & Seed Database

```bash
cd ../backend
npm install
npm run db:migrate   # membuat semua tabel di database Supabase
npm run db:seed      # opsional — isi data contoh (user, tim, tugas demo)
```

### 6. Jalankan Aplikasi

Buka dua terminal terpisah:

```bash
# Terminal 1 — Backend
cd backend
npm run dev            # http://localhost:8000
```

```bash
# Terminal 2 — Frontend
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Buka **http://localhost:5173** di browser untuk mengakses halaman login.

## Akun Demo

Tersedia setelah menjalankan `npm run db:seed`. Semua akun memakai password: **`password`**

| Role | Email |
|---|---|
| Kepala Balai | `kabalai@pu.go.id` |
| Kasubag | `kasubag@pu.go.id` |
| Ketua Tim | `katim.kpa@pu.go.id`, `katim.koi@pu.go.id`, `katim.upb@pu.go.id` |
| Anggota | `rudi@pu.go.id`, `dewi@pu.go.id`, dst. |

## Variabel Environment

**`backend/.env`**

| Variabel | Keterangan |
|---|---|
| `PORT` | Port server Express (default `8000`) |
| `APP_URL` | URL backend, contoh `http://localhost:8000` |
| `FRONTEND_URL` | URL frontend, dipakai untuk pengaturan CORS |
| `DATABASE_URL` | Connection string PostgreSQL dari Supabase |
| `DB_SSL` | `true` untuk koneksi ke Supabase |
| `BCRYPT_ROUNDS` | Tingkat keamanan hash password |
| `SUPABASE_URL` | Project URL Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (rahasia) Supabase |
| `SUPABASE_STORAGE_BUCKET` | Nama bucket Supabase Storage, contoh `sipinter-files` |

**`frontend/.env`**

| Variabel | Keterangan |
|---|---|
| `VITE_API_URL` | Kosongkan untuk development lokal; isi URL API production saat deploy |
| `VITE_BACKEND_URL` | Alamat backend yang dipakai proxy Vite saat development |

## Build Production

**Frontend**

```bash
cd frontend
# isi VITE_API_URL di .env dengan URL backend production, contoh:
# VITE_API_URL=https://api.domainanda.go.id/api
npm run build     # hasil build ada di folder dist/
```

**Backend**

```bash
cd backend
npm install
npm run db:migrate
npm start
```

Pastikan `.env` production diisi dengan `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, dan `FRONTEND_URL` sesuai domain production (bukan `localhost`).

## Troubleshooting

| Masalah | Solusi |
|---|---|
| Backend gagal konek ke database | Cek ulang `DATABASE_URL` & `DB_SSL=true`, pastikan project Supabase aktif (tidak *paused*) |
| Upload file gagal / foto tidak muncul | Pastikan `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` terisi dan bucket sudah **Public** |
| Frontend tidak bisa panggil API (CORS/Network Error) | Pastikan backend berjalan di `:8000` dan `FRONTEND_URL` di `backend/.env` sesuai alamat frontend |
| Port sudah dipakai (`EADDRINUSE`) | Tutup proses lain di port tersebut, atau ubah `PORT` di `.env` |
| Lupa password akun demo | Semua akun hasil `npm run db:seed` memakai password `password` |
| Ingin reset data development | `npm run db:reset` lalu `npm run db:migrate` dan `npm run db:seed` lagi |
