// src/modules/controlC/security/sesion2fa/controller.ts
import { Request, Response } from 'express';
import { checkTwoFactorStatusService } from '../../../services/userManagement/sesion2fa.service';

export const checkTwoFactorStatusController = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const status = await checkTwoFactorStatusService(email);

    return res.json({ success: true, data: status });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: 'Error en servidor' });
  }
};