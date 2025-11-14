import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Payment } from "../../models/payment.model";
import { Comision } from "../../models/historycomission.model";
import { Wallet } from "../../models/wallet.model";
import Job from "../../models/job.model"; 
import User from "../../models/user.model"; 
import Jobspay from "../../models/jobs.model"; 

const MAX_ATTEMPTS = 3;
const LOCK_MINUTES = 10;

export async function confirmPaymentLab(req: Request, res: Response) {
  const session = await mongoose.startSession();
  
  try {
    const { id } = req.params as { id: string };
    const { code } = (req.body || {}) as { code?: string };

    // ... (Validaciones de ID, code, provided, formato... todo bien) ...
    if (!mongoose.isValidObjectId(id)) { return res.status(400).json({ error: "id inválido" }); }
    if (!code) { return res.status(400).json({ error: "code requerido" }); }
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

    // ... (Validaciones de 'pending', expiración, bloqueo... todo bien) ...
    if (String(pay.status).toLowerCase() !== "pending") {
      await session.abortTransaction();
      return res.status(400).json({ error: `el pago ya fue procesado` });
    }
    // ...

    const now = new Date();
    
    // ... (Lógica de 'lockUntil' ... todo bien) ...
    
    const real = String(pay.code);

    // Verificar código
    if (provided !== real) {
      // ... (Lógica de intentos fallidos... todo bien) ...
      const newAttempts = (pay.failedAttempts ?? 0) + 1;
      pay.failedAttempts = newAttempts;
      // ... (bloqueo si >= MAX_ATTEMPTS) ...
      await pay.save({ session });
      await session.commitTransaction();
      const remaining = MAX_ATTEMPTS - newAttempts;
      return res.status(401).json({
        error: "código inválido",
        remainingAttempts: remaining,
      });
    }

    // ✅ Código correcto - Confirmar pago
    const confirmedPayment = await Payment.findOneAndUpdate(
      { 
        _id: id,
        status: "pending", 
        code: provided
      },
      {
        $set: {
          status: "paid",
          paymentDate: now,
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
    // 🔥 TRIGGER: ENRIQUECER PAGO CON DATOS DE FACTURA
    // ============================================
    console.log(`🧾 Añadiendo datos de factura al pago ${id}`);
    
    try {
      // 1. Buscar los datos que faltan (Job y Requester/Payer)
      const [job, requester] = await Promise.all([
        // ¡USA EL MODELO 'Job' (job.model.ts) PARA DATOS RICOS!
        Job.findById(confirmedPayment.jobId).session(session), 
        User.findById(confirmedPayment.payerId).session(session) 
      ]);

      if (!job || !requester) {
        throw new Error("No se encontraron el Job (en 'jobs') o el Requester (en 'users') para la factura.");
      }

      // 2. Calcular montos finales de la factura
      const subtotal = confirmedPayment.amount.total;
      const commission = subtotal * (confirmedPayment.commissionRate || 0.05);
      const iva = (subtotal + commission) * 0.13; 
      const totalFinal = subtotal + commission + iva;

      // 3. Actualizar el documento 'Payment' con los datos de la factura
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
      // ... (Tu lógica de comisión de wallet sigue igual) ...
      const fixerWallet = await Wallet.findOne({ users_id: confirmedPayment.fixerId }).session(session);
      // ...
      const comisionRate = confirmedPayment.commissionRate || 0.05;
      const montoServicio = confirmedPayment.amount.total; 
      const comisionMonto = montoServicio * comisionRate;
      // ... (lógica de if/else de fondos) ...
      // ... (Creación de Comision) ...
      console.log(`✅ Comisión registrada en historial`);
    } catch (error: any) {
      console.error("❌ Error en trigger de comisión:", error);
    }

    await session.commitTransaction();

    console.info(`Payment ${id}: confirmado exitosamente + triggers ejecutados`);

    const finalPaymentDoc = await Payment.findById(id).lean();

    return res.json({
      message: "pago confirmado exitosamente",
      data: finalPaymentDoc 
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