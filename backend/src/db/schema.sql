-- ============================================================================
-- Skema database Progress Kerja Balai PUPR
-- Dikonversi dari migration Laravel ke PostgreSQL murni (untuk Supabase / Postgres)
-- ============================================================================

-- ---- users ----
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    nip VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified_at TIMESTAMP NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('kabalai', 'kasubag', 'katim', 'anggota')),
    jabatan VARCHAR(255),
    foto VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    remember_token VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ---- auth_tokens (pengganti Sanctum personal_access_tokens) ----
-- Token disimpan dalam bentuk hash (sha256), sama seperti Sanctum, sehingga
-- token asli hanya diketahui oleh client dan tidak pernah tersimpan mentah.
CREATE TABLE IF NOT EXISTS auth_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'auth_token',
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id);

-- ---- periodes (tahun anggaran) ----
CREATE TABLE IF NOT EXISTS periodes (
    id BIGSERIAL PRIMARY KEY,
    tahun SMALLINT UNIQUE NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'ditutup')),
    catatan TEXT,
    dibuat_oleh BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ditutup_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_periodes_status ON periodes(status);

-- ---- teams ----
CREATE TABLE IF NOT EXISTS teams (
    id BIGSERIAL PRIMARY KEY,
    nama_tim VARCHAR(255) NOT NULL,
    kode_tim VARCHAR(20),
    katim_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
    id BIGSERIAL PRIMARY KEY,
    team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (team_id, user_id)
);

-- ---- tugas (Kasubag -> Katim) ----
CREATE TABLE IF NOT EXISTS tugas (
    id BIGSERIAL PRIMARY KEY,
    judul VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    periode_id BIGINT NOT NULL REFERENCES periodes(id) ON DELETE CASCADE,
    deadline DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'Belum Dimulai'
        CHECK (status IN ('Belum Dimulai', 'Sedang Berjalan', 'Menunggu Verifikasi', 'Selesai', 'Terlambat')),
    progress NUMERIC(5,2) NOT NULL DEFAULT 0,
    verifikasi_status VARCHAR(10) CHECK (verifikasi_status IN ('menunggu', 'disetujui', 'ditolak')),
    verifikasi_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    verifikasi_at TIMESTAMP NULL,
    verifikasi_catatan TEXT,
    created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id BIGINT REFERENCES teams(id) ON DELETE CASCADE,
    duplicated_from_id BIGINT REFERENCES tugas(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tugas_status ON tugas(status);
CREATE INDEX IF NOT EXISTS idx_tugas_created_at ON tugas(created_at);

-- ---- subtugas (Katim/Kasubag -> Anggota) ----
CREATE TABLE IF NOT EXISTS subtugas (
    id BIGSERIAL PRIMARY KEY,
    tugas_id BIGINT NOT NULL REFERENCES tugas(id) ON DELETE CASCADE,
    judul VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    assigned_to BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deadline DATE,
    progress NUMERIC(5,2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'Belum Dimulai' CHECK (status IN (
        'Belum Dimulai', 'Sedang Berjalan',
        'Menunggu Verifikasi Katim', 'Menunggu Verifikasi Kasubag',
        'Selesai', 'Terlambat'
    )),
    verifikasi_katim_status VARCHAR(10) CHECK (verifikasi_katim_status IN ('menunggu', 'disetujui', 'ditolak')),
    verifikasi_katim_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    verifikasi_katim_at TIMESTAMP NULL,
    verifikasi_katim_catatan TEXT,
    verifikasi_kasubag_status VARCHAR(10) CHECK (verifikasi_kasubag_status IN ('menunggu', 'disetujui', 'ditolak')),
    verifikasi_kasubag_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    verifikasi_kasubag_at TIMESTAMP NULL,
    verifikasi_kasubag_catatan TEXT,
    created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subtugas_status ON subtugas(status);

-- ---- subtugas_updates (riwayat progres) ----
CREATE TABLE IF NOT EXISTS subtugas_updates (
    id BIGSERIAL PRIMARY KEY,
    subtugas_id BIGINT NOT NULL REFERENCES subtugas(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    persentase NUMERIC(5,2) NOT NULL,
    catatan TEXT,
    status VARCHAR(30),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subtugas_updates_created_at ON subtugas_updates(created_at);

-- ---- subtugas_files (bukti kerja & lampiran tugas) ----
CREATE TABLE IF NOT EXISTS subtugas_files (
    id BIGSERIAL PRIMARY KEY,
    subtugas_update_id BIGINT REFERENCES subtugas_updates(id) ON DELETE CASCADE,
    tugas_id BIGINT REFERENCES tugas(id) ON DELETE CASCADE,
    subtugas_id BIGINT REFERENCES subtugas(id) ON DELETE CASCADE,
    file_path VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_type VARCHAR(10) NOT NULL DEFAULT 'lainnya' CHECK (file_type IN ('foto', 'pdf', 'dokumen', 'lainnya')),
    keterangan VARCHAR(255),
    uploaded_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ---- comments (catatan Kabalai/Kasubag/Katim) ----
CREATE TABLE IF NOT EXISTS comments (
    id BIGSERIAL PRIMARY KEY,
    tugas_id BIGINT REFERENCES tugas(id) ON DELETE CASCADE,
    subtugas_id BIGINT REFERENCES subtugas(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    komentar TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ---- notifications ----
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    judul VARCHAR(255) NOT NULL,
    isi TEXT,
    link VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ---- activity_logs ----
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    aksi VARCHAR(255) NOT NULL,
    tabel VARCHAR(255),
    record_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);