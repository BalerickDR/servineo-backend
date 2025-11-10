import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from '../Innosys/config/database.config';
import { SERVER_PORT } from './env.config'; 

// Importaciones de Rutas
import AppRoutes from '../config/server.routes'; 
import paymentsRouter from '../Innosys/routes/payments.qr';
import invoiceRoutes from '../Innosys/routes/invoice.routes'; // LA IMPORTACIÓN CLAVE

dotenv.config();

const app = express();

// --- MIDDLEWARES ---

// ===================================================
// [INTEGRACIÓN DE LÓGICA CORS DEL EQUIPO PARA VERCEL]
// ===================================================

// 1. Define tu lista de orígenes permitidos
const allowedOrigins = [
  'http://localhost:3000',                   // Tu frontend de desarrollo
  'https://servineo-frontend-blush.vercel.app',    // <-- ¡TU URL DE VERCEL! (Reemplaza si es diferente)
  'https://servineo-frontend-git-dev-diego-revollos-projects.vercel.app',
  'https://servineo-frontend-git-centropagos-diego-revollos.vercel.app',
  'https://servineo-frontend-azbznu1q9-diego-revollos-projects.vercel.app'
];

app.use(
  cors({
    // 2. Usa una función para 'origin' que revise la lista
    origin: function (origin, callback) {
      // Permite peticiones si el origen está en la lista, o si no hay origen (ej. Postman)
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Origen no permitido por la política de CORS.'));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

// ===================================================
// [FIN DE INTEGRACIÓN CORS]
// ===================================================

app.use(express.json());


// --- REGISTRO DE RUTAS ---

app.use('/api/payments', paymentsRouter); 

// La ruta de facturación que tienes en tu archivo
app.use('/api/v1/invoices', invoiceRoutes);

// Rutas generales
app.use(AppRoutes);
app.use('/api', AppRoutes); 


// ===================================================
// LÓGICA DE ARRANQUE 
// ===================================================

async function startApp() {
    try {
        console.log('🔗 Conectando a MongoDB...');
        await connectDB();
        console.log('✅ Base de datos conectada.');

        app.listen(SERVER_PORT, () => {
            console.log(`Server corriendo en http://localhost:${SERVER_PORT}`);
        });

    } catch (error) {
        console.error('❌ Error al iniciar la aplicación:', error);
        process.exit(1); 
    }
}

// Iniciar la aplicación
startApp(); 

export default app;