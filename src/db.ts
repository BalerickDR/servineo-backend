// src/db.ts
import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");

  const dbName = process.env.MONGODB_DB || process.env.DB_NAME || undefined;

  mongoose.set("strictQuery", true);

  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (dbName) {
    await mongoose.connect(uri, { dbName });
  } else {
    await mongoose.connect(uri);
  }

  console.log("✅ MongoDB conectado", {
    host: mongoose.connection.host,
    db: mongoose.connection.name, // ← nombre de BD realmente usada
  });

  return mongoose.connection;
}

export async function pingDB() {
  const conn = await connectDB();
  return conn.db.admin().ping(); // { ok: 1 }
}
