import { Request, Response } from "express";

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY!; 

export const verifyRecaptcha = async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: "No se envió el token" });
  }

  try {
    const params = new URLSearchParams();
    params.append("secret", RECAPTCHA_SECRET);
    params.append("response", token);

    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      body: params,
    });

    const data = await response.json();

    if (data.success) {
      return res.json({ success: true, message: "Captcha válido" });
    } else {
      return res.json({ success: false, message: "Captcha inválido" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Error al verificar captcha" });
  }
};
