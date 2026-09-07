import { Router } from 'express';

import { authenticate } from '../middleware/auth.js';
import { role } from '../middleware/role.js';
import { uploadProfil, uploadLampiranTugas, uploadBuktiKerja } from '../middleware/upload.js';

import * as AuthController from '../controllers/authController.js';
import * as DashboardController from '../controllers/dashboardController.js';
import * as PeriodeController from '../controllers/periodeController.js';
import * as TeamController from '../controllers/teamController.js';
import * as UserController from '../controllers/userController.js';
import * as TugasController from '../controllers/tugasController.js';
import * as SubtugasController from '../controllers/subtugasController.js';
import * as SubtugasUpdateController from '../controllers/subtugasUpdateController.js';
import * as VerifikasiController from '../controllers/verifikasiController.js';
import * as CommentController from '../controllers/commentController.js';
import * as NotificationController from '../controllers/notificationController.js';

// Kecilkan boilerplate try/catch di tiap route dengan wrapper async.
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const router = Router();

// ---- Publik ----
router.post('/login', h(AuthController.login));

// ---- Butuh login ----
router.use(h(authenticate));

router.post('/logout', h(AuthController.logout));
router.get('/me', h(AuthController.me));
router.post('/profile', uploadProfil.single('foto'), h(AuthController.updateProfile));

router.get('/dashboard', h(DashboardController.index));

// Periode (tahun anggaran)
router.get('/periodes', h(PeriodeController.index));
router.get('/periodes/:periode/histori-semester', h(PeriodeController.historiSemester));
router.post('/periodes', role('kabalai'), h(PeriodeController.store));
router.post('/periodes/:periode/aktifkan', role('kabalai'), h(PeriodeController.aktifkan));
router.delete('/periodes/:periode', role('kabalai'), h(PeriodeController.destroy));

// Teams
router.get('/teams', h(TeamController.index));
router.post('/teams', role('kabalai', 'kasubag'), h(TeamController.store));
router.put('/teams/:team', role('kabalai', 'kasubag'), h(TeamController.update));
router.delete('/teams/:team', role('kabalai', 'kasubag'), h(TeamController.destroy));

// User management
router.get('/users', role('kabalai', 'kasubag'), h(UserController.index));
router.post('/users', role('kabalai', 'kasubag'), h(UserController.store));
router.put('/users/:user', role('kabalai', 'kasubag'), h(UserController.update));
router.delete('/users/:user', role('kabalai', 'kasubag'), h(UserController.destroy));
router.delete('/users/:user/permanent', role('kabalai', 'kasubag'), h(UserController.destroyPermanent));

// katim & kasubag boleh melihat daftar user (untuk pilih anggota / assign)
router.get('/users-lite', role('kabalai', 'kasubag', 'katim'), h(UserController.index));

// Tugas (Kasubag -> Katim)
router.get('/tugas', h(TugasController.index));
router.get('/tugas/:tugas', h(TugasController.show));
router.post('/tugas', role('kasubag'), h(TugasController.store));
router.put('/tugas/:tugas', role('kasubag'), h(TugasController.update));
router.delete('/tugas/:tugas', role('kasubag'), h(TugasController.destroy));
router.post('/tugas/:tugas/verifikasi', role('kasubag'), h(TugasController.verifikasi));
router.post('/tugas/:tugas/duplicate', role('kasubag'), h(TugasController.duplicate));
router.post('/tugas/:tugas/lampiran', uploadLampiranTugas.single('file'), h(TugasController.uploadLampiran));

// Subtugas (Katim atau Kasubag -> Anggota)
router.get('/subtugas', h(SubtugasController.index));
router.get('/subtugas/:subtugas', h(SubtugasController.show));

// UBAH: Tambahkan upload middleware agar bisa menerima multi file (array 'files')
router.post(
  '/tugas/:tugas/subtugas', 
  role('katim', 'kasubag'), 
  uploadLampiranTugas.array('files'), 
  h(SubtugasController.store)
);

// UBAH: Tambahkan middleware uploadLampiranTugas.array('files') pada rute PUT
router.put(
  '/subtugas/:subtugas', 
  role('katim', 'kasubag'), 
  uploadLampiranTugas.array('files'), 
  h(SubtugasController.update)
);
router.delete('/subtugas/:subtugas', role('katim', 'kasubag'), h(SubtugasController.destroy));

// TAMBAHKAN BARIS INI UNTUK MENGHAPUS FILE LAMPIRAN:
router.delete('/subtugas/files/:fileId', role('katim', 'kasubag', 'anggota'), h(SubtugasController.destroyFile));

// Update progres + bukti (oleh Anggota pemilik subtugas)
router.post(
  '/subtugas/:subtugas/updates',
  uploadBuktiKerja.array('files'),
  h(SubtugasUpdateController.store)
);

// Verifikasi ganda: Katim (tahap 1) -> Kasubag (tahap 2, final)
router.post(
  '/subtugas/:subtugas/verifikasi-katim',
  role('katim', 'kasubag'),
  h(VerifikasiController.verifikasiKatim)
);
router.post(
  '/subtugas/:subtugas/verifikasi-kasubag',
  role('kasubag'),
  h(VerifikasiController.verifikasiKasubag)
);
router.get('/verifikasi/antrian-katim', role('katim'), h(VerifikasiController.antrianKatim));
router.get('/verifikasi/antrian-kasubag', role('kasubag'), h(VerifikasiController.antrianKasubag));

// Comments (catatan)
router.get('/comments', h(CommentController.index));
router.post('/comments', h(CommentController.store));

// Notifications
router.get('/notifications', h(NotificationController.index));
router.get('/notifications/unread-count', h(NotificationController.unreadCount));
router.post('/notifications/:id/read', h(NotificationController.markRead));
router.post('/notifications/read-all', h(NotificationController.markAllRead));
router.get('/notifications/stream', h(NotificationController.stream));

export default router;