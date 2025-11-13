import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Payment } from "../../models/payment.model";
import { Comision } from "../../models/historycomission.model";
import { Wallet } from "../../models/wallet.model";
import User from "../../models/user.model"; 
import Jobspay from "../../models/jobs.model"; 

const MAX_ATTEMPTS = 3;
const LOCK_MINUTES = 10;

export async function confirmPaymentLab(req: Request, res: Response) {
  const session = await mongoose.startSession();
  
  try {
    const { id } = req.params as { id: string };
    const { code } = (req.body || {}) as { code?: string };

    // Validaciones básicas
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "id inválido" });
    }

    if (!code) {
      return res.status(400).json({ error: "code requerido" });
    }

    // Validar formato del código
    const provided = String(code).toUpperCase().trim();
    if (!/^[A-Z0-9]{4,10}$/.test(provided)) {
      return res.status(400).json({ 
        error: "formato de código inválido" 
      });
    }

    session.startTransaction();

    // Obtener el pago con lock pesimista
    const pay = await Payment.findById(id).session(session);
    
    if (!pay) {
      await session.abortTransaction();
      return res.status(404).json({ error: "pago no encontrado" });
    }

    // Verificar que el pago esté pendiente
    if (String(pay.status).toLowerCase() !== "pending") {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: `el pago ya fue procesado`,
        status: pay.status 
      });
    }

    // Verificar expiración del código
    if (pay.codeExpiresAt && pay.codeExpiresAt.getTime() < Date.now()) {
      await session.abortTransaction();
      return res.status(410).json({ 
        error: "código expirado",
        expiredAt: pay.codeExpiresAt 
      });
    }

    const now = new Date();

    // Verificar si hay un bloqueo activo
    if (pay.lockUntil && pay.lockUntil.getTime() > now.getTime()) {
      await session.abortTransaction();
      const msLeft = pay.lockUntil.getTime() - now.getTime();
      const waitMinutes = Math.ceil(msLeft / 60000);
      
      console.warn(`Payment ${id}: intento rechazado por bloqueo activo`);
      
      return res.status(429).json({
        error: "demasiados intentos fallidos",
        message: `intenta nuevamente en ${waitMinutes} minuto(s)`,
        waitMinutes,
        unlocksAt: pay.lockUntil
      });
    }

    // Limpiar bloqueo si ya expiró
    if (pay.lockUntil && pay.lockUntil.getTime() <= now.getTime()) {
      pay.lockUntil = null;
      pay.failedAttempts = 0;
    }

    const real = String(pay.code);

    // Verificar código
    if (provided !== real) {
      // Incrementar intentos fallidos
      const newAttempts = (pay.failedAttempts ?? 0) + 1;
      pay.failedAttempts = newAttempts;

      console.warn(`Payment ${id}: intento fallido ${newAttempts}/${MAX_ATTEMPTS}`);

      // Bloquear si se alcanzó el límite
      if (newAttempts >= MAX_ATTEMPTS) {
        const lockUntil = new Date(now.getTime() + LOCK_MINUTES * 60 * 1000);
        pay.lockUntil = lockUntil;
        await pay.save({ session });
        await session.commitTransaction();

        console.warn(`Payment ${id}: BLOQUEADO por ${LOCK_MINUTES} minutos`);

        return res.status(429).json({
          error: "cuenta bloqueada",
          message: `has superado los ${MAX_ATTEMPTS} intentos; intenta nuevamente en ${LOCK_MINUTES} minuto(s)`,
          waitMinutes: LOCK_MINUTES,
          unlocksAt: lockUntil
        });
      }

      // Guardar intento fallido
      await pay.save({ session });
      await session.commitTransaction();

      const remaining = MAX_ATTEMPTS - newAttempts;
      return res.status(401).json({
        error: "código inválido",
        remainingAttempts: remaining,
        message: `código inválido, te quedan ${remaining} intento(s)`
      });
    }

    // ✅ Código correcto - Confirmar pago usando operación atómica
    // ❌ ERROR CORREGIDO: Cambiado 'confirmedPayment' por 'confirmed'
    const confirmed = await Payment.findOneAndUpdate(
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

    if (!confirmed) {
      await session.abortTransaction();
      return res.status(409).json({ 
        error: "conflicto: el pago ya fue procesado por otra solicitud" 
      });
    }

    // ============================================
    // 🎯 ACTUALIZAR STATUS DEL JOB A "PAGADO"
    // ============================================
    let jobActualizado = false;
    
    if (confirmed.jobId) {
      try {
        console.log(`🔄 Actualizando status del job ${confirmed.jobId} a "Pagado"`);
        
        // ❌ ERROR CORREGIDO: 'jobsPays' no existe, usar 'Jobspay'
        const jobUpdated = await Jobspay.findByIdAndUpdate(
          confirmed.jobId,
          { 
            $set: { 
              status: "Pagado" 
            } 
          },
          { 
            new: true,
            session 
          }
        );

        if (jobUpdated) {
          console.log(`✅ Job ${confirmed.jobId} actualizado a status "Pagado"`);
          jobActualizado = true;
        } else {
          console.warn(`⚠️ No se encontró el job ${confirmed.jobId}`);
        }
      } catch (jobError: any) {
        console.error(`❌ Error actualizando job ${confirmed.jobId}:`, jobError);
      }
    } else {
      console.warn(`⚠️ El pago ${id} no tiene jobId asociado`);
    }

    // ============================================
    // 🧾 ENRIQUECER PAGO CON DATOS DE FACTURA
    // ============================================
    console.log(`🧾 Añadiendo datos de factura al pago ${id}`);
    
    try {
      const [job, requester] = await Promise.all([
        Jobspay.findById(confirmed.jobId).session(session),
        User.findById(confirmed.payerId).session(session)
      ]);

      if (!job || !requester) {
        console.warn("⚠️ No se encontraron el Job o el Requester para la factura");
      } else {
        const subtotal = confirmed.amount.total;
        const commission = subtotal * (confirmed.commissionRate || 0.05);
        const iva = (subtotal + commission) * 0.13; 
        const totalFinal = subtotal + commission + iva;

        await Payment.findByIdAndUpdate(confirmed._id, {
          $set: {
            requesterName: requester.name,
            companyName: (requester as any).companyName || "N/A",
            taxId: (requester as any).taxId || "N/A",
            jobType: job.type, 
            jobDescription: job.description, 
            transactionId: `CASH-${confirmed._id}`, 
            "Payment Method": "Efectivo", 
            commission: commission,
            iva: iva,
            "amount.total": totalFinal 
          }
        }, { session });

        console.log(`✅ Datos de factura añadidos al pago ${confirmed._id}`);
      }
    } catch (invoiceError: any) {
      console.error("❌ Error en trigger de facturación:", invoiceError.message);
    }

    // ============================================
    // 💰 CREAR COMISIÓN AUTOMÁTICAMENTE
    // ============================================
    console.log(`💰 Activando trigger de comisión para pago ${id}`);
    
    try {
      const fixerWallet = await Wallet.findOne({ 
        users_id: confirmed.fixerId 
      }).session(session);

      if (!fixerWallet) {
        console.warn(`❌ No se encontró wallet para fixer: ${confirmed.fixerId}`);
      }

      const comisionRate = confirmed.commissionRate || 0.05;
      const montoServicio = confirmed.amount.total; 
      const comisionMonto = montoServicio * comisionRate;

      let estadoComision = "completada";
      let motivoFallo = null;

      if (fixerWallet && fixerWallet.balance >= comisionMonto) {
        await Wallet.findByIdAndUpdate(
          fixerWallet._id,
          { $inc: { balance: -comisionMonto } },
          { session }
        );
        console.log(`✅ Comisión de ${comisionMonto} Bs descontada del wallet`);
      } else {
        estadoComision = "fallida";
        motivoFallo = fixerWallet 
          ? `Fondos insuficientes: ${fixerWallet.balance} Bs < ${comisionMonto} Bs`
          : "Wallet del fixer no encontrado";
        console.warn(`❌ ${motivoFallo}`);
      }

      await Comision.create([{
        wallets_id: fixerWallet?._id || confirmed.fixerId,
        payments_id: confirmed._id,
        fixer_id: confirmed.fixerId,
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

    return res.json({
      message: "pago confirmado exitosamente",
      data: {
        id: String(confirmed._id),
        total: confirmed.amount.total,
        status: confirmed.status,
        paidAt: confirmed.paymentDate,
        comisionProcesada: true,
        jobActualizado: jobActualizado,
        jobId: confirmed.jobId || null
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

    if (e.name === 'ValidationError') {
      return res.status(400).json({ 
        error: "datos de validación inválidos",
        details: process.env.NODE_ENV === 'development' ? e.message : undefined
      });
    }

    if (e.name === 'CastError') {
      return res.status(400).json({ error: "formato de id inválido" });
    }

    return res.status(500).json({ 
      error: "error del servidor al procesar el pago",
      ...(process.env.NODE_ENV === 'development' && { details: e.message })
    });
    
  } finally {
    session.endSession();
  }
}