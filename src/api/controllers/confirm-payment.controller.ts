// servineo-backend/src/api/controllers/confirm-payment.controller.ts
import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Payment } from "../../models/payment.model";
import { Comision } from "../../models/historycomission.model";
import { Wallet } from "../../models/wallet.model";
import Job from "../../models/jobPayment.model"; // Para detalles de factura
import User from "../../models/userPayment.model"; 
import Jobspay from "../../models/jobs.model"; // 🟢 CRÍTICO: Tu modelo local que funciona
import { updateWalletLowBalanceFlags } from "../../services/wallet.service"; // 🟢 Tu servicio local

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

    // Lock pesimista (del General)
    const pay = await Payment.findById(id).session(session);

    if (!pay) {
      await session.abortTransaction();
      return res.status(404).json({ error: "pago no encontrado" });
    }

    // Verificar estado
    if (String(pay.status).toLowerCase() !== "pending") {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: `el pago ya fue procesado`,
        status: pay.status 
      });
    }

    const now = new Date();

    // Verificar expiración
    if (pay.codeExpiresAt && pay.codeExpiresAt.getTime() < now.getTime()) {
      await session.abortTransaction();
      return res.status(410).json({ 
        error: "código expirado",
        expiredAt: pay.codeExpiresAt 
      });
    }

    // Verificar bloqueo activo (Mejora del General: cálculo de tiempo restante)
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

    // Verificar código incorrecto
    if (provided !== real) {
      const newAttempts = (pay.failedAttempts ?? 0) + 1;
      pay.failedAttempts = newAttempts;

      console.warn(`Payment ${id}: intento fallido ${newAttempts}/${MAX_ATTEMPTS}`);
      
      // Bloquear si supera intentos
      if (newAttempts >= MAX_ATTEMPTS) {
        const lockUntil = new Date(now.getTime() + LOCK_MINUTES * 60 * 1000);
        pay.lockUntil = lockUntil;
        
        await pay.save({ session });
        await session.commitTransaction();

        return res.status(429).json({
          error: "cuenta bloqueada",
          message: `has superado los ${MAX_ATTEMPTS} intentos; intenta nuevamente en ${LOCK_MINUTES} minuto(s)`,
          waitMinutes: LOCK_MINUTES,
          unlocksAt: lockUntil
        });
      }
      
      await pay.save({ session });
      await session.commitTransaction();

      const remaining = MAX_ATTEMPTS - newAttempts;
      return res.status(401).json({
        error: "código inválido",
        remainingAttempts: remaining,
        message: `código inválido, te quedan ${remaining} intento(s)`
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
    // 🎯 ACTUALIZAR STATUS DEL JOB A "PAGADO"
    // (Usamos TU lógica Local con el modelo Jobspay correcto)
    // ============================================
    let jobActualizado = false;
    
    if (confirmedPayment.jobId) {
      try {
        console.log(`🔄 Actualizando status del job ${confirmedPayment.jobId} a "Pagado"`);
        
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
      } catch (jobError: unknown) {
        console.error(`❌ Error actualizando job ${confirmedPayment.jobId}:`, (jobError as Error).message);
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
        Job.findById(confirmedPayment.jobId).session(session), // Usamos Job detallado
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
    } catch (invoiceError: unknown) {
      console.error("❌ Error en trigger de facturación:", (invoiceError as Error).message);
    }

    // ============================================
    // 🔥 TRIGGER: CREAR COMISIÓN AUTOMÁTICAMENTE
    // (Mantenemos TU lógica local: Permitir saldo negativo)
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

      // 🟢 TU LÓGICA: Permitir saldos negativos y actualizar flags
      if (fixerWallet) {
        await Wallet.findByIdAndUpdate(
          fixerWallet._id,
          { $inc: { balance: -comisionMonto } }, // Siempre descuenta
          { session }
        );
        console.log(`✅ Comisión de ${comisionMonto} Bs descontada del wallet (Permite negativo)`);

        // Actualizar flags de saldo bajo / crítico
        const preBalance = fixerWallet.balance;
        const postBalance = preBalance - comisionMonto;

        try {
          await updateWalletLowBalanceFlags({
            walletId: String(fixerWallet._id),
            preBalance,
            postBalance,
            lowBalanceThreshold: fixerWallet.lowBalanceThreshold,
            session,
          });
        } catch (flagsError: unknown) {
          console.error(
            "❌ Error actualizando flags de saldo bajo en wallet:",
            (flagsError as Error).message,
          );
        }
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

    } catch (error: unknown) {
      console.error("❌ Error en trigger de comisión:", (error as Error).message);
    }

    await session.commitTransaction();

    console.info(`Payment ${id}: confirmado exitosamente + triggers ejecutados`);

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

  } catch (e: unknown) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    
    console.error("Error confirmando pago:", {
      error: (e as Error).message,
      stack: (e as Error).stack,
      paymentId: req.params.id
    });
    
    return res.status(500).json({ 
      error: "error del servidor al procesar el pago",
      ...(process.env.NODE_ENV === 'development' && { details: (e as Error).message })
    });
    
  } finally {
    session.endSession();
  }
}