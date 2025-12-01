// src/modules/controlC/security/ingresar2fa/controller.ts
import { Request, Response } from 'express';
import { verifyTOTPForEmail } from '../../../services/userManagement/ingresar2fa.service';

export async function verifyTOTPController(req: Request, res: Response) {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ status: "error", message: "Email o código no proporcionado" });
  }

  try {
    const result = await verifyTOTPForEmail(email, code);

    // ✅ En caso de éxito, devuelve mismo formato que login con Google
    return res.json(result);

  } catch (err: any) {

    // Devuelve mismo formato de error que Google Login
    return res.status(400).json({
      status: "error",
      message: err.message || "Error al verificar código TOTP"
    });
  }
}
