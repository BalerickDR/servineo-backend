import { Router } from 'express';
import mongoose from 'mongoose';
import { processRechargeWithCard } from '../controllers/recharge.controller';
import Wallet from '../models/wallet.model'; // IMPORTANTE: agregar esto

const router = Router();

// router interno para walletRoutes
router.post('/wallet-recharge/card', processRechargeWithCard);

// Ruta para obtener wallet activa de un fixer
router.get('/fixers/:fixerId/wallet', async (req, res) => {
  const { fixerId } = req.params;

  console.log('💡 fixerId recibido:', fixerId);

  try {
    // Convertir fixerId a ObjectId si es necesario
    const fixerObjectId = mongoose.Types.ObjectId(fixerId);
    console.log('💡 fixerObjectId (convertido):', fixerObjectId);

    // Buscar la wallet en BD
    const wallet = await Wallet.findOne({ users_id: fixerObjectId, status: 'active' });

    console.log('🔍 Resultado wallet:', wallet);

    if (!wallet) {
      console.log('⚠️ Wallet no encontrada para fixerId:', fixerId);
      return res.status(404).json({ error: 'Wallet no encontrada' });
    }

    // Si quieres, comprueba status aquí para depurar:
    if (wallet.status !== 'active') {
      console.log('⚠️ Wallet encontrada pero no está activa:', wallet.status);
      return res.status(404).json({ error: 'Wallet no activa' });
    }

    res.json({ data: wallet });
  } catch (error) {
    console.error('Error al buscar wallet:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
