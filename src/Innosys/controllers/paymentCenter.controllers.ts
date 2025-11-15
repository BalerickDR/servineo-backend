// src/Innosys/controllers/paymentCenter.controllers.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import * as PaymentService from '../services/paymentCenter.service';

/**
 * Obtiene TODOS los datos del dashboard del fixer:
 * 1. Estadísticas (Total Ganado, Trabajos Completados)
 * 2. Saldo de Wallet
 * 3. Historial de Transacciones (Comisiones y Recargas)
 */
export const getPaymentCenterDashboard = async (req: Request, res: Response) => {
  try {
    const { fixerId } = req.params;

    // 1. Validación del ID (del controlador 'handleGetPaymentCenter' antiguo)
    if (!fixerId || !mongoose.Types.ObjectId.isValid(fixerId)) {
      return res.status(400).json({ success: false, error: "ID de Fixer inválido." });
    }

    // 2. Ejecuta todas las consultas en paralelo para máxima eficiencia
    const [jobStats, wallet, allTransactions] = await Promise.all([
      PaymentService.getPaymentCenterData(fixerId),
      PaymentService.findOrCreateWalletByUserId(fixerId),
      PaymentService.getAllTransactions(fixerId)
    ]);

    // 3. Combina y devuelve todos los resultados
    res.status(200).json({
      success: true,
      data: {
        saldoActual: wallet.balance,
        totalGanado: jobStats.totalGanado,
        trabajosCompletados: jobStats.trabajosCompletados,
        transactions: allTransactions, // <-- ¡Ahora sí se incluyen las transacciones!
      }
    });

  } catch (error: any) {
     res.status(500).json({ success: false, error: error.message });
  }
}

// (La función 'handleGetPaymentCenter' antigua ha sido eliminada 
//  porque 'getPaymentCenterDashboard' ahora hace su trabajo)