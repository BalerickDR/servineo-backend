import { Request, Response } from "express";
import mongoose from "mongoose";
import { MongoServerError } from 'mongodb'; // Del General: Para manejo de errores robusto
import { Payment } from "../../models/payment.model";
import User from "../../models/userPayment.model"; // Usamos la importación del General
import Jobspay from "../../models/jobs.model"; // 🟢 CRÍTICO: Mantenemos tu importación local

// 🟢 Mantenemos TU tiempo de expiración (48h) en lugar del General (1h)
// ya que el efectivo suele requerir más tiempo logística.
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
      commissionRate = 0.05,
    } = req.body ?? {};

    // ===== VALIDACIONES BÁSICAS (Del General - Más estrictas) =====
    if (!jobId || !mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ error: "jobId requerido y válido" });
    }
    if (!requesterId || !mongoose.isValidObjectId(requesterId)) {
      return res.status(400).json({ error: 'requesterId requerido y válido' });
    }
    if (!fixerId || !mongoose.isValidObjectId(fixerId)) {
      return res.status(400).json({ error: 'fixerId requerido y válido' });
    }

    // ===== VERIFICAR QUE LOS USUARIOS EXISTAN =====
    const [requester, fixer] = await Promise.all([
      User.findById(requesterId),
      User.findById(fixerId),
    ]);

    if (!requester) return res.status(404).json({ error: "Requester no encontrado" });
    if (!fixer) return res.status(404).json({ error: "Fixer no encontrado" });

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

    // Validación de negativos del General
    if (nSub < 0 || nFee < 0 || nDisc < 0) {
      return res.status(400).json({ error: 'Los montos no pueden ser negativos' });
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
      return res.status(400).json({ error: "El total debe ser mayor a 0" });
    }

    // ===== VALIDACIÓN ESPECÍFICA PARA EFECTIVO =====
    if (method === "cash" && (total < 10 || total >= 5000)) {
      return res.status(400).json({ 
        error: "Pago en efectivo solo entre 10 y 5000 Bs." 
      });
    }

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
        console.log(`[createPaymentLab] ✅ Pago PENDIENTE encontrado. Devolviendo pago existente.`);
        
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

    const code = generateRandomCode(6);
    const codeExpiresAt = new Date(Date.now() + CODE_EXPIRATION_MS);

    console.log(`💰 Creando pago: total=${total} Bs, método=${method}`);

    // ===== CREAR PAGO =====
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
    // 🔥 LÓGICA LOCAL MANTENIDA: Actualizar 'jobspays' a "pago pendiente"
    // (El repo general NO tiene esto, pero es crucial para tu flujo)
    // ============================================
    try {
      console.log(`[createPaymentLab] Actualizando 'jobspays' a Pendiente para jobId: ${jobId}`);
      await Jobspay.findByIdAndUpdate(
        jobId,
        { $set: { status: "pago pendiente" } }
      );
      console.log(`[createPaymentLab] ✅ 'jobspays' actualizado.`);
    } catch (jobError: any) {
      console.error("❌ Error al actualizar 'jobspays' en createPaymentLab:", jobError.message);
      // No retornamos error aquí para no abortar la creación del pago si falla la actualización del job
    }

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

  } catch (e: unknown) {
    console.error("❌ Error en createPaymentLab:", e);

    // Tipado seguro del General
    if ((e as Error)?.name === "ValidationError") {
      return res.status(400).json({ error: (e as Error).message });
    }
    if ((e as Error)?.name === "CastError") {
      return res.status(400).json({ error: "ObjectId inválido" });
    }
    return res.status(500).json({ 
      error: (e as Error)?.message || "Error creando pago" 
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
    payment.lockUntil = null as unknown; // Fix de tipado del general

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
  } catch (e: unknown) {
    const error = e as any;
    if (error?.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof MongoServerError && error.code === 11000) {
      // Colisión de código único
      return res.status(409).json({ error: "conflicto de código, intente nuevamente" });
    }
    return res.status(500).json({ error: error?.message || "Error regenerando código" });
  }
}