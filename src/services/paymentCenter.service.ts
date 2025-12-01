import mongoose from 'mongoose';
import { Payment } from '../models/payment.model'; 
import { Wallet } from '../models/wallet.model';
import { Comision } from '../models/historycomission.model';
import { Recharge } from '../models/walletRecharge.model';

/**
 * Obtiene las estadísticas de trabajos "Pagado" para un Fixer
 * LEYENDO DESDE LA COLECCIÓN 'payments'
 */
export const getPaymentCenterData = async (fixerId: string) => {
  const fixerObjectId = new mongoose.Types.ObjectId(fixerId);

  try {
    // --- CAMBIO: Usa 'Payment.aggregate' ---
    const stats = await Payment.aggregate([
      {
        // 1. Busca todos los pagos "paid" de este fixer
        $match: {
          fixerId: fixerObjectId,
          status: "paid" 
        }
      },
      {
        // 2. Agrupa los resultados
        $group: {
          _id: null, 
          // Suma el 'subTotal' (el monto antes de comisiones/IVA)
          totalGanado: { $sum: "$amount.subTotal" }, 
          // Cuenta el número de documentos (trabajos pagados)
          trabajosCompletados: { $sum: 1 } 
        }
      }
    ]);

    if (stats.length > 0) {
      // Devuelve: { _id: null, totalGanado: 1160, trabajosCompletados: 13 }
      return stats[0]; 
    } else {
      // Si no encuentra ninguno, devuelve 0
      return {
        _id: null,
        totalGanado: 0,
        trabajosCompletados: 0
      };
    }
  } catch (error) {
    console.error("Error al calcular estadísticas de 'payments':", error);
    throw new Error("Error al consultar los datos de pago.");
  }
};


/**
 * Busca una wallet por ID de usuario, o la crea si no existe.
 */
export const findOrCreateWalletByUserId = async (userId: string) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  try {
    // 1. Intenta encontrar la wallet
    const wallet = await Wallet.findOne({ users_id: userObjectId });

    // 2. Si la wallet existe, devuélvela
    if (wallet) {
      console.log(`Wallet encontrada para el usuario: ${userId}`);
      return wallet;
    }

    // 3. Si no existe, créala con valores por defecto
    console.log(`No se encontró wallet para ${userId}, creando una nueva...`);
    const newWallet = new Wallet({
      users_id: userObjectId,
      balance: 0, 
      currency: 'BOB',
      status: 'active',
      minimumBalance: 0,
      lowBalanceThreshold: 50
    });

    // 4. Guarda la nueva wallet en la DB
    await newWallet.save();
    console.log(`Nueva wallet creada con ID: ${newWallet._id}`);
    
    return newWallet;

  } catch (error) {
    console.error("Error al buscar o crear la wallet:", error);
    throw new Error("Error al procesar la wallet del usuario.");
  }
};

export const getAllTransactions = async (fixerId: string) => {
  const fixerObjectId = new mongoose.Types.ObjectId(fixerId);

  try {
    // 1. Buscar la wallet primero
    const wallet = await Wallet.findOne({ users_id: fixerObjectId }).select('_id').lean();
    
    let recargas = [];
    if (wallet) {
      recargas = await Recharge.find({ walletId: wallet._id })
        .sort({ createdAt: -1 })
        .lean();
    }

    // 2. Buscar las comisiones
    const comisiones = await Comision.find({ fixer_id: fixerObjectId })
      .sort({ createdAt: -1 })
      .lean();

    // 3. Mapear y dar formato a los datos
    const mappedRecargas = recargas.map(r => ({
      _id: r._id.toString(),
      type: 'deposit', // 'deposit' para que coincida con tus filtros
      amount: r.amount, 
      description: 'Recarga de Saldo', // Puedes hacerlo más específico
      createdAt: r.createdAt.toISOString(),
    }));

    const mappedComisiones = comisiones.map(c => ({
      _id: c._id.toString(),
      type: 'commission', // 'commission' para que coincida con tus filtros
      amount: -c.comision, // Es un egreso (negativo)
      description: `Comisión - Trabajo #${c.payments_id.toString().slice(-6)}`,
      jobId: c.payments_id.toString(),
      createdAt: c.createdAt.toISOString(),
    }));

    // 4. Combinar y ordenar
    const allMovements = [...mappedRecargas, ...mappedComisiones];
    allMovements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return allMovements;

  } catch (error) {
    console.error("Error al obtener transacciones:", error);
    throw new Error("Error al consultar movimientos.");
  }
};