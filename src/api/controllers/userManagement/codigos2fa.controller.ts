import { Request, Response } from "express";
import { verifyRecoveryCodeForEmail } from "../../../services/userManagement/codigos2fa.service";

export async function verifyRecoveryCode(req: Request, res: Response) {
  try {
    const { email, codigo } = req.body;
    const result = await verifyRecoveryCodeForEmail(email, codigo);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }

    return res.json({
      success: true,
      data: result.data,  // token + user
      message: result.message
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Error interno del servidor"
    });
  }
}