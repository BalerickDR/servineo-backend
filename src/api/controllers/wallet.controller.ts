import Stripe from 'stripe';
import axios from 'axios'; 
import { Request, Response } from 'express'; 
import { Wallet } from '../../models/wallet.model';
import User from '../../models/userPayment.model'; 
import { Recharge } from '../../models/walletRecharge.model';
import { computeWalletFlags } from '../../models/wallet/flags';
import { logFlagChangeHuman } from '../../models/wallet/prettyLog';
import 'dotenv/config';

// 1. Validaciones de entorno
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ ERROR: Falta STRIPE_SECRET_KEY en el .env');
  process.exit(1);
}

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
if (!RECAPTCHA_SECRET_KEY) {
  console.error('❌ ERROR: Falta RECAPTCHA_SECRET_KEY en el .env');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 🟢 SOLUCIÓN: Interfaz para los datos de Google
interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

// ----------------------------------------------------------------------
// 🔐 HELPER: VERIFICACIÓN DE RECAPTCHA 
// ----------------------------------------------------------------------
const verifyRecaptcha = async (token: string) => {
  try {
    // 🟢 SOLUCIÓN: Tipamos la llamada de Axios
    const response = await axios.post<RecaptchaResponse>(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: RECAPTCHA_SECRET_KEY,
          response: token,
        },
      }
    );

    // Ahora TypeScript reconoce success y score
    const { success, score } = response.data;
    console.log(`✅ reCAPTCHA Score: ${score}, Success: ${success}`);

    const MIN_SCORE = 0.5;

    // TypeScript ahora sabe que score puede ser undefined, así que usamos el operador "!" o "??" si es necesario,
    // o simplemente validamos que sea numérico implícitamente en la comparación.
    if (success && (score || 0) >= MIN_SCORE) {
      return { verified: true, score };
    } else {
      console.warn(`⚠️ reCAPTCHA falló: Score ${score} o verificación ${success}`);
      return { verified: false, score };
    }
  } catch (error: any) {
    console.error('❌ Error al llamar a la API de reCAPTCHA:', error.message);
    return { verified: false, score: 0 };
  }
};

// ----------------------------------------------------------------------
// 💳 CONTROLADOR: RECARGAR WALLET
// ----------------------------------------------------------------------
export const rechargeWallet = async (req: Request, res: Response) => {
  try {
    console.log('🔹 Entrada a rechargeWallet');

    const { userId, amount, recaptchaToken } = req.body;
    console.log('📥 Datos recibidos:', { 
      userId, 
      amount, 
      recaptchaToken: recaptchaToken ? 'RECIBIDO' : 'FALTA' 
    });

    const amountNumber = parseFloat(amount);
    if (!userId || !amountNumber || amountNumber <= 0) {
      console.warn('⚠️ Datos inválidos recibidos');
      return res.status(400).json({ message: 'Datos inválidos' });
    }

    // 🔒 1️⃣ VERIFICACIÓN DE RECAPTCHA
    if (!recaptchaToken) {
      console.warn('⚠️ Token reCAPTCHA faltante');
      return res.status(400).json({ message: 'Verificación de seguridad requerida.' });
    }

    const verification = await verifyRecaptcha(recaptchaToken);

    if (!verification.verified) {
      console.warn(`❌ Bloqueando transacción por bajo puntaje de reCAPTCHA: ${verification.score}`);
      return res.status(401).json({ 
        message: 'Verificación de seguridad fallida. Intenta nuevamente.', 
        score: verification.score 
      });
    }
    console.log('✅ Verificación reCAPTCHA exitosa.');

    // 2️⃣ Buscar al usuario
    const user = await User.findById(userId);
    console.log('🔹 Usuario encontrado:', user);
    if (!user) {
      console.warn('⚠️ Usuario no encontrado');
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // 3️⃣ Buscar o Crear Wallet
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

    // 📸 Guardamos el balance anterior
    const previousBalance = Number(wallet.balance ?? 0);

    // 4️⃣ Crear PaymentIntent en Stripe
    console.log('🔹 Creando PaymentIntent en Stripe');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountNumber * 100),
      currency: 'bob',
      description: `Recarga de wallet para usuario ${user._id}`,
      metadata: { userId: user._id.toString() },
    });
    console.log('✅ PaymentIntent creado:', paymentIntent.id);

    // 5️⃣ Actualizar balance
    wallet.balance += amountNumber;
    await wallet.save();
    console.log(`💰 Wallet de ${user.name} actualizado. Nuevo saldo: ${wallet.balance}`);

    // 🔄 5.1 Recalcular FLAGS
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

    // 6️⃣ Registrar la recarga en Historial
    try {
      console.log('🔹 Creando registro de recarga...');

      const newRecharge = new Recharge({
        walletId: wallet._id,
        amount: amountNumber,
        method: 'card', 
      });
      await newRecharge.save();

      console.log('✅ Registro de recarga creado:', newRecharge);

      return res.status(200).json({
        message: 'Recarga completada exitosamente',
        clientSecret: paymentIntent.client_secret,
        wallet,
        recharge: newRecharge,
      });

    } catch (rechargeError: unknown) {
      console.error('❌ Error al guardar el registro de recarga:', rechargeError);
      return res.status(500).json({
        message: 'Recarga procesada pero fallo al registrar la transacción',
        error: (rechargeError as Error).message,
        error: (rechargeError as Error).message,
        wallet,
      });
    }

  } catch (error: unknown) {
    console.error('❌ Error al recargar wallet:', error);
    res.status(500).json({ 
      message: 'Error interno', 
      error: (error as Error).message 
    });
  }
};