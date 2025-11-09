import mongoose from 'mongoose';
import Job from '../models/job.model'; 
import Wallet from '../models/wallet.model'; 

/**
 * Obtiene las estadísticas de trabajos "Pagado" para un Fixer.
 */
export const getPaymentCenterData = async (fixerId: string) => {
  const fixerObjectId = new mongoose.Types.ObjectId(fixerId);

  try {
    const stats = await Job.aggregate([
      {
        $match: {
          fixerId: fixerObjectId,
          status: "Pagado"
        }
      },
      {
        $group: {
          _id: null, 
          totalGanado: { $sum: "$price" },
          trabajosCompletados: { $sum: 1 }
        }
      }
    ]);

    if (stats.length > 0) {
      return stats[0]; 
    } else {
      return {
        _id: null,
        totalGanado: 0,
        trabajosCompletados: 0
      };
    }
  } catch (error) {
    console.error("Error al calcular estadísticas de trabajos:", error);
    throw new Error("Error al consultar los datos de trabajos.");
  }
};


/**
 * NUEVA FUNCIÓN: Busca una wallet por ID de usuario, o la crea si no existe.
 * @param userId El ID (en string) del Fixer
 */
export const findOrCreateWalletByUserId = async (userId: string) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  try {
    // 1. Intenta encontrar la wallet
    let wallet = await Wallet.findOne({ users_id: userObjectId });

    // 2. Si la wallet existe, devuélvela
    if (wallet) {
      console.log(`Wallet encontrada para el usuario: ${userId}`);
      return wallet;
    }

    // 3. Si no existe, créala con valores por defecto
    console.log(`No se encontró wallet para ${userId}, creando una nueva...`);
    const newWallet = new Wallet({
      users_id: userObjectId,
      balance: 0, // Las nuevas wallets empiezan en 0
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