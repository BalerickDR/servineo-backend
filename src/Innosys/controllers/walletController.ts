import Stripe from "stripe";
import Payment from "../models/payment.model";
import Card from "../models/card.model";
import User from "../models/user.model";
import 'dotenv/config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 💳 Controlador: fixer paga a Servineo (recarga o transferencia)
export const rechargeFixerWallet = async (req, res) => {
  try {
    const { fixerId, amount, method } = req.body;

    if (!fixerId || !amount || amount <= 0) {
      return res.status(400).json({ error: "fixerId y amount son obligatorios y deben ser válidos." });
    }

    // 1️⃣ Buscar al fixer y validar su rol
    const fixer = await User.findById(fixerId);
    if (!fixer) return res.status(404).json({ error: "Fixer no encontrado." });
    if (fixer.role !== "fixer") {
      return res.status(403).json({ error: "Solo los usuarios con rol 'fixer' pueden recargar saldo." });
    }

    // 2️⃣ Buscar cuenta Servineo (única)
    const servineo = await User.findOne({ role: "servineo" });
    if (!servineo)
      return res.status(404).json({ error: "Cuenta Servineo no encontrada en el sistema." });

    // 3️⃣ Procesar pago con Stripe si el método es tarjeta
    let paymentIntent = null;

    if (method === "card") {
      const card = await Card.findOne({ userId: fixerId, isDefault: true });
      if (!card) {
        return res.status(400).json({ error: "El Fixer no tiene una tarjeta por defecto." });
      }

      // Crear PaymentIntent de Stripe
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // centavos
        currency: "bob",
        customer: fixer.stripeCustomerId,
        payment_method: card.stripePaymentMethodId,
        confirm: true,
        description: `Pago de Fixer ${fixer.name} hacia Servineo`,
        metadata: {
          type: "fixer_to_servineo",
          fixerId: fixer._id.toString(),
          servineoId: servineo._id.toString(),
        },
      });
    }

    // 4️⃣ Registrar el pago en tu colección "payments"
    const payment = new Payment({
      requesterId: servineo._id,   // Servineo recibe
      fixerId: fixer._id,          // Fixer paga
      amount: amount,
      currency: "BOB",
      status: "paid",
      paymentIntentId: paymentIntent?.id || null,
      jobId: null, // si no aplica, lo dejas null
      cardId: method === "card" ? paymentIntent?.payment_method : null,
    });

    await payment.save();

    // 5️⃣ Respuesta final
    res.status(200).json({
      message: "Pago realizado correctamente de Fixer hacia Servineo.",
      paymentId: payment._id,
      paymentIntent,
    });

  } catch (error) {
    console.error("💥 Error en rechargeFixerWallet:", error);
    res.status(500).json({ error: "Error al procesar la recarga del Fixer." });
  }
};
