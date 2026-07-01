import { Router } from 'express';
import { guestOnly, requireAuth, requireWrite, requireManage } from '../app/middleware/auth.js';
import { uploadFirmware } from '../app/middleware/upload.js';
import * as AuthController from '../app/Http/Controllers/AuthController.js';
import * as DashboardController from '../app/Http/Controllers/DashboardController.js';
import * as PresetController from '../app/Http/Controllers/PresetController.js';
import * as FileController from '../app/Http/Controllers/FileController.js';
import * as FaultController from '../app/Http/Controllers/FaultController.js';
import * as UserController from '../app/Http/Controllers/UserController.js';

const router = Router();

router.get('/', (req, res) => {
  if (req.session?.userId) return res.redirect('/dashboard');
  return res.redirect('/login');
});

router.get('/login', guestOnly, AuthController.showLogin);
router.post('/login', guestOnly, AuthController.login);
router.post('/logout', requireAuth, AuthController.logout);

router.get('/dashboard', requireAuth, DashboardController.dashboard);
router.post('/sync/genieacs', requireAuth, requireWrite, DashboardController.syncGenieacs);
router.get('/devices', requireAuth, DashboardController.devicesIndex);
router.get('/devices/:id', requireAuth, DashboardController.devicesShow);
router.post('/devices/:id/reboot', requireAuth, requireWrite, DashboardController.createRebootTask);
router.post('/devices/:id/factory-reset', requireAuth, requireWrite, DashboardController.createFactoryResetTask);
router.post('/devices/:id/tasks/get-parameters', requireAuth, requireWrite, DashboardController.createGetParamsTask);
router.post('/devices/:id/tasks/get-parameter-names', requireAuth, requireWrite, DashboardController.createGetParamNamesTask);
router.post('/devices/:id/tasks/set-parameters', requireAuth, requireWrite, DashboardController.createSetParamsTask);
router.post('/devices/:id/tasks/upload', requireAuth, requireWrite, DashboardController.createUploadTask);
router.post('/devices/:id/connection-request', requireAuth, requireWrite, DashboardController.connectionRequest);
router.post('/devices/:id/firmware', requireAuth, requireWrite, DashboardController.createDownloadTask);
router.get('/tasks', requireAuth, DashboardController.tasksIndex);
router.post('/tasks/:id/cancel', requireAuth, requireWrite, DashboardController.cancelTask);

router.get('/faults', requireAuth, FaultController.faultsIndex);
router.post('/faults/:id/resolve', requireAuth, requireWrite, FaultController.faultsResolve);
router.post('/faults/resolve-all', requireAuth, requireManage, FaultController.faultsResolveAll);

router.get('/presets', requireAuth, PresetController.presetsIndex);
router.get('/presets/create', requireAuth, requireWrite, PresetController.presetsCreate);
router.post('/presets', requireAuth, requireWrite, PresetController.presetsStore);
router.get('/presets/:id/edit', requireAuth, requireWrite, PresetController.presetsEdit);
router.put('/presets/:id', requireAuth, requireWrite, PresetController.presetsUpdate);
router.delete('/presets/:id', requireAuth, requireManage, PresetController.presetsDestroy);
router.post('/presets/:id/toggle', requireAuth, requireWrite, PresetController.presetsToggle);

router.get('/files', requireAuth, FileController.filesIndex);
router.post('/files', requireAuth, requireWrite, uploadFirmware.single('file'), FileController.filesStore);
router.delete('/files/:id', requireAuth, requireManage, FileController.filesDestroy);

router.get('/users', requireAuth, requireManage, UserController.usersIndex);
router.post('/users', requireAuth, requireManage, UserController.usersStore);
router.post('/users/:id/toggle', requireAuth, requireManage, UserController.usersToggle);

export default router;
