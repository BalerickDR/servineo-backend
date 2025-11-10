import { Request, Response } from "express";
import mongoose from "mongoose";
import { Payment } from "../../models/payment.model";
import User from "../../models/user.model";

const CODE_EXPIRATION_MS = 48 * 60 * 60 * 1000;

// ============================================
// HELPER: Generar código aleatorio
// ============================================
function generateRandomCode(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================
// POST /lab/payments - Crear pago
// ============================================
export const createPaymentLab = async (req: Request, res: Response) => {
  console.log("[createPaymentLab] Iniciando proceso...");

  try {
    const {
      jobId,
      requesterId,
      fixerId,
      paymentMethods = "cash",
      subTotal,
      service_fee = 0,
      discount = 0,
      currency = "BOB",
      commissionRate = 0.1,
    } = req.body ?? {};

    // ===== VALIDACIONES BÁSICAS =====
    if (!jobId || !mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ error: "jobId requerido y válido" });
    }

    if (!requesterId || !mongoose.isValidObjectId(requesterId)) {
      return res.status(400).json({ error: "requesterId requerido y válido" });
    }

    if (!fixerId || !mongoose.isValidObjectId(fixerId)) {
      return res.status(400).json({ error: "fixerId requerido y válido" });
    }

    // ===== VERIFICAR QUE LOS USUARIOS EXISTAN =====
    const [requester, fixer] = await Promise.all([
      User.findById(requesterId),
      User.findById(fixerId),
    ]);

    if (!requester) {
      return res.status(404).json({ error: "Requester no encontrado" });
    }

    if (!fixer) {
      return res.status(404).json({ error: "Fixer no encontrado" });
    }

    // ===== VALIDAR ROLES =====
    if (requester.role !== "requester") {
      return res.status(400).json({ error: "El pagador debe tener rol 'requester'" });
    }

    if (fixer.role !== "fixer") {
      return res.status(400).json({ error: "El receptor debe tener rol 'fixer'" });
    }

    // ===== VALIDAR MONTOS =====
    const nSub = Number(subTotal);
    const nFee = Number(service_fee);
    const nDisc = Number(discount);

    if ([nSub, nFee, nDisc].some(Number.isNaN)) {
      return res.status(400).json({ 
        error: "subTotal, service_fee y discount deben ser numéricos" 
      });
    }

    if (nSub < 0 || nFee < 0 || nDisc < 0) {
      return res.status(400).json({ 
        error: "Los montos no pueden ser negativos" 
      });
    }

    const nComm = Number(commissionRate);
    if (Number.isNaN(nComm) || nComm < 0 || nComm > 1) {
      return res.status(400).json({ 
        error: "commissionRate debe estar entre 0 y 1" 
      });
    }

    // ===== VALIDAR MÉTODO DE PAGO =====
    const method = paymentMethods.toLowerCase();
    if (!["cash", "qr", "card"].includes(method)) {
      return res.status(400).json({ 
        error: "paymentMethods debe ser: cash, qr o card" 
      });
    }

    // ===== CALCULAR TOTAL =====
    const total = nSub + nFee - nDisc;

    if (total <= 0) {
      return res.status(400).json({ 
        error: "El total debe ser mayor a 0" 
      });
    }

    // ===== VALIDACIÓN ESPECÍFICA PARA EFECTIVO =====
    if (method === "cash" && (total < 10 || total >= 5000)) {
      return res.status(400).json({ 
        error: "Pago en efectivo solo entre 10 y 5000 Bs." 
      });
    }

    // ===== GENERAR CÓDIGO Y EXPIRACIÓN =====
    const code = generateRandomCode(6);
    const codeExpiresAt = new Date(Date.now() + CODE_EXPIRATION_MS);

    console.log(`💰 Creando pago: total=${total} Bs, método=${method}`);

    // ===== CREAR PAGO (con amount anidado según tu modelo) =====
    const doc = await Payment.create({
      jobId: new mongoose.Types.ObjectId(jobId),
      payerId: new mongoose.Types.ObjectId(requesterId),
      fixerId: new mongoose.Types.ObjectId(fixerId),
      paymentMethods: method,
      status: "pending",
      commissionRate: nComm,
      code,
      codeExpiresAt,
      amount: {
        subTotal: nSub,
        service_fee: nFee,
        discount: nDisc,
        total,
        currency,
      },
    });

    console.log(`✅ Pago creado exitosamente con código: ${code}`);

    return res.status(201).json({ 
      message: "Pago creado exitosamente", 
      data: {
        id: doc._id,
        code: doc.code,
        total: doc.amount.total,
        currency: doc.amount.currency,
        status: doc.status,
        expiresAt: doc.codeExpiresAt,
        paymentMethod: doc.paymentMethods,
      }
    });

  } catch (e: any) {
    console.error("❌ Error en createPaymentLab:", e);

    if (e?.name === "ValidationError") {
      return res.status(400).json({ error: e.message });
    }
    if (e?.name === "CastError") {
      return res.status(400).json({ error: "ObjectId inválido" });
    }
    return res.status(500).json({ 
      error: e?.message || "Error creando pago" 
    });
  }
}

//jhoel
// ============================================
// POST /lab/payments/:id/regenerate-code - Regenerar código de pago
// ============================================
export const regeneratePaymentCode = async (req: Request, res: Response) => {
  console.log("[regeneratePaymentCode] Iniciando proceso...");

  try {
    const paymentId = req.params.id;

    if (!mongoose.isValidObjectId(paymentId)) {
      return res.status(400).json({ error: "ID de pago inválido" });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    // Generar nuevo código y actualizar expiración
    const newCode = generateRandomCode(6);
    const newExpiresAt = new Date(Date.now() + CODE_EXPIRATION_MS);

    payment.code = newCode;
    payment.codeExpiresAt = newExpiresAt;

    await payment.save();

    console.log(`✅ Código regenerado exitosamente para pago ${paymentId}`);

    return res.status(200).json({
      message: "Código regenerado exitosamente",
      data: {
        code: newCode,
        expiresAt: newExpiresAt,
      },
    });

  } catch (e: any) {
    console.error("❌ Error en regeneratePaymentCode:", e);
    return res.status(500).json({ error: e?.message || "Error regenerando código" });
  }
};