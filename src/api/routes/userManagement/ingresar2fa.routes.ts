// src/modules/controlC/security/ingresar2fa/routes.ts
import { Router } from 'express';
import { verifyTOTPController } from '../../controllers/userManagement/ingresar2fa.controller';

const router = Router();

// monta POST /verify-totp -> controller
router.post('/verify-totp', verifyTOTPController);

export default router;
