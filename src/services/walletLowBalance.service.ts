// servineo-backend/src/services/walletLowBalance.service.ts
import type { ClientSession } from "mongoose";
import { Wallet } from "../models/wallet.model";

interface LowBalanceParams {
  walletId: string;
  preBalance: number;
  postBalance: number;
  lowBalanceThreshold?: number;
  session?: ClientSession;
}

/**
 * Actualiza los flags de saldo bajo / crítico en la wallet
 * según el diagrama de "Cruce de umbral o enfriamiento".
 * */
export async function updateWalletLowBalanceFlags({
  walletId,
  preBalance,
  postBalance,
  lowBalanceThreshold = 50,
  session,
}: LowBalanceParams) {
  const now = new Date();

  const wallet = await Wallet.findById(walletId)
    .select("flags lastLowBalanceNotification lowBalanceThreshold")
    .session(session || null);

  if (!wallet) {
    console.warn("[walletLowBalance] Wallet no encontrada:", walletId);
    return;
  }

  const threshold = wallet.lowBalanceThreshold ?? lowBalanceThreshold;

  const currentFlags = wallet.flags || {
    needsLowAlert: false,
    needsCriticalAlert: false,
    cooldownUntil: null,
    updatedAt: undefined,
  };

  const inCooldown =
    currentFlags.cooldownUntil &&
    currentFlags.cooldownUntil.getTime() > now.getTime();

  const isCritical = postBalance <= 0;
  const isLow = postBalance > 0 && postBalance <= threshold;
  const isHealthy = postBalance > threshold;

  const update: Record<string, any> = {};
  let shouldNotify = false;

  if (isCritical) {
    // Condición de disparo: venía sano (pre > 0) O ya pasó el enfriamiento
    const crossingThreshold = preBalance > 0;
    const cooldownFinished = !inCooldown;
    shouldNotify = crossingThreshold || cooldownFinished;

    update["flags.needsCriticalAlert"] = true;
    update["flags.needsLowAlert"] = false;
    update["flags.updatedAt"] = now;

    if (shouldNotify) {
      update["flags.cooldownUntil"] = new Date(
        now.getTime() + 24 * 60 * 60 * 1000,
      ); // +24h
      update["lastLowBalanceNotification"] = now;
    }
  } else if (isLow) {
    const crossingThreshold = preBalance > threshold;
    const cooldownFinished = !inCooldown;
    shouldNotify = crossingThreshold || cooldownFinished;

    update["flags.needsLowAlert"] = true;
    update["flags.needsCriticalAlert"] = false;
    update["flags.updatedAt"] = now;

    if (shouldNotify) {
      update["flags.cooldownUntil"] = new Date(
        now.getTime() + 24 * 60 * 60 * 1000,
      ); // +24h
      update["lastLowBalanceNotification"] = now;
    }
  } else if (isHealthy) {
    // Balance sano: limpiamos flags
    update["flags.needsLowAlert"] = false;
    update["flags.needsCriticalAlert"] = false;
    update["flags.cooldownUntil"] = null;
    update["flags.updatedAt"] = now;
  }

  if (Object.keys(update).length > 0) {
    await Wallet.findByIdAndUpdate(walletId, { $set: update }, { session });
    console.log("[walletLowBalance] Flags actualizados para wallet", walletId, {
      preBalance,
      postBalance,
      isCritical,
      isLow,
      isHealthy,
      shouldNotify,
    });
  }

  return {
    preBalance,
    postBalance,
    isCritical,
    isLow,
    isHealthy,
    shouldNotify,
  };
}
