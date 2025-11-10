// ============================================
// ARCHIVO: src/config/server.routes.ts
// ============================================

import { Router } from 'express';

import HealthRoutes from '../modules/health/health.routes';
import CardsRoutes from "../Innosys/routes/card.routes";
import UsersRoutes from "../Innosys/routes/user.routes";
import PaymentRoutes from "../Innosys/routes/payment.routes";
import CashPayRoutes from '../Innosys/routes/lab/cashpay.routes';
import BankAccountRoutes from '../Innosys/routes/BankAccount.routes';
import paymentsRouter from "../Innosys/routes/payments.qr";
import PaymentCenterRoutes from '../Innosys/routes/paymentCenter.routes'; // ← NUEVO
import walletRoutes from "../Innosys/routes/walletRoutes";

//jhoel
import bankTransferRoutes from '../Innosys/routes/bankTransferRoute';

const router = Router();

// Middleware de debug para ver todas las peticiones
router.use((req, res, next) => {
  console.log('📝 Ruta solicitada:', req.method, req.originalUrl);
  next();
});

// Ruta raíz para verificar que el servidor funciona
router.get("/", (req, res) => {
  res.json({ 
    message: "Servidor funcionando correctamente",
    timestamp: new Date().toISOString()
  });
});

// Registrar todas las rutas bajo /api
router.use('/api', HealthRoutes);
router.use('/api', CardsRoutes);
router.use('/api', UsersRoutes);
router.use('/api', PaymentRoutes);
router.use('/api', BankAccountRoutes); 
router.use('/api/lab', CashPayRoutes);
router.use('/api/transferencia-bancaria', bankTransferRoutes); //transferencia bancaria (jhoel)
router.use('/api', walletRoutes);


// Rutas de Payment Center - Centro de Pagos del Fixer
router.use('/api/fixer/payment-center', PaymentCenterRoutes); // ← NUEVO

// Rutas de pagos QR
router.use("/payments", paymentsRouter);
router.use("api/payments", paymentsRouter);

// Manejo de rutas no encontradas (404)
router.use((req, res) => {
  console.log('❌ Not found:', req.method, req.originalUrl);
  res.status(404).json({ 
    message: 'route not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

export default router;