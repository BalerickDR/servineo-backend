import { SERVER_PORT } from './config/env.config';
import app from './app';
import { connectDatabase } from './config/db.config';
import { startJobsStatusCollectorCron } from './services/jobs-status-collector.cron';

// 🚀 Función para iniciar el servidor
async function startServer() {
  try {
    // 🔌 1️⃣ Conectamos a la base de datos
    await connectDatabase();

    // 🔴 CORRECCIÓN AQUÍ:
    // Priorizamos process.env.PORT (para Render), si no existe, usamos SERVER_PORT (para local)
    const PORT = process.env.PORT || SERVER_PORT;

    // 🚀 2️⃣ Iniciamos el servidor Express
    app.listen(PORT, () => {
      console.info(`✅ Server running on port ${PORT}`);
    });

    // 📊 3️⃣ Iniciamos el cron job
    startJobsStatusCollectorCron();
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

// En algunos entornos de nube, NODE_ENV es 'production', asegúrate de que esto se ejecute
// O simplemente llama a startServer() directamente si tu estructura lo permite.
// Si tu script de start es "node dist/server.js", esto está bien:
if (require.main === module || process.env.NODE_ENV !== 'test') {
    startServer();
}

export default app;