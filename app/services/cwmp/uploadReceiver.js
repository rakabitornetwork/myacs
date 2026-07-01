import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Task from '../../models/Task.js';
import AcsFile from '../../models/AcsFile.js';
import config from '../../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const cpeUploadDir = path.join(__dirname, '../../../uploads/cpe');

export async function handleCwmpUpload(req, res) {
  const task = await Task.findById(req.params.taskId);
  if (!task || task.method !== 'Upload') {
    return res.status(404).send('Not found');
  }

  if (!fs.existsSync(cpeUploadDir)) {
    fs.mkdirSync(cpeUploadDir, { recursive: true });
  }

  const body = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(typeof req.body === 'string' ? req.body : '', 'utf8');

  if (!body.length) {
    return res.status(400).send('Empty body');
  }

  const safeDevice = task.deviceId.replace(/[^a-z0-9._-]/gi, '_');
  const filename = `${task._id}-${safeDevice}.bin`;
  const filePath = path.join(cpeUploadDir, filename);

  fs.writeFileSync(filePath, body);

  const fileUrl = `${config.appUrl}/uploads/cpe/${filename}`;

  await AcsFile.create({
    name: `CPE Upload: ${task.deviceId}`,
    filename,
    size: body.length,
    type: 'config',
    url: fileUrl,
    mimeType: req.headers['content-type'] || 'application/octet-stream',
  });

  await Task.findByIdAndUpdate(task._id, {
    status: 'completed',
    completedAt: new Date(),
    result: { receivedBytes: body.length, filename, url: fileUrl },
  });

  return res.status(200).send('OK');
}
