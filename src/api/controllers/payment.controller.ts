import type { Request, Response } from "express";
import Stripe from "stripe";
import axios from 'axios'; // 🟢 CRÍTICO: Necesario para tu ReCAPTCHA
import { Payment } from "../../models/payment.model";
import Card from "../../models/card.model"; // Importación por defecto
import User from "../../models/userPayment.model"; // Usamos la del general para pagos
import Job from '../../models/jobs.model'; // 🟢 Mantenemos TU modelo local para el status
import 'dotenv/config';

// 1. Validar claves al inicio
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ ERROR: Falta STRIPE_SECRET_KEY en el archivo .env');
  process.exit(1);
}

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
if (!RECAPTCHA_SECRET_KEY) {
  console.error("❌ ERROR: Falta RECAPTCHA_SECRET_KEY en el archivo .env");
  process.exit(1);
}

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
if (!RECAPTCHA_SECRET_KEY) {
  console.error("❌ ERROR: Falta RECAPTCHA_SECRET_KEY en el archivo .env");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiVersion: "2024-06-20" as any,
});

// 🟢 SOLUCIÓN: Definimos la forma de la respuesta de Google
interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

// ----------------------------------------------------------------------
// 🔐 FUNCIÓN DE VERIFICACIÓN DE RECAPTCHA
// ----------------------------------------------------------------------
const verifyRecaptchaToken = async (token: string) => {
  try {
    // 🟢 SOLUCIÓN: Le decimos a axios que la respuesta tendrá la forma de <RecaptchaResponse>
    const response = await axios.post<RecaptchaResponse>(
      `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${token}`
    );
    // Ahora TypeScript sabe que 'success' existe y es un booleano
    return response.data.success;
  } catch (error) {
    console.error("❌ Error al contactar con la API de reCAPTCHA:", error);
    return false;
  }
};

// ----------------------------------------------------------------------
// 💳 CONTROLADOR PRINCIPAL
// ----------------------------------------------------------------------
export const createPayment = async (req: Request, res: Response) => {
  console.group("🧾 [createPayment] Nueva solicitud de pago");
  console.time("⏱ Duración total del proceso");

  try {
    // 🆕 Desestructuración incluyendo recaptchaToken
    const { requesterId, fixerId, jobId, cardId, amount, paymentMethodId, recaptchaToken } = req.body;

    console.log("📥 Datos recibidos:", { 
      requesterId, fixerId, jobId, cardId, amount, paymentMethodId, 
      recaptchaToken: recaptchaToken ? 'PRESENTE' : 'FALTANTE' 
    });

    // --- 🔐 1. VERIFICACIÓN DE RECAPTCHA (Tu lógica Local) ---
    if (!recaptchaToken) {
      console.error("❌ Token de reCAPTCHA requerido.");
      return res.status(400).json({ error: "Verificación de seguridad fallida: Token de reCAPTCHA requerido." });
    }

    const isCaptchaValid = await verifyRecaptchaToken(recaptchaToken);
    
    if (!isCaptchaValid) {
      console.error("❌ Verificación de reCAPTCHA fallida.");
      return res.status(400).json({ error: "Verificación de seguridad fallida. Inténtalo de nuevo." });
    }

    console.log("✅ Token de reCAPTCHA verificado con éxito.");
    // --- FIN DE VERIFICACIÓN DE RECAPTCHA ---

    // --- VALIDACIONES BÁSICAS ---
    if (!requesterId || !fixerId || !jobId || !amount) {
      console.error('❌ Faltan datos obligatorios en la solicitud');
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    if (isNaN(amount) || amount <= 0) {
      console.error('❌ El monto debe ser un número positivo');
      return res.status(400).json({ error: 'El monto debe ser un número positivo' });
    }

    // --- BUSCAR USUARIOS ---
    console.log('🔍 Buscando requester y fixer...');
    const [requester, fixer] = await Promise.all([
      User.findById(requesterId),
      User.findById(fixerId),
    ]);

    if (!requester) {
      console.error(`❌ Requester ${requesterId} no encontrado`);
      return res.status(404).json({ error: 'Requester no encontrado' });
    }

    if (!fixer) {
      console.error(`❌ Fixer ${fixerId} no encontrado`);
      return res.status(404).json({ error: 'Fixer no encontrado' });
    }

    // Validar roles
    if (requester.role !== "requester") {
      console.error("⚠️ El pagador no tiene rol 'requester'");
    }
    if (fixer.role !== "fixer") {
      console.error("⚠️ El receptor no tiene rol 'fixer'");
    }

    // --- CREAR CLIENTE STRIPE SI NO EXISTE ---
    let customerId = requester.stripeCustomerId;
    if (!customerId) {
      console.log('🆕 Creando nuevo cliente Stripe...');
      const customer = await stripe.customers.create({
        email: requester.email,
        name: requester.name,
      });

      // Guardamos el ID en el usuario
      requester.stripeCustomerId = customer.id;
      await requester.save();

      customerId = customer.id;
      console.log(`✅ Cliente Stripe creado: ${customerId}`);
    } else {
      console.log(`🟢 Cliente Stripe existente: ${customerId}`);
    }

    // --- OBTENER MÉTODO DE PAGO ---
    let stripePaymentMethodId;

    if (cardId) {
      console.log('💳 Buscando tarjeta por ID...');
      const card = await Card.findById(cardId);
      if (!card) {
        return res.status(404).json({ error: "Card no encontrada" });
      }
      // Convertimos a string para asegurar comparación correcta
      if (card.userId.toString() !== requesterId.toString()) {
        return res.status(400).json({ error: "La tarjeta no pertenece al requester" });
      }
      stripePaymentMethodId = card.stripePaymentMethodId;
    } else if (paymentMethodId) {
      stripePaymentMethodId = paymentMethodId;
      console.log('💳 Usando paymentMethodId temporal del frontend');
    } else {
      return res.status(400).json({ error: "No se proporcionó tarjeta ni PaymentMethod" });
    }

    // --- CREAR INTENTO DE PAGO ---
    console.log('🚀 Creando PaymentIntent en Stripe...');
    let paymentIntent;

    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe usa centavos
        currency: 'BOB',
        customer: customerId,
        payment_method: stripePaymentMethodId,
        confirm: true, // Intenta cobrar inmediatamente
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never', // Importante para evitar flujos de 3D Secure complejos sin frontend preparado
        },
      });
      console.log("✅ PaymentIntent creado:", paymentIntent.id, "Estado:", paymentIntent.status);
    } catch (stripeError: unknown) {
      console.error("❌ Error al crear PaymentIntent:", (stripeError as Error).message);
      return res.status(400).json({
        error: "Error al procesar el pago con Stripe",
        details: (stripeError as Error).message,
      });
    }

    // --- GUARDAR PAGO EN MONGODB ---
    console.log('🗃️ Guardando información del pago en MongoDB...');
    const paymentData = await Payment.create({
      requesterId,
      fixerId,
      jobId,
      cardId: cardId || null,
      temporaryPaymentMethodId: cardId ? null : paymentMethodId,
      amount,
      status: paymentIntent.status === 'succeeded' ? 'paid' : 'pending',
      paymentIntentId: paymentIntent.id,
    });

    // --- ACTUALIZAR ESTADO DEL TRABAJO ---
    const job = await Job.findById(jobId);
    if (job) {
      job.status = paymentIntent.status === "succeeded" ? "Pagado" : "Pago pendiente";
      await job.save();
      console.log(`🧱 Estado del trabajo actualizado a '${job.status}'`);
    } else {
      console.error(`⚠️ Trabajo con ID ${jobId} no encontrado`);
    }

    console.timeEnd('⏱ Duración total del proceso');
    console.groupEnd();

    return res.json({
      message: '✅ Pago procesado correctamente',
      payment: paymentData,
    });

  } catch (error: unknown) {
    console.error("🔥 Error inesperado en createPayment:", error);
    console.timeEnd("⏱ Duración total del proceso");
    console.groupEnd();

    return res.status(500).json({
      error: "Error inesperado en el servidor",
      details: (error as Error).message,
    });
  }
};