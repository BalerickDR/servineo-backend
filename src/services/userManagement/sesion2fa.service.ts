// src/modules/controlC/security/sesion2fa/service.ts
import clientPromise from '../../config/db/mongodb';

interface TwoFactorStatus {
  exists: boolean;
  twoFactorEnabled: boolean;
  reason: string;
}

export async function checkTwoFactorStatusService(email: string): Promise<TwoFactorStatus> {

  if (!email) throw new Error('Email requerido');

  const client = await clientPromise;
  const db = client.db('ServineoBD');

  // Buscar el usuario en la colección 'users'
  const user = await db.collection('users').findOne({ email });

  if (!user) return { exists: false, twoFactorEnabled: false, reason: 'email_not_found' };

  const response = { exists: true, twoFactorEnabled: user.twoFactorEnabled || false, reason: 'ok' };

  return response;
}
