import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Payment } from "../../models/payment.model";
import { Comision } from "../../models/historycomission.model";
import { Wallet } from "../../models/wallet.model";
import Job from "../../models/job.model"; 
import User from "../../models/user.model"; 
import Jobspay from "../../models/jobs.model"; // <-- Importado como 'Jobspay'

const MAX_ATTEMPTS = 3;
const LOCK_MINUTES = 10;

export async function confirmPaymentLab(req: Request, res: Response) {
  const session = await mongoose.startSession();
  
  try {
    const { id } = req.params as { id: string };
    const { code } = (req.body || {}) as { code?: string };

    // 1. Validaciones básicas
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "id inválido" });
    }

    if (!code) { 
      return res.status(400).json({ error: "code requerido" });
    }

    // 2. Definir 'provided'
    const provided = String(code).toUpperCase().trim();
    
    if (!/^[A-Z0-9]{4,10}$/.test(provided)) {
      return res.status(400).json({ error: "formato de código inválido" });
    }

    session.startTransaction();

    const pay = await Payment.findById(id).session(session);
    
    if (!pay) {
      await session.abortTransaction();
      return res.status(404).json({ error: "pago no encontrado" });
    }

    if (String(pay.status).toLowerCase() !== "pending") {
      await session.abortTransaction();
      return res.status(400).json({ error: `el pago ya fue procesado` });
    }

    // 3. Definir 'now' aquí para que esté disponible globalmente
    const now = new Date();

    if (pay.codeExpiresAt && pay.codeExpiresAt.getTime() < now.getTime()) { // Usar 'now'
      await session.abortTransaction();
      return res.status(410).json({ 
        error: "código expirado",
        expiredAt: pay.codeExpiresAt 
      });
    }

    // Verificar si hay un bloqueo activo
    if (pay.lockUntil && pay.lockUntil.getTime() > now.getTime()) {
      // ... (lógica de bloqueo)
      await session.abortTransaction(); // Abortar aquí también
      return res.status(429).json({ error: "demasiados intentos fallidos" });
    }

    // Limpiar bloqueo si ya expiró
    if (pay.lockUntil && pay.lockUntil.getTime() <= now.getTime()) {
      pay.lockUntil = null;
      pay.failedAttempts = 0;
    }

    const real = String(pay.code);

    // Verificar código
    if (provided !== real) {
      // ... (Lógica de intentos fallidos)
      const newAttempts = (pay.failedAttempts ?? 0) + 1;
      pay.failedAttempts = newAttempts;
      
      if (newAttempts >= MAX_ATTEMPTS) {
        pay.lockUntil = new Date(now.getTime() + LOCK_MINUTES * 60 * 1000);
      }
      
      await pay.save({ session });
      await session.commitTransaction(); // Guardar el intento fallido

      const remaining = MAX_ATTEMPTS - newAttempts;
      return res.status(401).json({
        error: "código inválido",
        remainingAttempts: remaining,
      });
    }

    // ✅ Código correcto - Confirmar pago
    // 4. Usar el nombre 'confirmedPayment' consistentemente
    const confirmedPayment = await Payment.findOneAndUpdate(
      { 
        _id: id,
        status: "pending", 
        code: provided // <-- 'provided' AHORA SÍ existe
      },
      {
        $set: {
          status: "paid",
          paymentDate: now, // <-- 'now' AHORA SÍ existe
          failedAttempts: 0,
          lockUntil: null
        }
      },
      { 
        new: true,
        session 
      }
    );

    if (!confirmedPayment) {
      await session.abortTransaction();
      return res.status(409).json({ 
        error: "conflicto: el pago ya fue procesado por otra solicitud" 
      });
    }

    // ============================================
    // 🎯 ACTUALIZAR STATUS DEL JOB A "PAGADO"
    // (Movido antes de la factura, ya que 'jobActualizado' se usa en la respuesta)
    // ============================================
    let jobActualizado = false;
    
    if (confirmedPayment.jobId) { // <-- 5. Usar 'confirmedPayment'
      try {
        console.log(`🔄 Actualizando status del job ${confirmedPayment.jobId} a "Pagado"`);
        
        // 6. Usar 'Jobspay' (minúscula) como fue importado
        const jobUpdated = await Jobspay.findByIdAndUpdate( 
          confirmedPayment.jobId,
          { $set: { status: "Pagado" } },
          { new: true, session }
        );

        if (jobUpdated) {
          console.log(`✅ Job ${confirmedPayment.jobId} actualizado a status "Pagado"`);
          jobActualizado = true;
        } else {
          console.warn(`⚠️ No se encontró el job ${confirmedPayment.jobId}`);
        }
      } catch (jobError: any) {
        console.error(`❌ Error actualizando job ${confirmedPayment.jobId}:`, jobError);
      }
    } else {
      console.warn(`⚠️ El pago ${id} no tiene jobId asociado`);
    }

    // ============================================
    // 🧾 ENRIQUECER PAGO CON DATOS DE FACTURA
    // ============================================
    console.log(`🧾 Añadiendo datos de factura al pago ${id}`);
    
    try {
      // 1. Buscar los datos que faltan (Job y Requester/Payer)
      const [job, requester] = await Promise.all([
        Job.findById(confirmedPayment.jobId).session(session), // Usar 'Job' (detallado)
        User.findById(confirmedPayment.payerId).session(session)
      ]);

      if (!job || !requester) {
        console.warn("⚠️ No se encontraron el Job o el Requester para la factura");
      } else {
        const subtotal = confirmedPayment.amount.total;
        const commission = subtotal * (confirmedPayment.commissionRate || 0.05);
        const iva = (subtotal + commission) * 0.13; 
        const totalFinal = subtotal + commission + iva;

        await Payment.findByIdAndUpdate(confirmedPayment._id, {
          $set: {
            requesterName: requester.name,
            companyName: (requester as any).companyName || "N/A",
            taxId: (requester as any).taxId || "N/A",
            jobType: job.type, 
            jobDescription: job.description, 
            transactionId: `CASH-${confirmedPayment._id}`, 
            "Payment Method": "Efectivo", 
            commission: commission,
            iva: iva,
            "amount.total": totalFinal 
          }
        }, { session });

        console.log(`✅ Datos de factura añadidos al pago ${confirmedPayment._id}`);
      }
    } catch (invoiceError: any) {
      console.error("❌ Error en trigger de facturación:", invoiceError.message);
    }
    // ============================================
    // FIN DE LÓGICA DE FACTURACIÓN
    // ============================================


    // ============================================
    // 🔥 TRIGGER: ACTUALIZAR 'jobspays'
    // ============================================
    try {
      console.log(`🧾 Actualizando estado en 'jobspays' para el jobId: ${confirmedPayment.jobId}`);
      
      // ¡USA EL MODELO 'Jobspay' (jobs.model.ts) PARA ACTUALIZAR LA LISTA!
      await Jobspay.findByIdAndUpdate( 
        confirmedPayment.jobId,
        { $set: { status: "Pagado" } }, // Asumiendo que 'Pagado' es el string correcto
        { session }
      );
      console.log(`✅ 'jobspays' actualizado a "Pagado".`);
    } catch (jobspayError: any) {
      console.error("❌ Error al actualizar 'jobspays':", jobspayError.message);
    }
    // ============================================
    // FIN DEL TRIGGER 'jobspays'
    // ============================================

    // ============================================
    // 🔥 TRIGGER: CREAR COMISIÓN AUTOMÁTICAMENTE
    // ============================================
    console.log(`💰 Activando trigger de comisión para pago ${id}`);
    
    try {
      const fixerWallet = await Wallet.findOne({ 
        users_id: confirmedPayment.fixerId 
      }).session(session);

      if (!fixerWallet) {
        console.warn(`❌ No se encontró wallet para fixer: ${confirmedPayment.fixerId}`);
      }

      const comisionRate = confirmedPayment.commissionRate || 0.05;
      const montoServicio = confirmedPayment.amount.total; 
      const comisionMonto = montoServicio * comisionRate;

      let estadoComision = "completada";
      let motivoFallo = null;

      // --- LÓGICA CORREGIDA: Permitir saldos negativos ---
      if (fixerWallet) {
        await Wallet.findByIdAndUpdate(
          fixerWallet._id,
          { $inc: { balance: -comisionMonto } }, // <-- Siempre descuenta
          { session }
        );
        console.log(`✅ Comisión de ${comisionMonto} Bs descontada del wallet`);
      } else {
        estadoComision = "fallida";
        motivoFallo = "Wallet del fixer no encontrado";
        console.warn(`❌ ${motivoFallo}`);
      }

      await Comision.create([{
        wallets_id: fixerWallet?._id || confirmedPayment.fixerId,
        payments_id: confirmedPayment._id,
        fixer_id: confirmedPayment.fixerId,
        comision: comisionMonto,
        monto_servicio: montoServicio,
        tipo_servicio: "Servicio general", 
        estado: estadoComision,
        motivo_fallo: motivoFallo,
        fecha_completada: estadoComision === "completada" ? new Date() : undefined
      }], { session });

      console.log(`✅ Comisión registrada en historial: ${estadoComision}`);

    } catch (error: any) {
      console.error("❌ Error en trigger de comisión:", error);
    }

    await session.commitTransaction();

    console.info(`Payment ${id}: confirmado exitosamente + triggers ejecutados`);

    const finalPaymentDoc = await Payment.findById(id).lean();

    return res.json({
      message: "pago confirmado exitosamente",
      data: {
        id: String(confirmedPayment._id),
        total: confirmedPayment.amount.total,
        status: confirmedPayment.status,
        paidAt: confirmedPayment.paymentDate,
        comisionProcesada: true,
        jobActualizado: jobActualizado, 
        jobId: confirmedPayment.jobId || null
      }
    });

  } catch (e: any) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    
    console.error("Error confirmando pago:", {
      error: e.message,
      stack: e.stack,
      paymentId: req.params.id
    });
    
    // ... (Manejo de errores) ...
    return res.status(500).json({ 
      error: "error del servidor al procesar el pago",
      ...(process.env.NODE_ENV === 'development' && { details: e.message })
    });
    
  } finally {
    session.endSession();
  }
}