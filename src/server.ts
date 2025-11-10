// src/server.ts
import express from 'express';
// Importaciones de servicios
import AppRoutes from './config/server.routes'; 

// [CORRECCIÓN] No importamos connectDB ni env.config porque no existen.
// Definimos el puerto aquí como una constante simple para que Express arranque:
const SERVER_PORT = 4000; 

const app = express();

// Middlewares estándar de Express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Establecer CORS globalmente
app.use((req, res, next) => {
    // Permitir acceso desde el frontend
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Manejar la solicitud OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(204).send();
    }
    next();
});


// ===================================================
// MONTAJE CRÍTICO: Delega todas las rutas a AppRoutes
// ===================================================
// Montar el router general AppRoutes para todas las URLs
app.use(AppRoutes); 
app.use('/api', AppRoutes);


// ===================================================
// LÓGICA DE ARRANQUE (Sin conexión a DB)
// ===================================================

async function startApp() {
    try {
        // [CORRECCIÓN] Eliminamos la conexión a DB
        console.log('✅ Base de datos (MOCK) asumida como conectada.');

        app.listen(SERVER_PORT, () => {
            console.log(`Server corriendo en http://localhost:${SERVER_PORT}`);
        });

    } catch (error) {
        console.error('❌ Error al iniciar la aplicación:', error);
        process.exit(1); 
    }
}

startApp(); 

export default app;