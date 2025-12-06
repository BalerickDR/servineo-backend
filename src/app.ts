// src/app.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import express from 'express';
import cors from 'cors';

// --- RUTAS DE LA APP PRINCIPAL ---
import JobsRoutes from './api/routes/jobsPayment.routes';
import jobOfertRoutes from './api/routes/jobOfert.routes';
import newoffersRoutes from './api/routes/newOffers.routes';
import fixerRoutes from './api/routes/fixer.routes';
import jobsRoutes from './api/routes/jobs.routes';
import activityRoutes from './api/routes/activities.routes';
import searchRoutes from './api/routes/search.routes';
import chartRoutes from './api/routes/chart.routes';
import trackingRoutes from './api/routes/tracking-appointments.routes';
import experienceRoutes from './routes/experience.routes';
import userProfileRoutes from './routes/userProfile.routes';
import userRoutes from './routes/user.routes';
import jobOfficial from './routes/job_offer.routes';
import certificationRoutes from './routes/certification.routes';
import portfolioRoutes from './routes/portfolio.routes';
import routerUser from './api/routes/user.routes';
import adminRouter from './api/routes/userManagement/admin.routes';
import SudoersRouter from './modules/sudoers.routes';
import forumRoutes from './api/routes/forum.routes';
import faqRoutes from './api/routes/faq.routes';
import captchaRoutes from './api/routes/captcha.routes';

import registrarDatosRouter from '../src/api/routes/userManagement/registrarDatos.routes';
import fotoPerfilRouter from '../src/api/routes/userManagement/fotoPerfil.routes';
import googleRouter from '../src/api/routes/userManagement/google.routes';
import ubicacionRouter from '../src/api/routes/userManagement/ubicacion.routes';
import authRouter from './api/routes/userManagement/login.routes';
import modificarDatosRouter from './api/routes/userManagement/modificarDatos.routes';
import nominatimRouter from './api/routes/userManagement/sugerencias.routes';
import deviceRouter from './api/routes/userManagement/device.routes';
import cambiarContrasenaRouter from './api/routes/userManagement/editarContraseña.routes';
import cerrarSesionesRouter from './api/routes/userManagement/cerrarSesiones.routes';
import ultimoCambioRouter from './api/routes/userManagement/ultimoCambio.routes';
import githubAuthRouter from './api/routes/userManagement/github.routes';
import discordRoutes from './api/routes/userManagement/discord.routes';
import clienteRouter from './api/routes/userManagement/cliente.routes';
import obtenerContrasenaRouter from './api/routes/userManagement/obtener.routes';
import sesion2faRouter from './api/routes/userManagement/sesion2fa.routes';
import ingresar2faRouter from './api/routes/userManagement/ingresar2fa.routes';
import codigos2faRouter from './api/routes/userManagement/codigos2fa.routes';
import twoFaRouter from './api/routes/userManagement/2fa.routes';
import signUpRoutes from './api/routes/userManagement/signUp.routes';
import deleteAccountRoutes from '../src/api/routes/userManagement/deleteAccount.routes';
import updateProfileRouter from '../src/api/routes/userManagement/updateProfile.routes';

import CardsRoutes from './api/routes/card.routes';
import PaymentRoutes from './api/routes/payment.routes';
import CashPayRoutes from './api/routes/cashpay.routes';
import BankAccountRoutes from './api/routes/BankAccount.routes';
import paymentsRouter from './api/routes/paymentsQR.routes';
import PaymentCenterRoutes from './api/routes/paymentCenter.routes';
import myJobsPaymentRoutes from './api/routes/jobsPayment.routes';
import invoiceDetailRouter from './api/routes/invoice.routes';
import bankTransferRoutes from './api/routes/bankTransfer.routes';
import rechargeWallet from './api/routes/wallet.routes';
import walletRoutes from './api/routes/wallet.routes';

// --- FEATURE FLAGS ---
import { devWalletRouter } from './api/routes/dev-wallet.routes';
import { simPaymentsRouter } from './api/routes/sim-payments.routes';
import { FEATURE_DEV_WALLET, FEATURE_SIM_PAYMENTS } from './models/featureFlags.model';

const app = express();

// --- CONFIGURACIÓN CORS ---
const allowedOrigins = [
  'https://servineo-frontend-bytes-bandidos.vercel.app',
  'https://devmasters-servineo-frontend-zk3q.vercel.app',
  'https://servineo-frontend-blush.vercel.app',
  'https://servineo.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:4000',
  'http://localhost:8080',
  'http://localhost:8081',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin || allowedOrigins[0]);
      } else {
        console.log('Origen bloqueado por CORS (Permitido Temporalmente):', origin);
        callback(null, true); // Permisivo temporalmente para evitar bloqueos en pruebas
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }),
);

// --- MIDDLEWARES GLOBALES ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Log de peticiones
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.use('/api/fixer/payment-center', PaymentCenterRoutes);
app.use('/api/lab', CashPayRoutes);
app.use('/api/v1/invoices', invoiceDetailRouter);
app.use('/api', BankAccountRoutes);

app.use('/api', PaymentRoutes);
app.use('/api', CardsRoutes);
app.use('/api', rechargeWallet);
app.use('/api', myJobsPaymentRoutes);
app.use('/api/transferencia-bancaria', bankTransferRoutes);
app.use('/api/payments', paymentsRouter);
app.use('/api', walletRoutes);

app.use('/api/signUp', signUpRoutes);
app.use('/devices', deviceRouter);
app.use('/api', searchRoutes);
app.use('/api', forumRoutes);
app.use('/api', faqRoutes);
app.use('/', captchaRoutes);

app.use('/api/devmaster', jobOfertRoutes);
app.use('/api/newOffers', newoffersRoutes);
app.use('/api/fixers', fixerRoutes);
app.use('/api', activityRoutes);
app.use('/api', jobsRoutes);
app.use('/api', JobsRoutes);
app.use('/api/job-offers', jobOfficial);

app.use('/login', authRouter);
app.use('/auth', githubAuthRouter);
app.use('/auth', discordRoutes);
app.use('/api/user-profiles', userProfileRoutes);
app.use('/api/user', userRoutes);
app.use('/api/user', routerUser);
app.use('/api/experiences', experienceRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/certifications', certificationRoutes);

app.use('/api/controlC/google', googleRouter);
app.use('/api/controlC/ubicacion', ubicacionRouter);
app.use('/api/controlC/auth', authRouter);
app.use('/api/controlC/registro', registrarDatosRouter);
app.use('/api/controlC/modificar-datos', modificarDatosRouter);
app.use('/api/controlC/sugerencias', nominatimRouter);
app.use('/api/controlC/cambiar-contrasena', cambiarContrasenaRouter);
app.use('/api/controlC/cerrar-sesiones', cerrarSesionesRouter);
app.use('/api/controlC/ultimo-cambio', ultimoCambioRouter);
app.use('/api/controlC/foto-perfil', fotoPerfilRouter);
app.use('/api/controlC/obtener-password', obtenerContrasenaRouter);
app.use('/api/controlC/cliente', clienteRouter);
app.use('/api/controlC/usuario/update', updateProfileRouter);
app.use('/api/controlC/usuario', deleteAccountRoutes);

// Seguridad y Admin
app.use('/api/controlC/sesion2fa', sesion2faRouter);
app.use('/api/controlC/2fa-ingresar', ingresar2faRouter);
app.use('/api/controlC/codigos2fa', codigos2faRouter);
app.use('/api/controlC/2fa', twoFaRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin', trackingRoutes);
app.use('/api/admin/chart', chartRoutes);
app.use('/', SudoersRouter);

// Feature Flags
console.log('FEATURE_DEV_WALLET =', FEATURE_DEV_WALLET);
if (FEATURE_DEV_WALLET) {
  console.log('MOUNT /api/dev ✅');
  app.use('/api/dev', devWalletRouter);
}
if (FEATURE_SIM_PAYMENTS) {
  app.use('/api/sim', simPaymentsRouter);
}

// Función exportada para registrar dispositivos
export const registerRoutes = (app: any) => {
  app.use('/devices', deviceRouter);
};

// --- MANEJO DE ERRORES (404) ---
app.use((req, res) => {
  console.log('Not found:', req.method, req.originalUrl);
  res.status(404).send({
    message: 'route not found',
  });
});

// --- INICIO DEL SERVIDOR ---
const PORT = process.env.SERVER_PORT || 8000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
}

console.log('📌 Server Initialized and Routes Mounted');

export default app;
