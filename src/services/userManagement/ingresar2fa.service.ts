// src/modules/controlC/security/ingresar2fa/service.ts

import { authenticator } from 'otplib';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import clientPromise from '../../config/db/mongodb';

const JWT_SECRET = process.env.JWT_SECRET || "servineo_super_secret_key";
const TOKEN_EXPIRES = "2h";

const ENC_KEY_HEX = process.env.TOTP_ENC_KEY || ""; // misma clave usada en tu módulo 2FA
const ENC_KEY = Buffer.from(ENC_KEY_HEX, "hex");
const ALGO = "aes-256-gcm";

function decryptSecret(packed: string) {
  const { ct, iv, tag } = JSON.parse(packed);
  const decipher = crypto.createDecipheriv(ALGO, ENC_KEY, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  const pt = Buffer.concat([
    decipher.update(Buffer.from(ct, 'base64')),
    decipher.final(),
  ]);

  return pt.toString("utf8");
}

export async function verifyTOTPForEmail(email: string, token: string) {
  try {
    const mongo = await clientPromise;
    const db = mongo.db("ServineoBD");

    const user = await db.collection("users").findOne({ email });

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new Error("El usuario no tiene 2FA activo");
    }

    let secretPlain;
    try {
      secretPlain = decryptSecret(user.twoFactorSecret);
    } catch (err) {
      throw new Error("Error al desencriptar el secreto 2FA");
    }

    const isValid = authenticator.check(token, secretPlain);

    if (!isValid) {
      await db.collection("users").updateOne({ _id: user._id }, { $inc: { failedAttempts: 1 } });
      throw new Error("Código incorrecto");
    }

    const now = new Date();
    await db.collection("users").updateOne({ _id: user._id }, { $set: { failedAttempts: 0, twoFactorVerifiedAt: now } });

    const jwtToken = jwt.sign(
      { id: user._id.toString(), email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRES }
    );

    return {
      status: "exists",
      firstTime: false,
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        picture: user.picture ?? ""
      },
      token: jwtToken
    };

  } catch (err: any) {
    // Aquí lanzamos el error para que el controller lo maneje y devuelva status 400 o 500
    throw err;
  }
}
