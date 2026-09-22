import path from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import apiRoutes from './routes/api.js';
import { hapusNotifikasiKedaluwarsa } from './utils/notificationCleanup.js';

dotenv.config();

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }
      
      const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').map((s) => s.trim());
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Akses diblokir oleh kebijakan CORS'));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/storage', express.static(path.join(process.cwd(), 'storage')));

app.get('/', (req, res) => {
  res.json({ message: 'Progress Kerja Balai PUPR API (Express.js) sedang berjalan.' });
});

app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route tidak ditemukan.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(422).json({ message: `Upload gagal: ${err.message}` });
  }
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Terjadi kesalahan pada server.' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);

  hapusNotifikasiKedaluwarsa().catch((err) => console.error('[cleanup] gagal:', err));
  setInterval(() => {
    hapusNotifikasiKedaluwarsa().catch((err) => console.error('[cleanup] gagal:', err));
  }, 24 * 60 * 60 * 1000);
});