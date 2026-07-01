import { Router } from 'express';
import express from 'express';
import { handleCwmpRequest } from '../app/services/cwmp/handler.js';
import { handleCwmpUpload } from '../app/services/cwmp/uploadReceiver.js';
import config from '../app/config/index.js';

const router = Router();
const rawUpload = express.raw({ type: () => true, limit: '100mb' });

router.post(config.cwmp.path, (req, res) => handleCwmpRequest(req, res));
router.get(config.cwmp.path, (_req, res) => {
  res.type('text/plain').send('MyACS CWMP endpoint — POST SOAP requests here');
});

router.post(`${config.cwmp.path}/upload/:taskId`, rawUpload, handleCwmpUpload);
router.put(`${config.cwmp.path}/upload/:taskId`, rawUpload, handleCwmpUpload);

export default router;
