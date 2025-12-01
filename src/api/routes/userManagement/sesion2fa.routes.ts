// src/modules/controlC/security/sesion2fa/routes.ts
import { Router } from 'express';
import { checkTwoFactorStatusController } from '../../controllers/userManagement/sesion2fa.controller';

const router = Router();

router.post('/check-status', checkTwoFactorStatusController);

export default router;

