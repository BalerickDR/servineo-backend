// src/api/services/wallet/lowBalance.service.ts
import { ClientSession } from 'mongoose';
import { Wallet as WalletModel } from '../../models/wallet.model';
// import NotificationModel from '../../models/Notification.model'; // tu colección de notificaciones

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

/**
 * Registra una notificación en la colección `notifications`
 * type: "wallet_low_balance"
 */
async function createLowBalanceNotification(
  userId: string,
  level: 'low' | 'critical',
  postBalance: number,
  session?: ClientSession,
) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);

  // Máximo 3 notificaciones en 7 días
  // TODO: Uncomment when NotificationModel is available
  // const sentLast7Days = await NotificationModel.countDocuments({
  //   userId,
  //   type: 'wallet_low_balance',
  //   createdAt: { $gte: sevenDaysAgo },
  // }).session(session || null);

  // if (sentLast7Days >= 3) {
  //   return;
  // }

  // await NotificationModel.create(
  //   [
  //     {
  //       userId,
  //       type: 'wallet_low_balance',
  //       channel: ['in_app', 'email', 'push'], // o lo que uses
  //       status: 'sent',
  //       meta: {
  //         level, // "low" | "critical"
  //         postBalance,
  //       },
  //     },
  //   ],
  //   { session },
  // );

  console.log(
    `TODO: Send notification for userId ${userId}, level: ${level}, balance: ${postBalance}`,
  );
}

/**
 * Se usa cuando se APLICA UNA COMISIÓN (flujo 2 de tu diagrama).
 * preBalance = saldo antes de restar la comisión
 * postBalance = saldo después de la comisión (pre - comisión)
 */
export async function handleCommissionApplied(
  walletId: string,
  userId: string,
  preBalance: number,
  postBalance: number,
  session?: ClientSession,
) {
  const now = new Date();

  // 1. Persistir el post-balance
  const wallet = await WalletModel.findByIdAndUpdate(
    walletId,
    {
      $set: {
        balance: postBalance,
        updatedAt: now,
      },
    },
    { new: true, session },
  );

  if (!wallet) return;

  // 2. Si el balance es sano (> 0) → clear flags y salir
  if (postBalance > 0) {
    await WalletModel.findByIdAndUpdate(
      walletId,
      {
        $set: {
          'flags.needsLowAlert': false,
          'flags.needsCriticalAlert': false,
          'flags.cooldownUntil': null,
          'flags.updatedAt': now,
        },
      },
      { session },
    );
    return;
  }

  // 3. post <= 0 ⇒ posible disparo de notificación
  const wasHealthyBefore = preBalance > 0;

  const cooldownUntil = wallet.flags?.cooldownUntil ? new Date(wallet.flags.cooldownUntil) : null;
  const cooldownPassed = !cooldownUntil || now >= cooldownUntil;

  // Condición de tu diagrama:
  // (pre > 0) OR (ahora >= enfriamiento)
  if (!wasHealthyBefore && !cooldownPassed) {
    // No notificar, solo mantener flags actuales
    return;
  }

  // Determinar nivel: 0 ⇒ low, < 0 ⇒ critical
  const level: 'low' | 'critical' = postBalance < 0 ? 'critical' : 'low';

  // 4. Set flags críticos y cooldown
  const update: any = {
    'flags.updatedAt': now,
    'flags.cooldownUntil': new Date(now.getTime() + ONE_DAY_MS), // ahora + 24h
    lastLowBalanceNotification: now,
  };

  if (level === 'critical') {
    update['flags.needsCriticalAlert'] = true;
    update['flags.needsLowAlert'] = false;
  } else {
    update['flags.needsLowAlert'] = true;
    update['flags.needsCriticalAlert'] = false;
  }

  await WalletModel.findByIdAndUpdate(walletId, { $set: update }, { session });

  // 5. Registrar notificación (in_app + email/push si luego los consumes)
  await createLowBalanceNotification(userId, level, postBalance, session);
}

/**
 * Se usa cuando hay RECARGA / ABONO (flujo 1 de tu diagrama).
 * Si postBalance > 0 ⇒ apagar flags.
 * Si postBalance <= 0 ⇒ mantener flags actuales.
 */
export async function handleTopUpApplied(
  walletId: string,
  preBalance: number,
  postBalance: number,
  session?: ClientSession,
) {
  const now = new Date();

  // 1. Persistir post-balance
  const wallet = await WalletModel.findByIdAndUpdate(
    walletId,
    {
      $set: {
        balance: postBalance,
        updatedAt: now,
      },
    },
    { new: true, session },
  );
  if (!wallet) return;

  // 2. Si el nuevo saldo es > 0 → apagar flags (según diagrama)
  if (postBalance > 0) {
    await WalletModel.findByIdAndUpdate(
      walletId,
      {
        $set: {
          'flags.needsLowAlert': false,
          'flags.needsCriticalAlert': false,
          'flags.cooldownUntil': null,
          'flags.updatedAt': now,
        },
      },
      { session },
    );
  }
  // Si sigue en 0 o negativo, no tocamos flags: “Mantener flags actuales”
}
