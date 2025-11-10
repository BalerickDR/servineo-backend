import Stripe from "stripe";
import Payment from "../models/payment.model";
import Card from "../models/card.model";
import User from "../models/user.model";
import 'dotenv/config';

if (!process.env.STRIPE_SECRET_KEY) {
  console.error(" ERROR: STRIPE_SECRET_KEY  .env");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createPayment = async (req, res) => {
  console.log("[createPayment] Iniciando proceso de cambio...");

  try {
    const { requesterId, fixerId, jobId, cardId, amount, paymentMethodId } = req.body;
    console.log({ requesterId, fixerId, jobId, cardId, amount, paymentMethodId });

    if (!requesterId || !fixerId || !jobId || !amount)
      return res.status(400).json({ error: "Faltan datos obligatorios" });

    // Buscar usuarios
    const [requester, fixer] = await Promise.all([
      User.findById(requesterId),
      User.findById(fixerId),
    ]);

    if (!requester) return res.status(404).json({ error: "Requester no encontrado" });
    if (!fixer) return res.status(404).json({ error: "Fixer no encontrado" });

    if (requester.role !== "requester")
      return res.status(400).json({ error: "El pagador debe tener rol 'requester'" });
    if (fixer.role !== "fixer")
      return res.status(400).json({ error: "El receptor debe tener rol 'fixer'" });

    // Crear Stripe Customer si no existe
    let customerId = requester.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: requester.email,
        name: requester.name,
      });
      requester.stripeCustomerId = customer.id;
      await requester.save();
      customerId = customer.id;
    }

    let stripePaymentMethodId;

    if (cardId) {
      // Si hay cardId, buscamos en MongoDB
      const card = await Card.findById(cardId);
      if (!card) return res.status(404).json({ error: "Card no encontrada" });
      if (card.userId.toString() !== requesterId.toString())
        return res.status(400).json({ error: "La tarjeta no pertenece al requester" });
      stripePaymentMethodId = card.stripePaymentMethodId;
    } else if (paymentMethodId) {
      // Si no hay cardId, usamos PaymentMethod temporal enviado desde frontend
      stripePaymentMethodId = paymentMethodId;
    } else {
      return res.status(400).json({ error: "No se proporcionó tarjeta ni PaymentMethod" });
    }

    if (isNaN(amount) || amount <= 0)
      return res.status(400).json({ error: "El monto debe ser un número positivo" });

    console.log(" Creando PaymentIntent en Stripe...");

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // convertir a centavos
      currency: "BOB",
      customer: customerId,
      payment_method: stripePaymentMethodId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
    });

    // Guardar en MongoDB siempre, pero cardId opcional
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

    console.log(" Pago procesado correctamente");

    res.json({
      message: "Pago exitoso",
      payment: paymentData,
    });

  } catch (error) {
    console.error(" Error inesperado en createPayment:", error);
    res.status(500).json({
      error: "Error inesperado en el servidor",
      details: (error as Error).message,
    });
  }
};