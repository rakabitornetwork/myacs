import { Router } from 'express';
import express from 'express';
import { handleCwmpRequest } from '../app/services/cwmp/handler.js';
import { handleCwmpUpload } from '../app/services/cwmp/uploadReceiver.js';
import config from '../app/config/index.js';
import { getClientIp } from '../app/helpers/clientIp.js';

const router = Router();
const rawUpload = express.raw({ type: () => true, limit: '100mb' });

const CWMP_PROBE_XML = '<?xml version="1.0" encoding="UTF-8"?>\n<cwmp/>';

function sendProbeResponse(res) {
  res.set('Content-Type', 'text/xml; charset=utf-8');
  return res.status(200).send(CWMP_PROBE_XML);
}

router.post(config.cwmp.path, (req, res) => {
  req.rawBody = typeof req.body === 'string' ? req.body : '';
  return handleCwmpRequest(req, res);
});

router.get(config.cwmp.path, (req, res) => {
  console.log(`[cwmp-access] GET probe from ${getClientIp(req)}`);
  return sendProbeResponse(res);
});

router.head(config.cwmp.path, (req, res) => {
  console.log(`[cwmp-access] HEAD probe from ${getClientIp(req)}`);
  res.set('Content-Type', 'text/xml; charset=utf-8');
  return res.status(200).end();
});

router.post(`${config.cwmp.path}/upload/:taskId`, rawUpload, handleCwmpUpload);
router.put(`${config.cwmp.path}/upload/:taskId`, rawUpload, handleCwmpUpload);

export default router;
