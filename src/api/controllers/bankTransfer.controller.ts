//pasar a jhasseft
import type { Request, Response } from 'express';
import PaymentIntent from '../../models/PaymentIntent.model';
import ProviderPaymentMethod from '../../models/ProviderPaymentMethod.model';
const SERVINEO_PROVIDER_ID = 'prov_123';

function generateRef() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'SV-';
  for (let i = 0; i < 5; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

export async function createOrReuseIntent(req: Request, res: Response) {
  try {
    console.log('📩 Body recibido:', req.body);

    const { fixerId, amount, currency = 'BOB', deadlineMinutes = 60 } = (req.body as any) ?? {};

    if (!fixerId) {
      return res.status(400).json({
        error: 'MISSING_FIXER_ID',
        message: 'Falta fixerId para recarga wallet por transferencia',
      });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        error: 'INVALID_AMOUNT',
        message: 'El monto es requerido y debe ser un número mayor que cero',
      });
    }

    const providerId = SERVINEO_PROVIDER_ID;

    let intent;
    try {
      console.log('🔍 Buscando intent existente...');
      intent = await PaymentIntent.findOne({ fixerId, type: 'wallet' });
      console.log('📄 Intent encontrado:', intent);
    } catch (e) {
      console.error('Error buscando intent:', e);
      throw e;
    }

    if (!intent) {
      try {
        console.log('🆕 Creando nuevo intent...');
        intent = await PaymentIntent.create({
          bookingId: generateRef(),
          providerId,
          fixerId,
          amountExpected: amount,
          currency,
          paymentReference: generateRef(),
          deadlineAt: new Date(Date.now() + deadlineMinutes * 60 * 1000),
          status: 'pending',
          type: 'wallet',
          method: 'transfer',
        });
        console.log('🆕 Intent creado:', intent);
      } catch (e) {
        console.error('Error creando intent:', e);
        throw e;
      }
    }

    let method;
    try {
      console.log('🏦 Buscando método de pago activo...');
      method = await ProviderPaymentMethod.findOne({ providerId, active: true });
      console.log('✅ Método encontrado:', method);
    } catch (e) {
      console.error('Error buscando método:', e);
      throw e;
    }

    if (!method) {
      return res.json({
        intent,
        error: 'NO_TRANSFER_METHOD',
        message: 'No se encontró método de transferencia configurado.',
      });
    }

    return res.json({
      intent,
      paymentMethod: {
        accountDisplay: method.accountDisplay,
        accountNumber: method.accountNumber || 'N/A',
        paymentReference: intent.paymentReference,
        amountExpected: intent.amountExpected,
        currency: intent.currency,
        status: intent.status,
      },
    });
  } catch (err) {
    console.error('[transferencia-bancaria] Error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
}
