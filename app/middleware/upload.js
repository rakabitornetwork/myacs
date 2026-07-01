import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import crypto from 'crypto';
import config from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(__dirname, '../../uploads/firmware');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

export const uploadFirmware = multer({
  storage,
  limits: { fileSize: config.uploadMaxMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/octet-stream',
      'application/zip',
      'application/x-zip-compressed',
      'binary/octet-stream',
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(file.mimetype) || ['.bin', '.img', '.trx', '.zip', '.fw'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Tipe file tidak didukung. Gunakan .bin, .img, .trx, .zip'));
    }
  },
});

export { uploadDir };
