import express from 'express';
import PaymentIntent from '../models/PaymentIntent';
import ProviderPaymentMethod from '../models/ProviderPaymentMethod';

const router = express.Router();

// 🔹 ID del QR único de Servineo (tu registro actual) para recarga
const SERVINEO_PROVIDER_ID = 'prov_123';

function generateRef() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'SV-';
  for (let i = 0; i < 5; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

console.log('[payments] router cargado');

router.get('/ping', (_req, res) => {
  res.json({ ok: true, from: 'payments' });
});

// Crea o reutiliza una intención por bookingId y devuelve datos + método de pago
router.post('/intent', async (req, res) => {
  try {
    let {
      bookingId,
      providerId,
      fixerId,
      amount,
      currency = 'BOB',
      deadlineMinutes = 60,
      type = 'service',
    } = req.body ?? {};

    //jhoel RECARGA DE SALDO (Fixer → Servineo)
    if (type === 'wallet') {
      if (!fixerId) {
        return res.status(400).json({
          error: 'MISSING_FIXER_ID',
          message: 'Falta fixerId para recarga wallet',
        });
      }

      // ⚠️ Forzar siempre el QR único de Servineo
      providerId = SERVINEO_PROVIDER_ID;

      // Reusar intención para recarga con fixerId y type = wallet
      let intent = await PaymentIntent.findOne({ fixerId, type: 'wallet'});
      if (!intent) {
        intent = await PaymentIntent.create({
          bookingId: null,
          providerId, // 👈 ahora guardamos Servineo como receptor
          fixerId, // 👈 quien recarga
          amountExpected: amount,
          currency,
          paymentReference: generateRef(),
          deadlineAt: new Date(Date.now() + deadlineMinutes * 60_000),
          status: 'pending',
          type: 'wallet',
        });
      }

      // Obtener método de pago (QR) del fixer (provider)
      //let method = await ProviderPaymentMethod.findOne({ providerId, active: true });

      //nuscar el Qr unico de servineo
      const method = await ProviderPaymentMethod.findOne({
        providerId: SERVINEO_PROVIDER_ID,
        active: true,
      });

      if (!method) {
        console.log(`[wallet] ❌ No se encontró QR único de Servineo`);
        return res.json({
          intent,
          error: 'NO_QR',
          message: 'No se encontró el QR de Servineo configurado.',
        });
      }

      /**if (!method) {
        // Buscar QR por defecto
        console.log(`[wallet] ❌ No se encontró QR para providerId=${providerId}`);
        method = await ProviderPaymentMethod.findOne({ isDefault: true });
      }

      if (!method) {
        return res.json({
          intent,
          error: 'NO_QR',
          message: 'Proveedor sin QR configurado (ni QR por defecto encontrado).',
        });
      }*/

      //console.log(`[wallet] ✅ Usando QR: ${method.accountDisplay}`);
      console.log(`[wallet] ✅ Usando QR único Servineo (${method.accountDisplay})`);


      return res.json({
        intent,
        paymentMethod: {
          qrImageUrl: method.qrImageUrl,
          accountDisplay: method.accountDisplay,
        },
      });
    } else {
      // PAGO DE SERVICIO (requester → fixer)
      if (!bookingId || !providerId) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          message: 'Faltan bookingId o providerId para pago de servicio',
        });
      }
      //

      //console.log("[/intent] payload:", { bookingId, providerId, amount, currency });

      // Reusar si ya existe; sino crear con referencia nueva
      let intent = await PaymentIntent.findOne({ bookingId });
      if (!intent) {
        intent = await PaymentIntent.create({
          bookingId,
          providerId,
          amountExpected: amount,
          currency,
          paymentReference: generateRef(),
          deadlineAt: new Date(Date.now() + deadlineMinutes * 60_000),
          status: 'pending',
          type: 'service',
        });
      }

      // Buscar método de pago del proveedor (QR estático)
      const method = await ProviderPaymentMethod.findOne({ providerId, active: true });
      // console.log("[/intent] method found?", Boolean(method), "for providerId:", providerId);

      if (!method) {
        return res.json({
          intent,
          error: 'NO_QR',
          message: 'Proveedor sin QR configurado.',
        });
      }

      return res.json({
        intent,
        paymentMethod: {
          qrImageUrl: method.qrImageUrl,
          accountDisplay: method.accountDisplay,
        },
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

export default router;
