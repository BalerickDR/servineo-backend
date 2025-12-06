import { Jobspay } from './../../models/jobsPayment.model';
import type { Request, Response } from "express";
import Stripe from "stripe";
import Payment from "../../models/payment.model";
import Card from "../../models/card.model";
import {User} from "../../models/user.model";
import Job from '../../models/jobs.model';
import 'dotenv/config';
import axios from 'axios'; // 🆕 Importar axios (o node-fetch si no usas axios)

// Claves de Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ ERROR: Falta STRIPE_SECRET_KEY en el archivo .env");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// 🔐 Clave Secreta para el Servidor (requerida para la verificación)
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

if (!RECAPTCHA_SECRET_KEY) {
  console.error("❌ ERROR: Falta RECAPTCHA_SECRET_KEY en el archivo .env");
  process.exit(1);
}

// ----------------------------------------------------------------------
// 🔐 FUNCIÓN DE VERIFICACIÓN DE RECAPTCHA (USANDO AXIOS)
// ----------------------------------------------------------------------

// NOTA: Usamos axios aquí como un cliente HTTP robusto en Node.js,
// si no lo tienes instalado, usa `npm install axios` o reemplázalo con 'node-fetch'.

const verifyRecaptchaToken = async (token) => {
  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${token}`
    );
      // La propiedad 'success' es true si la verificación es correcta
    return response.data.success;
  } catch (error) {
    console.error("❌ Error al contactar con la API de reCAPTCHA:", error);
    return false;
  }
};

// ----------------------------------------------------------------------
// 💳 CONTROLADOR PRINCIPAL DE PAGO CON TARJETA
// ----------------------------------------------------------------------

export const createPayment = async (req, res) => {
  console.group("🧾 [createPayment] Nueva solicitud de pago");
  console.time("⏱ Duración total del proceso");

  try {
    // 🆕 Añadir el recaptchaToken a la desestructuración del cuerpo de la solicitud
    const { requesterId, fixerId, jobId, cardId, amount, paymentMethodId, recaptchaToken } = req.body; 

    console.log("📥 Datos recibidos:", { requesterId, fixerId, jobId, cardId, amount, paymentMethodId, recaptchaToken });

    // --- 🔐 1. VERIFICACIÓN DE RECAPTCHA ---
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
      console.error("❌ Faltan datos obligatorios en la solicitud");
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    if (isNaN(amount) || amount <= 0) {
      console.error("❌ El monto debe ser un número positivo");
      return res.status(400).json({ error: "El monto debe ser un número positivo" });
    }

    // --- BUSCAR USUARIOS ---
    console.log("🔍 Buscando requester y fixer...");
    const [requester, fixer] = await Promise.all([
      User.findById(requesterId),
      User.findById(fixerId),
    ]);

    if (!requester) {
      console.error(` Requester ${requesterId} no encontrado`);
      return res.status(404).json({ error: "Requester no encontrado" });
    }

    if (!fixer) {
      console.error(` Fixer ${fixerId} no encontrado`);
      return res.status(404).json({ error: "Fixer no encontrado" });
    }

    if (requester.role !== "requester") {
      console.error("⚠️ El pagador no tiene rol 'requester'");
      return res.status(400).json({ error: "El pagador debe tener rol 'requester'" });
    }

    if (fixer.role !== "fixer") {
      console.error("⚠️ El receptor no tiene rol 'fixer'");
      return res.status(400).json({ error: "El receptor debe tener rol 'fixer'" });
    }

    // --- CREAR CLIENTE STRIPE SI NO EXISTE ---
    let customerId = requester.stripeCustomerId;
    if (!customerId) {
      console.log("🆕 Creando nuevo cliente Stripe...");
      const customer = await stripe.customers.create({
        email: requester.email,
        name: requester.name,
      });
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
      console.log("💳 Buscando tarjeta por ID...");
      const card = await Card.findById(cardId);
      if (!card) {
        console.error("❌ Card no encontrada");
        return res.status(404).json({ error: "Card no encontrada" });
      }
      if (card.userId.toString() !== requesterId.toString()) {
        console.error("⚠️ La tarjeta no pertenece al requester");
        return res.status(400).json({ error: "La tarjeta no pertenece al requester" });
      }
      stripePaymentMethodId = card.stripePaymentMethodId;
    } else if (paymentMethodId) {
      stripePaymentMethodId = paymentMethodId;
      console.log("💳 Usando paymentMethodId temporal del frontend");
    } else {
      console.error("❌ No se proporcionó tarjeta ni paymentMethod");
      return res.status(400).json({ error: "No se proporcionó tarjeta ni PaymentMethod" });
    }

    // --- CREAR INTENTO DE PAGO ---
    console.log("🚀 Creando PaymentIntent en Stripe...");
    let paymentIntent;

    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "BOB",
        customer: customerId,
        payment_method: stripePaymentMethodId,
        confirm: true,
        automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      });
      console.log("✅ PaymentIntent creado:", paymentIntent.id, "Estado:", paymentIntent.status);
    } catch (stripeError) {
      console.error("❌ Error al crear PaymentIntent:", stripeError.message);
      return res.status(400).json({
        error: "Error al procesar el pago con Stripe",
        details: stripeError.message,
      });
    }

    // --- GUARDAR PAGO EN MONGODB ---
    console.log("🗃️ Guardando información del pago en MongoDB...");
    const paymentData = await Payment.create({
      requesterId,
      fixerId,
      jobId,
      cardId: cardId || null,
      temporaryPaymentMethodId: cardId ? null : paymentMethodId,
      amount,
      status: paymentIntent.status === "succeeded" ? "paid" : "pending",
      paymentIntentId: paymentIntent.id,
    });

    console.log(`✅ Pago guardado correctamente con estado '${paymentData.status}'`);

    // --- ACTUALIZAR ESTADO DEL TRABAJO ---
    const job = await Job.findById(jobId);
    if (!job) {
      console.error(`⚠️ Trabajo con ID ${jobId} no encontrado`);
    } else {
      job.status = paymentIntent.status === "succeeded" ? "Pagado" : "Pago pendiente";
      await job.save();
      console.log(`🧱 Estado del trabajo '${job.title}' actualizado a '${job.status}'`);
    }

    console.timeEnd("⏱ Duración total del proceso");
    console.groupEnd();

    return res.json({
      message: "✅ Pago procesado correctamente",
      payment: paymentData,
    });

  } catch (error) {
    console.error("🔥 Error inesperado en createPayment:", error);
    console.timeEnd("⏱ Duración total del proceso");
    console.groupEnd();

    return res.status(500).json({
      error: "Error inesperado en el servidor",
      details: error.message,
      stack: error.stack,
    });
  }
};