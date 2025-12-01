import { Router } from "express";
import { registrarTelefono } from "../../controllers/userManagement/telefono.controller";
import { verifyJWT } from "../../controllers/userManagement/google.controller";

const router = Router();

router.post("/", verifyJWT, registrarTelefono);

export default router;