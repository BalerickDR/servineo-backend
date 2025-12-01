import type { Request, Response } from "express";
import Stripe from "stripe";
import Card from "../../models/card.model"; // Usamos import por defecto (común en Mongoose)
import User from "../../models/userPayment.model"; // Usamos el modelo de pagos (siguiendo la lógica del general)
import 'dotenv/config';

// Validar que la clave de Stripe existe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('❌ STRIPE_SECRET_KEY no está definida en las variables de entorno');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// =========================
// Crear y guardar tarjeta
// =========================
export const createCard = async (req: Request, res: Response) => {
  try {
    console.log("➡️ createCard called with body:", req.body);

    const { userId, paymentMethodId, saveCard, cardholderName } = req.body;

    // 1. Buscar usuario en MongoDB
    console.log(`🔍 Buscando usuario con ID: ${userId}`);
    // Nota: Usamos UserPayment model como sugiere el repo general para temas de pagos
    const user = await User.findById(userId);
    
    if (!user) {
      console.log("❌ Usuario no encontrado");
      return res.status(404).json({ error: "User not found" });
    }

    let customerId = user.stripeCustomerId;

    // 2. Validar o crear Customer en Stripe
    if (!customerId) {
      console.log("⚡ No hay Stripe Customer, creando uno nuevo...");
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
      console.log("✅ Customer creado en Stripe:", customerId);
    } else {
      try {
        console.log("🔄 Validando que el Customer existe en Stripe:", customerId);
        await stripe.customers.retrieve(customerId);
        console.log("✅ Customer existe en Stripe");
      } catch (error: unknown) {
        console.log("⚠️ Customer no encontrado en Stripe (o error), creando uno nuevo...", (error as Error).message);
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
        });
        customerId = customer.id;
        user.stripeCustomerId = customerId;
        await user.save();
        console.log("✅ Nuevo Customer creado en Stripe:", customerId);
      }
    }

    // 3. Adjuntar PaymentMethod al Customer
    console.log("🔗 Adjuntando PaymentMethod al Customer:", paymentMethodId);
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // 4. Guardar como default y registrar en MongoDB si se desea
    if (saveCard) {
      console.log("💾 Intentando guardar tarjeta en DB...");
      
      // VALIDACIÓN CRÍTICA DEL REPO GENERAL: Verificar que sea una tarjeta válida
      if (!paymentMethod.card) {
        return res.status(400).json({
          error: 'El método de pago proporcionado no es una tarjeta válida.',
        });
      }

      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethod.id },
      });

      // Usamos Optional Chaining (?.) y valores por defecto (||) del General para evitar crashes
      const newCard = await Card.create({
        userId,
        stripePaymentMethodId: paymentMethod.id,
        brand: paymentMethod.card?.brand || 'unknown',
        last4: paymentMethod.card?.last4 || '0000',
        expMonth: paymentMethod.card?.exp_month || 0,
        expYear: paymentMethod.card?.exp_year || 0,
        isDefault: true,
        cardholderName,
      });

      console.log("✅ Tarjeta guardada en MongoDB:", newCard);
      return res.json(newCard);
    }

    // 5. Retornar mensaje si no se guardó
    console.log("ℹ️ Tarjeta agregada para pago, pero no guardada");
    res.json({ message: "Tarjeta agregada para pago, no guardada" });

  } catch (error) {
    console.error("❌ Error createCard:", error);
    res.status(500).json({ error: (error as Error).message });
  }
};

// =========================
// Listar tarjetas de usuario
// =========================
export const listCards = async (req: Request, res: Response) => {
  try {
    console.log("➡️ listCards called with query:", req.query);
    const { userId } = req.query;

    // Validación del Repo General
    if (!userId) {
      return res.status(400).json({ error: 'userId es requerido' });
    }

    const cards = await Card.find({ userId });
    console.log("✅ Tarjetas encontradas:", cards);
    res.json(cards);
  } catch (error) {
    console.error("❌ Error listCards:", error);
    res.status(500).json({ error: (error as Error).message });
  }
};