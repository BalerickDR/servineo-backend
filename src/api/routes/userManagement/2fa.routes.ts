// src/modules/controlC/security/2fa/routes.ts
import { Router } from 'express';
import { generate, verify, disable } from '../../controllers/userManagement/2fa.controller';
import { verifyJWT } from '../../controllers/userManagement/google.controller'; // ya tienes este middleware

const router = Router();

router.post('/generate', verifyJWT, generate);
router.post('/verify', verifyJWT, verify);
router.post('/disable', verifyJWT, disable);

export default router;
