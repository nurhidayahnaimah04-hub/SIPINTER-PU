import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { supabase, STORAGE_BUCKET } from '../lib/supabase.js';

// PENTING: sebelumnya file disimpan di disk lokal (backend/storage) lalu diserve statis
// lewat /storage. Ini menyebabkan "Route tidak ditemukan" saat staff lain membuka bukti
// kerja: begitu proses backend restart/deploy ulang, atau berjalan di lebih dari satu
// instance, file yang ada di disk instance A tidak ada di disk instance B — request GET
// ke /storage/... tidak match middleware static, jatuh ke 404 handler Express.
//
// Sekarang file di-upload ke Supabase Storage (object storage terpusat, bukan disk lokal),
// jadi semua staff & semua instance backend mengakses file yang sama lewat URL publik yang
// stabil, terlepas dari instance mana yang menangani request.
const memoryStorage = multer.memoryStorage();

export const uploadProfil = multer({
  storage: memoryStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB, sama dengan validasi Laravel (max:2048 KB)
});

export const uploadLampiranTugas = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB (max:10240 KB)
});

export const uploadBuktiKerja = multer({
  storage: memoryStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB (max:20480 KB)
});

/**
 * Klasifikasi tipe file, port dari logika di TugasController & SubtugasUpdateController.
 */
export function classifyFileType(originalName) {
  const ext = path.extname(originalName).replace('.', '').toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'foto';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'dokumen';
  return 'lainnya';
}

/**
 * Upload 1 file (hasil multer memoryStorage, jadi berupa buffer di memori) ke Supabase
 * Storage, di dalam folder/subfolder tertentu (profil | lampiran-tugas | bukti-kerja).
 * Mengembalikan path relatif di dalam bucket (untuk disimpan di DB) dan URL publiknya
 * (untuk langsung ditampilkan di frontend).
 */
export async function uploadToSupabase(file, subfolder) {
  const ext = path.extname(file.originalname).toLowerCase();
  const filename = `${crypto.randomBytes(20).toString('hex')}${ext}`;
  const objectPath = `${subfolder}/${filename}`;

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(objectPath, file.buffer, {
    contentType: file.mimetype || 'application/octet-stream',
    upsert: false,
  });

  if (error) {
    const e = new Error(`Gagal upload file ke Supabase Storage: ${error.message}`);
    e.status = 500;
    throw e;
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(objectPath);

  return { path: objectPath, url: data.publicUrl };
}

/**
 * Resolve nilai yang tersimpan di kolom file_path/foto jadi URL yang bisa dibuka browser.
 * - Data baru: sudah berupa URL publik Supabase yang lengkap (https://...) -> dikembalikan apa adanya.
 * - Data lama (peninggalan sebelum migrasi ke Supabase Storage, path lokal semacam
 *   "bukti-kerja/xxxx.pdf") -> tetap dirangkai ke /storage/... seperti sebelumnya, sekadar
 *   fallback supaya tidak error; file lama ini sebaiknya diunggah ulang oleh staf terkait
 *   karena file fisiknya kemungkinan sudah tidak ada lagi di disk server.
 */
export function fileUrl(req, filePathOrUrl) {
  if (!filePathOrUrl) return null;
  if (/^https?:\/\//i.test(filePathOrUrl)) return filePathOrUrl;
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}/storage/${filePathOrUrl}`;
}