import express from 'express';
import multer from 'multer';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './app/config/index.js';
import { logConfigValidation } from './app/config/validate.js';
import { connectDatabase } from './app/database.js';
import { ensureDefaultUser } from './app/seed.js';
import { inertiaMiddleware } from './app/middleware/inertia.js';
import { attachUser } from './app/middleware/auth.js';
import { startDeviceStatusJob } from './app/jobs/deviceStatus.js';
import { startGenieacsSyncJob } from './app/jobs/genieacsSync.js';
import { startTaskStaleJob } from './app/jobs/taskStale.js';
import { startPendingTaskWakeJob } from './app/jobs/pendingTaskWake.js';
import { healthCheck } from './app/services/health.js';
import webRoutes from './routes/web.js';
import cwmpRoutes from './routes/cwmp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('trust proxy', 1);

app.use(express.text({ type: ['text/xml', 'application/xml', 'application/soap+xml'], limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// CWMP harus sebelum session/web middleware — CPE tidak perlu cookie web & hindari delay Mongo session
if (config.cwmp.enabled) {
  app.use(cwmpRoutes);
}

app.use(
  session({
    name: 'myacs.sid',
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: config.mongoUri,
      ttl: 60 * 60 * 24 * 7,
    }),
    cookie: {
      secure: config.isProduction,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

app.use(inertiaMiddleware);
app.use(attachUser);

app.use('/build', express.static(path.join(__dirname, 'public/build'), { maxAge: config.isProduction ? '1y' : 0 }));
app.use('/uploads/firmware', express.static(path.join(__dirname, 'uploads/firmware')));
app.use('/uploads/cpe', express.static(path.join(__dirname, 'uploads/cpe')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/health', async (_req, res) => {
  try {
    const report = await healthCheck();
    res.status(report.status === 'ok' ? 200 : 503).json(report);
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

app.use(webRoutes);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message?.includes('Tipe file')) {
    req.session = req.session || {};
    req.session.flash = { type: 'error', message: err.message };
    return res.redirect('/files');
  }
  next(err);
});

app.use((req, res) => {
  if (req.headers['x-inertia'] === 'true') {
    return req.inertia.render('Error', { status: 404, message: 'Halaman tidak ditemukan' });
  }
  res.status(404).send('Not Found');
});

function logStartup() {
  console.log(`[myacs] ACS mode: ${config.acsMode}`);
  console.log(`[myacs] server running at ${config.appUrl} (port ${config.port})`);

  if (config.cwmp.enabled) {
    console.log(`[myacs] CWMP (CPE baru): ${config.appUrl}${config.cwmp.path}`);
  }

  if (config.acsMode === 'dual') {
    console.log(`[myacs] GenieACS CWMP (CPE lama): ${config.genieacs.cwmpUrl || 'port 7547'}`);
  }

  if (config.genieacs.syncEnabled && config.genieacs.mongoUri) {
    console.log(`[myacs] syncing GenieACS devices from ${config.genieacs.mongoUri}`);
  }
}

async function start() {
  logConfigValidation();
  await connectDatabase();
  await ensureDefaultUser();
  startDeviceStatusJob();
  startGenieacsSyncJob();
  startTaskStaleJob();
  startPendingTaskWakeJob();

  app.listen(config.port, logStartup);
}

start().catch((err) => {
  console.error('[myacs] failed to start:', err);
  process.exit(1);
});
