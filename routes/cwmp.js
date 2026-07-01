import { Router } from 'express';
import express from 'express';
import { handleCwmpRequest } from '../app/services/cwmp/handler.js';
import { handleCwmpUpload } from '../app/services/cwmp/uploadReceiver.js';
import config from '../app/config/index.js';

const router = Router();
const rawUpload = express.raw({ type: () => true, limit: '100mb' });

// Capture rawBody for CWMP POST so empty-POST detection works
// regardless of Content-Type (some CPEs send no Content-Type).
router.post(config.cwmp.path, (req, res, next) => {
  // If body was already captured as string by express.text(), rawBody is the string itself
  if (typeof req.body === 'string') {
    req.rawBody = req.body;
    return next();
  }
  // Otherwise, accumulate raw body manually
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    req.rawBody = Buffer.concat(chunks).toString('utf8');
    next();
  });
  // If body was already fully consumed by other middleware, rawBody may be empty
  if (req.readableEnded || req._readableState?.endEmitted) {
    req.rawBody = '';
    next();
  }
}, (req, res) => handleCwmpRequest(req, res));
router.get(config.cwmp.path, (_req, res) => {
  res.type('text/plain').send('MyACS CWMP endpoint — POST SOAP requests here');
});

router.post(`${config.cwmp.path}/upload/:taskId`, rawUpload, handleCwmpUpload);
router.put(`${config.cwmp.path}/upload/:taskId`, rawUpload, handleCwmpUpload);

export default router;
