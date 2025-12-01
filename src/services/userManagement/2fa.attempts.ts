// src/modules/controlC/security/2fa/attempts.ts
import clientPromise from '../../config/db/mongodb';
import { ObjectId } from 'mongodb';

const MAX = parseInt(process.env.TOTP_MAX_ATTEMPTS || '5', 10);
const LOCK_MINUTES = parseInt(process.env.TOTP_LOCK_MINUTES || '5', 10);

/**
 * Verifica si el usuario está bloqueado por demasiados intentos de 2FA.
 */
export async function isLocked(userId: string) {
  const client = await clientPromise;
  const db = client.db('ServineoBD');
  const user = await db
    .collection('users')
    .findOne(
      { _id: new ObjectId(userId) },
      { projection: { twoFactorLockedUntil: 1 } }
    );

  const raw = user?.twoFactorLockedUntil ?? null;
  const lockedUntil = raw ? new Date(raw) : null;

  if (lockedUntil && lockedUntil.getTime() > Date.now()) {
    const retryAfterSeconds = Math.ceil(
      (lockedUntil.getTime() - Date.now()) / 1000
    );
    return {
      locked: true,
      lockedUntil: lockedUntil.toISOString(),
      retryAfterSeconds,
    };
  }

  return { locked: false };
}

/**
 * Registra un intento fallido y devuelve:
 *  - si quedó bloqueado
 *  - cuántos intentos se han hecho
 *  - cuántos quedan
 */
export async function recordFailedAttempt(userId: string) {
  const client = await clientPromise;
  const db = client.db('ServineoBD');
  const col = db.collection('users');

  // 1) incrementamos el contador
  const upd = await col.updateOne(
    { _id: new ObjectId(userId) },
    {
      $inc: { twoFactorFailedAttempts: 1 },
      $set: { updatedAt: new Date() },
    }
  );

  // si no matcheó ningún user, devolvemos algo neutro
  if (!upd.matchedCount) {
    console.warn('[2FA] recordFailedAttempt: usuario no encontrado para', userId);
    return {
      locked: false,
      attempts: 0,
      attemptsLeft: MAX,
    };
  }

  // 2) leemos el valor ACTUAL desde la BD
  const user = await col.findOne(
    { _id: new ObjectId(userId) },
    { projection: { twoFactorFailedAttempts: 1 } }
  );

  let attempts = 0;
  if (user && typeof (user as any).twoFactorFailedAttempts === 'number') {
    attempts = (user as any).twoFactorFailedAttempts;
  }

  // 3) ¿ya superó o alcanzó el máximo?
  if (attempts >= MAX) {
    const lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
    await col.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          twoFactorLockedUntil: lockedUntil,
          updatedAt: new Date(),
        },
        $unset: { twoFactorFailedAttempts: '' },
      }
    );
    return {
      locked: true,
      lockedUntil: lockedUntil.toISOString(),
      attempts,
    };
  }

  return {
    locked: false,
    attempts,
    attemptsLeft: Math.max(0, MAX - attempts),
  };
}

/**
 * Resetea los contadores al éxito.
 */
export async function resetAttempts(userId: string) {
  const client = await clientPromise;
  const db = client.db('ServineoBD');
  await db.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    {
      $unset: {
        twoFactorFailedAttempts: '',
        twoFactorLockedUntil: '',
      },
      $set: { updatedAt: new Date() },
    }
  );
}