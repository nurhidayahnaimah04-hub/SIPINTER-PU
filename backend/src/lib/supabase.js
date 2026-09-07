import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

// Client Supabase khusus untuk Storage (upload bukti kerja, lampiran tugas, foto profil).
// Pakai SERVICE ROLE KEY (bukan anon key) supaya backend bisa upload ke bucket private/public
// tanpa terkena Row Level Security Storage. JANGAN pernah expose service role key ini ke frontend.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    '[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset di .env. ' +
      'Upload file (foto profil, lampiran tugas, bukti kerja) akan gagal sampai ini diisi.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
  // Kita cuma pakai fitur Storage, tapi supabase-js selalu menyalakan modul Realtime di
  // baliknya, dan modul itu butuh WebSocket bawaan Node (baru ada native di Node 22+).
  // Di Node < 22, tanpa ini akan crash: "Node.js detected but native WebSocket not found".
  // Jadi kita suplai implementasi WebSocket dari package `ws` secara manual di sini.
  realtime: { transport: ws },
});

// Nama bucket Supabase Storage tempat semua file (profil/lampiran-tugas/bukti-kerja) disimpan,
// dipisah per folder di dalam bucket yang sama. Bucket ini harus dibuat manual dulu di
// Supabase Dashboard > Storage, dan di-set "Public bucket" supaya file bisa dibuka lewat URL
// publik oleh sesama staff (katim/kasubag/anggota lain), tidak cuma oleh yang upload.
export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'sipinter-files';