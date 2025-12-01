// src/modules/controlC/security/2fa/service.ts
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import clientPromise from '../../config/db/mongodb'; // ya existente en tu repo

const ISSUER = process.env.TOTP_ISSUER || 'Servineo';
const ENC_KEY_HEX = process.env.TOTP_ENC_KEY || ''; // debe ser 64 hex chars (32 bytes)

if (!ENC_KEY_HEX || ENC_KEY_HEX.length !== 64) {
  // no throw en runtime si quieres, pero advierte
  console.warn('⚠️ TOTP_ENC_KEY no definido o tamaño incorrecto. Define 32 bytes hex en env.');
}
const ENC_KEY = Buffer.from(ENC_KEY_HEX, 'hex'); // 32 bytes

const ALGO = 'aes-256-gcm';

function encryptSecret(plain: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, ENC_KEY, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    ct: ct.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  });
}
function decryptSecret(packed: string) {
  const { ct, iv, tag } = JSON.parse(packed);
  const decipher = crypto.createDecipheriv(ALGO, ENC_KEY, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  const pt = Buffer.concat([decipher.update(Buffer.from(ct, 'base64')), decipher.final()]);
  return pt.toString('utf8');
}

export function generateSecret() {
  return authenticator.generateSecret(); // base32
}
export function buildOtpAuth(secret: string, accountName: string) {
  return authenticator.keyuri(accountName, ISSUER, secret);
}
export async function makeQrDataUrl(otpauth: string) {
  return QRCode.toDataURL(otpauth);
}
export function verifyToken(secret: string, token: string) {
  // tolerancia por defecto ok; si quieres window: authenticator.options = { window: 1 }
  return authenticator.check(token, secret);
}

export async function saveTempSecretForUser(userId: string, secretPlain: string) {
  const mongoClient = await clientPromise;
  const db = mongoClient.db('ServineoBD');
  const enc = encryptSecret(secretPlain);
  await db.collection('users').updateOne(
    { _id: new (require('mongodb').ObjectId)(userId) },
    { $set: { tempTwoFactorSecret: enc, tempTwoFactorIssuedAt: new Date() } }
  );
}

export async function getTempSecretForUser(userId: string) {
  const mongoClient = await clientPromise;
  const db = mongoClient.db('ServineoBD');
  const user = await db.collection('users').findOne({ _id: new (require('mongodb').ObjectId)(userId) });
  if (!user?.tempTwoFactorSecret) return null;
  try {
    return decryptSecret(user.tempTwoFactorSecret);
  } catch {
    return null;
  }
}

export async function activateTwoFactorForUser(userId: string, secretPlain: string, recoveryCodesPlain: string[]) {
  const mongoClient = await clientPromise;
  const db = mongoClient.db('ServineoBD');
  const enc = encryptSecret(secretPlain);
  // hash recovery codes
  const hashed = recoveryCodesPlain.map(c => crypto.createHash('sha256').update(c).digest('hex'));
  await db.collection('users').updateOne(
    { _id: new (require('mongodb').ObjectId)(userId) },
    {
      $set: {
        twoFactorEnabled: true,
        twoFactorSecret: enc,
        twoFactorVerifiedAt: new Date(),
        recoveryCodes: hashed,
      },
      $unset: { tempTwoFactorSecret: '', tempTwoFactorIssuedAt: '' },
    }
  );
}

export async function disableTwoFactorForUser(userId: string) {
  const mongoClient = await clientPromise;
  const db = mongoClient.db('ServineoBD');
  await db.collection('users').updateOne(
    { _id: new (require('mongodb').ObjectId)(userId) },
    { $set: { twoFactorEnabled: false }, $unset: { twoFactorSecret: '', recoveryCodes: '' } }
  );
}

export function genRecoveryCodes(count = 8) {
  // códigos en claro que se mostrarán una sola vez
  return Array.from({ length: count }).map(() => crypto.randomBytes(5).toString('hex')); // 10 hex chars
}
