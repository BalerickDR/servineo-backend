// scripts/db-check.ts
import "dotenv/config";
import mongoose from "mongoose";

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "servineo_fabian";

  if (!uri) {
    console.error("❌ Falta MONGODB_URI en tu .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { dbName });
    const pong = await mongoose.connection.db.admin().ping(); // { ok: 1 }
    console.log(`✅ Ping OK a BD "${dbName}":`, pong);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Error de conexión:", err.message);
    process.exit(1);
  }
}

main();
