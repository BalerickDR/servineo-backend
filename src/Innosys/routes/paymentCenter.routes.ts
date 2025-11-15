import { Router } from 'express';
// 1. Importa la FUNCIÓN específica, no todo el archivo con '*'.
import { getPaymentCenterDashboard } from '../controllers/paymentCenter.controllers';

const router = Router();

// 2. Usa la función directamente en la ruta.
router.get('/:fixerId', getPaymentCenterDashboard);

export default router;