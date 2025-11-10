import { Request, Response } from 'express';
import Stripe from 'stripe';
import Card from '../models/card.model';
import WalletRecharge from '../models/walletRecharge.model';
import Wallet from '../models/wallet.model';
import User from '../models/user.model';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const processRechargeWithCard = async (req: Request, res: Response) => {
  console.log('[processRechargeWithCard] Req.body:', req.body);

  try {
    const { fixerId, amount, currency = 'BOB', paymentMethodId } = req.body;

    console.log('fixerId recibido:', fixerId);

    if (!fixerId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'fixerId y amount son requeridos y válidos' });
    }

    // Buscar usuario para obtener stripeCustomerId
    const fixer = await User.findById(fixerId);
    if (!fixer) {
      return res.status(404).json({ error: 'Fixer no encontrado' });
    }

    // Crear cliente Stripe si no existe
    if (!fixer.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: fixer.email,
        name: fixer.name,
      });
      fixer.stripeCustomerId = customer.id;
      await fixer.save();
    }

    // Buscar wallet del fixer
    const wallet = await Wallet.findOne({ users_id: fixerId, status: 'active' });
    if (!wallet) return res.status(404).json({ error: 'Wallet no encontrada o inactiva' });

    // Buscar tarjeta default activa del fixer
    let card = await Card.findOne({ userId: fixerId, isDefault: true });

    // Si no hay tarjeta default, intentar crear una con paymentMethodId
    if (!card) {
      if (!paymentMethodId) {
        return res
          .status(400)
          .json({ error: 'No hay tarjeta default. Envía paymentMethodId para agregar una.' });
      }

      // Adjuntar método de pago al cliente Stripe
      await stripe.paymentMethods.attach(paymentMethodId, { customer: fixer.stripeCustomerId });

      // Actualizar método de pago default en Stripe
      await stripe.customers.update(fixer.stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      // Obtener datos del paymentMethod para guardar en DB
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

      // Crear tarjeta en DB
      card = await Card.create({
        userId: fixerId,
        stripePaymentMethodId: paymentMethod.id,
        brand: paymentMethod.card?.brand,
        last4: paymentMethod.card?.last4,
        expMonth: paymentMethod.card?.exp_month,
        expYear: paymentMethod.card?.exp_year,
        isDefault: true,
        cardholderName: paymentMethod.billing_details?.name || '',
      });
    }

    // Crear PaymentIntent y confirmar el pago con Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // monto en centavos
      currency: currency.toLowerCase(),
      payment_method: card.stripePaymentMethodId,
      customer: fixer.stripeCustomerId,
      off_session: true,
      confirm: true,
    });

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Pago no completado con Stripe' });
    }

    // Registrar la recarga en la DB con info de Stripe
    const recharge = await WalletRecharge.create({
      fixerId,
      walletId: wallet._id,
      method: 'card',
      status: 'confirmed',
      amount,
      currency,
      paymentIntentId: paymentIntent.id,
      paymentMethodId: card.stripePaymentMethodId,
    });

    // Actualizar saldo de la wallet con operación atómica $inc
    await Wallet.updateOne({ _id: wallet._id }, { $inc: { balance: amount } });

    return res.status(201).json({ message: 'Recarga exitosa', data: recharge });
  } catch (error: any) {
    console.error('Error en recarga con tarjeta:', error);
    return res.status(500).json({ error: error.message || 'Error interno' });
  }
};
