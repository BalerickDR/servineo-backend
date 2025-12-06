// servineo-backend/src/api/controllers/wallet.controller.ts
import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { Wallet } from '../../models/wallet.model';
import { User } from '../../models/user.model';
import { Recharge } from '../../models/walletRecharge.model';
import { computeWalletFlags } from '../../models/wallet/flags';
import { logFlagChangeHuman } from '../../models/wallet/prettyLog';

import 'dotenv/config';

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ ERROR: Falta STRIPE_SECRET_KEY en el .env');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 💳 Procesar pago y actualizar wallet
export const rechargeWallet = async (req: Request, res: Response) => {
  try {
    console.log('🔹 Entrada a rechargeWallet');

    const { userId, amount } = req.body as any;
    console.log('📥 Datos recibidos:', { userId, amount });

    const amountNumber = parseFloat(amount);
    if (!userId || !amountNumber || amountNumber <= 0) {
      console.warn('⚠️ Datos inválidos recibidos');
      return res.status(400).json({ message: 'Datos inválidos' });
    }

    // 1️⃣ Buscar al usuario
    const user = await User.findById(userId);
    console.log('🔹 Usuario encontrado:', user);
    if (!user) {
      console.warn('⚠️ Usuario no encontrado');
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // 2️⃣ Buscar el wallet por users_id
    let wallet = await Wallet.findOne({ users_id: user._id });
    if (!wallet) {
      console.log('⚠️ Wallet no encontrado, creando uno nuevo...');
      wallet = new Wallet({
        users_id: user._id,
        balance: 0,
        currency: 'BOB',
        status: 'active',
        minimumBalance: 0,
        lowBalanceThreshold: 50,
      });
      await wallet.save();
      console.log('✅ Nuevo wallet creado:', wallet);
    } else {
      console.log('🔹 Wallet encontrado:', wallet);
    }

    // Guardamos el balance anterior antes de recargar (para recalcular flags)
    const previousBalance = Number(wallet.balance ?? 0);

    // 3️⃣ Crear PaymentIntent en Stripe
    console.log('🔹 Creando PaymentIntent en Stripe');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountNumber * 100),
      currency: 'bob',
      description: `Recarga de wallet para usuario ${user._id}`,
      metadata: { userId: user._id.toString() },
    });
    console.log('✅ PaymentIntent creado:', paymentIntent.id);

    // 4️⃣ Actualizar balance
    wallet.balance += amountNumber;
    await wallet.save();
    console.log(`💰 Wallet de ${user.name} actualizado. Nuevo saldo: ${wallet.balance}`);

    // 4.1️ Recalcular flags de saldo bajo / crítico con la misma lógica centralizada
    try {
      const pre = previousBalance;
      const post = Number(wallet.balance ?? 0);
      const thr = Number(wallet.lowBalanceThreshold ?? 0);

      const { nextFlags, state, changed, crossed } = computeWalletFlags({
        preBalance: pre,
        postBalance: post,
        lowBalanceThreshold: thr,
        prevFlags: (wallet as any).flags ?? null,
      });

      if (changed) {
        logFlagChangeHuman({
          fixerId: String(wallet.users_id),
          pre,
          post,
          thr,
          state,
          crossed,
          flags: nextFlags,
          currency: wallet.currency || 'BOB',
        });

        const patch: any = {
          flags: nextFlags,
        };

        // Si sigue en low/critical, actualizamos lastLowBalanceNotification;
        // si ya salió de low/critical, podemos dejarla como está o limpiarla.
        if (nextFlags.needsLowAlert || nextFlags.needsCriticalAlert) {
          patch.lastLowBalanceNotification = new Date();
        }

        await Wallet.findByIdAndUpdate(wallet._id, { $set: patch });
        console.log('✅ Flags de wallet recalculados tras recarga:', nextFlags);
      } else {
        console.log('ℹ️ Flags de wallet sin cambios tras recarga');
      }
    } catch (flagErr) {
      console.error('⚠️ No se pudieron recalcular flags de wallet tras recarga:', flagErr);
    }

    // 5️⃣ Intentar registrar la recarga

    console.log('WalletID', wallet._id);
    console.log('monto para recarga', amountNumber);
    try {
      console.log('🔹 Creando registro de recarga...');

      const newRecharge = new Recharge({
        walletId: wallet._id,
        amount: amountNumber,
      });
      await newRecharge.save();

      console.log('✅ Registro de recarga creado:', newRecharge);

      return res.status(200).json({
        message: 'Recarga completada exitosamente',
        clientSecret: paymentIntent.client_secret,
        wallet,
        recharge: newRecharge, // opcional, para devolver el registro
      });
    } catch (rechargeError: any) {
      console.error('❌ Error al guardar el registro de recarga:', rechargeError);
      // No revertimos el balance, pero notificamos el error
      return res.status(500).json({
        message: 'Recarga procesada pero fallo al registrar la transacción',
        error: (rechargeError as Error).message,
        wallet,
      });
    }
  } catch (error) {
    console.error('❌ Error al recargar wallet:', error);
    res.status(500).json({ message: 'Error interno', error: (error as Error).message });
  }
};
