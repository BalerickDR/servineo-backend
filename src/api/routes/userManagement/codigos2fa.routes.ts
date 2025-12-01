import { Router } from "express";
import { verifyRecoveryCode } from "../../controllers/userManagement/codigos2fa.controller";

const router = Router();

// IMPORTANTE: debe coincidir EXACTAMENTE con el frontend (/codigos2fa/verify-recovery-code)
router.post("/verify-recovery-code", verifyRecoveryCode);

export default router;