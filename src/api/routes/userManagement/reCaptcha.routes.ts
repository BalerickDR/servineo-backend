import { Router } from "express";
import { verifyRecaptcha } from "../../controllers/userManagement/reCaptcha.controller";

const router = Router();

router.post("/verify-recaptcha", verifyRecaptcha);

export default router;
