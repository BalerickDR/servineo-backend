//pasar a Jhseft
// src/api/routes/paymentsQR.routes.ts
import express from "express";
import PaymentIntent from "../../models/PaymentIntent.model";
import ProviderPaymentMethod from "../../models/ProviderPaymentMethod.model";
import { logSecurityEvent } from "../../utils/securityLogger";

const router = express.Router();

function generateRef() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "SV-";
  for (let i = 0; i < 5; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

console.log("[payments-qr] router cargado");

router.get("/ping", (_req, res) => {
  res.json({ ok: true, from: "payments-qr" });
});

// Crea o reutiliza una intención por bookingId y devuelve datos + método de pago
router.post("/intent", async (req, res) => {
  try {
    let {
      bookingId,
      providerId,
      amount,
      currency = "BOB",
      deadlineMinutes = 60,
      qrImageUrl, // opcional, solo para detección de manipulación
    } = req.body ?? {};

    // Validaciones básicas
    if (!bookingId || !providerId || amount == null) {
      return res.status(400).json({
        error: "FALTAN_DATOS",
        message: "bookingId, providerId y amount son obligatorios",
      });
    }

    providerId = String(providerId || "").trim();
    amount = Number(amount);

    console.log("[/api/payments/intent] payload:", {
      bookingId,
      providerId,
      amount,
      currency,
    });

    let intent = await PaymentIntent.findOne({ bookingId });

    // 2) Si no existe, crear uno nuevo
    if (!intent) {
      try {
        intent = await PaymentIntent.create({
          bookingId,
          providerId,
          amountExpected: amount,
          currency,
          paymentReference: generateRef(),
          deadlineAt: new Date(Date.now() + deadlineMinutes * 60_000),
          status: "pending",
          type: "service",  // usamos tu esquema actual
          method: "qr",     // marcamos que es un pago por QR
        });
      } catch (err: any) {
        // 3) Si hubo carrera o ya existía, reusamos el que está en BD
        if (err.code === 11000) {
          console.warn(
            "[/api/payments/intent] E11000 al crear intent, reutilizando existente...",
          );
          intent = await PaymentIntent.findOne({ bookingId });
        } else {
          throw err;
        }
      }
    }

    // Buscar método de pago del proveedor (QR estático)
    const method = await ProviderPaymentMethod.findOne({
      providerId,
      method: "qr", 
      active: true,
    });

    if (!method) {
      return res.json({
        intent,
        error: "NO_QR",
        message: "Proveedor sin QR configurado.",
      });
    }

    // Verificar posible manipulación SOLO si el cliente manda qrImageUrl
    if (qrImageUrl && method.qrImageUrl !== qrImageUrl) {
      logSecurityEvent({
        event: "QR_MANIPULADO",
        providerId,
        message:
          "El código QR proporcionado no corresponde al configurado por SERVINEO.",
      });

      return res.json({
        error: "QR_MANIPULADO",
        message:
          "El código QR proporcionado no corresponde al configurado por SERVINEO.",
      });
    }

    return res.json({
      intent,
      paymentMethod: {
        qrImageUrl: method.qrImageUrl,
        accountDisplay: method.accountDisplay,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

export default router;