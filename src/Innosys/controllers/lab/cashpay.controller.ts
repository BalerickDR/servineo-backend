import { Request, Response } from "express";
import mongoose from "mongoose";
import { Payment } from "../../models/payment.model";
import User from "../../models/user.model"; 
import Jobspay from "../../models/jobs.model";

const CODE_EXPIRATION_MS = 1 * 60 * 60 * 1000;

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
      commissionRate = 0.05,
    } = req.body ?? {};

    // ===== VALIDACIONES BÁSICAS =====
    if (!jobId || !mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ error: "jobId requerido y válido" });
    }
    // ... (otras validaciones de ID) ...

    // ===== VERIFICAR QUE LOS USUARIOS EXISTAN =====
    // --- CORRECCIÓN: Buscamos solo en 'User' ---
    let [requester, fixer] = await Promise.all([
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

    // ... (Validaciones de montos, método, total, etc. ... todo eso está bien) ...

    // ==========================================================
    // --- LÓGICA DE CONTROL DE DUPLICADOS ---
    // ==========================================================
    if (method === "cash") {
      console.log(`[createPaymentLab] Buscando pago en efectivo PENDIENTE para jobId: ${jobId}`);
      
      const existingPendingPayment = await Payment.findOne({
        jobId: new mongoose.Types.ObjectId(jobId),
        paymentMethods: "cash",
        status: "pending"
      });

      if (existingPendingPayment) {
        console.log(`[createPaymentLab] ✅ Pago PENDIENTE encontrado. Devolviendo pago existente: ${existingPendingPayment._id}`);
        
        return res.status(200).json({ 
          message: "Pago pendiente existente recuperado.",
          data: {
            id: existingPendingPayment._id,
            code: existingPendingPayment.code,
            total: existingPendingPayment.amount.total,
            currency: existingPendingPayment.amount.currency,
            status: existingPendingPayment.status,
            expiresAt: existingPendingPayment.codeExpiresAt,
            paymentMethod: existingPendingPayment.paymentMethods,
          }
        });
      }
      
      console.log(`[createPaymentLab] No se encontraron pagos pendientes. Creando uno nuevo...`);
    }
    // ==========================================================
    // --- FIN DE LA LÓGICA DE CONTROL DE DUPLICADOS ---
    // ==========================================================

    const code = generateRandomCode(6);
    const codeExpiresAt = new Date(Date.now() + CODE_EXPIRATION_MS);

    console.log(`💰 Creando pago: total=${total} Bs, método=${method}`);

    // ===== CREAR PAGO (en 'payments') =====
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

    // ============================================
    // 🔥 LÓGICA AÑADIDA: Actualizar 'jobspays' a "Pendiente"
    // ============================================
    try {
      console.log(`[createPaymentLab] Actualizando 'jobspays' a Pendiente para jobId: ${jobId}`);
      await Jobspay.findByIdAndUpdate(
        jobId,
        { $set: { status: "Pendiente" } } // Asegúrate que 'Pendiente' sea un valor válido
      );
      console.log(`[createPaymentLab] ✅ 'jobspays' actualizado.`);
    } catch (jobError: any) {
      console.error("❌ Error al actualizar 'jobspAYS' en createPaymentLab:", jobError.message);
    }
    // ============================================
    // --- FIN DE LA LÓGICA AÑADIDA ---
    // ============================================

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
    // ... (Manejo de errores) ...
    return res.status(500).json({ 
      error: e?.message || "Error creando pago" 
    });
  }
}

// ============================================
// POST /lab/payments/:id/regenerate-code - Regenerar código
// ============================================
export const regeneratePaymentCode = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "id inválido" });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ error: "pago no encontrado" });
    }

    const status = String(payment.status).toLowerCase();
    if (status !== "pending") {
      return res.status(400).json({ error: "solo se puede regenerar código para pagos pendientes" });
    }

    // Generar nuevo código y nueva expiración
    const newCode = generateRandomCode(6).toUpperCase();
    payment.code = newCode;
    payment.codeExpiresAt = new Date(Date.now() + CODE_EXPIRATION_MS);
    payment.failedAttempts = 0;
    payment.lockUntil = null as any;

    await payment.save();

    return res.json({
      message: "código regenerado correctamente",
      data: {
        id: payment._id,
        code: payment.code,
        expiresAt: payment.codeExpiresAt,
        status: payment.status,
      },
    });
  } catch (e: any) {
    // ... (Manejo de errores) ...
    return res.status(500).json({ error: e?.message || "Error regenerando código" });
  }
}