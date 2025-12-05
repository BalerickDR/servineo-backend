//src/server.ts
import { SERVER_PORT } from './config/env.config';
import app from './app';
import { connectDatabase } from './config/db.config';
import { connectDB } from './config/db/mongoClient';
import { startJobsStatusCollectorCron } from './services/jobs-status-collector.cron';
import http from 'http';

// 🚀 Función para iniciar el servidor
async function startServer() {
  try {
    await connectDatabase();
    await connectDB();

    const server = http.createServer(
      {
        maxHeaderSize: 131072,
      },
      app,
    );
    server.on('clientError', (err: NodeJS.ErrnoException, socket) => {
      if ((err as any).code === 'HPE_HEADER_OVERFLOW' || err.message?.includes('431')) {
        console.error('❌ Error: Headers demasiado grandes (431)');
        socket.end('HTTP/1.1 431 Request Header Fields Too Large\r\n\r\n');
      } else {
        console.error('❌ Client error:', err);
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      }
    });
    server.listen(SERVER_PORT, () => {
      const url = `http://localhost:${SERVER_PORT}`;
      console.info(`✅ Server running on ${url}`);
    });

    startJobsStatusCollectorCron();
    
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
