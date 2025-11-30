import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import express from 'express';
import cors from 'cors';

// --- RUTAS DE LA APP PRINCIPAL ---
import HealthRoutes from './api/routes/health.routes';
import jobOfertRoutes from './api/routes/jobOfert.routes';
import newoffersRoutes from './api/routes/newOffers.routes';
import fixerRoutes from './api/routes/fixer.routes';
import activityRoutes from './api/routes/activities.routes';
import jobsRoutes from './api/routes/jobs.routes';
import searchRoutes from './api/routes/search.routes';

// --- RUTAS DE GESTIÓN DE USUARIOS (Las que ya tenías) ---
import registrarDatosRouter from '../src/api/routes/userManagement/registrarDatos.routes';
import fotoPerfilRouter from '../src/api/routes/userManagement/fotoPerfil.routes';
import googleRouter from "../src/api/routes/userManagement/google.routes";
import ubicacionRouter from "../src/api/routes/userManagement/ubicacion.routes"; 
import authRouter from "../src/api/routes/userManagement/login.routes"; 
import modificarDatosRouter from '../src/api/routes/userManagement/modificarDatos.routes';
import nominatimRouter from '../src/api/routes/userManagement/sugerencias.routes'; 
import deviceRouter from '../src/api/routes/userManagement/device.routes';
import cambiarContrasenaRouter from '../src/api/routes/userManagement/editarContraseña.routes';
import cerrarSesionesRouter from '../src/api/routes/userManagement/cerrarSesiones.routes';
import ultimoCambioRouter from '../src/api/routes/userManagement/ultimoCambio.routes';
import githubAuthRouter from '../src/api/routes/userManagement/github.routes';
import discordRoutes from '../src/api/routes/userManagement/discord.routes';
import clienteRouter from '../src/api/routes/userManagement/cliente.routes';
import obtenerContrasenaRouter from '../src/api/routes/userManagement/obtener.routes';

// --- RUTAS DE PAGOS (LAS QUE FALTABAN) --- 
// Estas son necesarias para que funcione el Centro de Pagos
import PaymentCenterRoutes from './api/routes/paymentCenter.routes'; // <--- ESTA ES LA CLAVE DEL ERROR 404
import CardsRoutes from "./api/routes/card.routes";
import PaymentRoutes from "./api/routes/payment.routes";
import paymentRoutes from "./api/routes/paymentsQR.routes";
import BankAccountRoutes from './api/routes/BankAccount.routes';
import invoiceDetailRouter from './api/routes/invoice.routes'; 
import bankTransferRoutes from './api/routes/bankTransfer.routes';
import CashpayLabRoutes from './api/routes/cashpay.routes';
import  rechargeWallet  from './api/routes/wallet.routes';

import PaymentsQRRoutes from "./api/routes/paymentsQR.routes";
// (Puedes añadir el resto de rutas de pagos aquí si las necesitas: CashPay, Wallet, etc.)

const app = express();

app.use(
  cors({
    origin: [
      'https://devmasters-servineo-frontend-zk3q.vercel.app',
      'http://localhost:8080',
      'http://localhost:8081',
      'http://localhost:3000',
      'http://localhost:4000' // Agregado por seguridad
    ],
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- MOUNT DE RUTAS ---

// 1. Rutas Generales
app.use('/api/lab', CashpayLabRoutes);
app.use('/api', HealthRoutes);
app.use('/api/devmaster', jobOfertRoutes);
app.use('/api/newOffers', newoffersRoutes);
app.use('/api/fixers', fixerRoutes);
app.use('/api', activityRoutes);
app.use('/api', jobsRoutes);
app.use('/api', searchRoutes);

// 2. Rutas de Gestión de Usuarios (Control C)
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
app.use('/auth', githubAuthRouter);
app.use('/auth', discordRoutes);

app.get('/api/controlC/auth/test', (req, res) => {
  res.send("RUTA FUNCIONA");
});

// 3. Rutas de Pagos (LO QUE SOLUCIONA EL 404)
app.use('/api/fixer/payment-center', PaymentCenterRoutes); // <--- ESTO ARREGLA TU ERROR
app.use('/api', CardsRoutes);
app.use('/api', PaymentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', BankAccountRoutes);
app.use('/api/v1/invoices', invoiceDetailRouter);
app.use('/api/transferencia-bancaria', bankTransferRoutes);

//fixerwallet
app.use("/api", rechargeWallet);
app.use('/api/payments', PaymentsQRRoutes);

export const registerRoutes = (app: any) => {
  app.use('/devices', deviceRouter);
};

// Manejo de errores 404
app.use((req, res) => {
  console.log('Not found:', req.method, req.originalUrl);
  res.status(404).send({
    message: 'route not found',
  });
});

// Inicio del servidor
const PORT = process.env.SERVER_PORT || 8000;

// Solo iniciamos si se ejecuta directamente
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en puerto ${PORT}`);
    });
}

export default app;