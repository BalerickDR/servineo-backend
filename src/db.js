// src/db.ts
import mongoose from "mongoose";

let hasLogged = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "servineo_fabian";
  if (!uri) throw new Error("Missing MONGODB_URI");

  mongoose.set("strictQuery", true);

  // Si ya está conectada, solo devolvemos la conexión (y logueamos una vez)
  if (mongoose.connection.readyState === 1) {
    if (!hasLogged) {
      console.log("✅ MongoDB ya conectado", {
        host: mongoose.connection.host,
        db: mongoose.connection.name,
      });
      hasLogged = true;
    }
    return mongoose.connection;
  }

  // Conectar AHORA
  await mongoose.connect(uri, { dbName });

  // Log correcto: ya hay datos en mongoose.connection
  if (!hasLogged) {
    console.log("✅ MongoDB conectado", {
      host: mongoose.connection.host, // ej: ac-xyz.mongodb.net
      db: mongoose.connection.name,   // ej: servineo_fabian
    });
    hasLogged = true;
  }

  return mongoose.connection;
}

export async function pingDB() {
  const conn = await connectDB();
  const pong = await conn.db.admin().ping(); // { ok: 1 }
  return pong;
}
