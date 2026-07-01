import { Router } from 'express';
import express from 'express';
import { handleCwmpRequest } from '../app/services/cwmp/handler.js';
import { handleCwmpUpload } from '../app/services/cwmp/uploadReceiver.js';
import { getClientIp } from '../app/helpers/clientIp.js';

const router = Router();
const rawUpload = express.raw({ type: () => true, limit: '100mb' });

router.post('/', (req, res, next) => {
  req.rawBody = typeof req.body === 'string' ? req.body : '';
  handleCwmpRequest(req, res).catch(next);
});

router.get('/', (req, res) => {
  console.log(`[cwmp-access] GET probe from ${getClientIp(req)}`);
  return res.status(200).end();
});

router.head('/', (req, res) => {
  console.log(`[cwmp-access] HEAD probe from ${getClientIp(req)}`);
  return res.status(200).end();
});

router.post('/upload/:taskId', rawUpload, handleCwmpUpload);
router.put('/upload/:taskId', rawUpload, handleCwmpUpload);

router.use((err, req, res, _next) => {
  console.error('[cwmp] unhandled error:', err.message);
  if (res.headersSent) return;
  res.status(200).end();
});

export default router;
