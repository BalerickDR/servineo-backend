import dotenv from 'dotenv';
dotenv.config();

import Server from './config/server.config';
import { connectDB } from './Innosys/config/database.config';
import { SERVER_PORT } from './config/env.config';

// NO llames a connectDB() aquí

async function startServer() {
  try {
    // 1. Conectar a la base de datos PRIMERO (con await)
    console.log('🔗 Connecting to MongoDB...');
    await connectDB(); // Esta es la única llamada necesaria

    // 2. Solo si la BD conecta, inicia el servidor
    Server.listen(SERVER_PORT, () => {
      console.info(`Server running on http://localhost:${SERVER_PORT}`);
    });
  } catch (error) {
    console.error('Error starting server', error);
  }
}

// Llama a la función principal para iniciar todo
startServer();