import fs from 'fs';
import path from 'path';
import AcsFile from '../../models/AcsFile.js';
import config from '../../config/index.js';
import { uploadDir } from '../../middleware/upload.js';

export async function filesIndex(req, res) {
  const files = await AcsFile.find().sort({ createdAt: -1 }).lean();

  const flash = req.session.flash || null;
  delete req.session.flash;

  return req.inertia.render('Files/Index', {
    files: files.map((f) => ({
      id: f._id.toString(),
      name: f.name,
      filename: f.filename,
      type: f.type,
      size: f.size,
      url: f.url,
      createdAt: f.createdAt,
    })),
    uploadMaxMb: config.uploadMaxMb,
    flash,
  });
}

export async function filesStore(req, res) {
  if (!req.file) {
    req.session.flash = { type: 'error', message: 'File wajib dipilih' };
    return res.redirect('/files');
  }

  const { name, type } = req.body;
  const fileUrl = `${config.appUrl}/uploads/firmware/${req.file.filename}`;

  await AcsFile.create({
    name: name?.trim() || req.file.originalname,
    filename: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
    type: type || 'firmware',
    url: fileUrl,
  });

  return res.redirect('/files');
}

export async function filesDestroy(req, res) {
  const file = await AcsFile.findById(req.params.id);
  if (!file) return res.status(404).send('File not found');

  const filePath = path.join(uploadDir, file.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await file.deleteOne();
  return res.redirect('/files');
}
