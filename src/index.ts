import "dotenv/config";            // carga .env al inicio
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import { connectDB, pingDB } from "./db"; 
// IMPORTA el router
import paymentsRouter from "./routes/payments";
import debugRouter from "./routes/debug";   // ⬅️ importa el router


const app = express();

// Middlewares básicos
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000" }));
app.use(morgan("dev"));

// MONTA el router en /api/payments
app.use("/api/payments", paymentsRouter);
app.use("/debug", debugRouter); //monta el router de debug en /debug


// Rutas de prueba
app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/debug/db", async (_req, res) => {
  try {
    const stateMap = ["disconnected", "connected", "connecting", "disconnecting"];
    const readyState = mongoose.connection.readyState;
    const state = stateMap[readyState] || "unknown";
    const ping = await pingDB();
    res.json({ readyState, state, ping });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = Number(process.env.SERVER_PORT || process.env.PORT || 4000);

// Arranque: conectar DB y escuchar
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 API en http://localhost:${PORT}`);
      console.log(`🌍 FRONTEND_ORIGIN: ${process.env.FRONTEND_ORIGIN || "http://localhost:3000"}`);
    });
  })
  .catch((e) => {
    console.error("❌ No se pudo conectar a MongoDB:", e.message);
    process.exit(1);
  });
