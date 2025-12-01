import { Router } from 'express';
import { loginUsuario, loginGoogle, loginGithub, loginDiscord } from "../../controllers/userManagement/login.controller";
import { forgotPassword, magicLogin } from "../../controllers/userManagement/forgot.controller";

const router = Router();

router.post('/login', loginUsuario);
router.post("/google", loginGoogle);
router.post("/github", loginGithub);
router.post("/discord", loginDiscord);
router.post("/forgot-password", forgotPassword);
router.get("/magic-login", magicLogin);

export default router;