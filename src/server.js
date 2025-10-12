require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
const { connectDB, pingDB } = require("./db");

const app = express();

// Middlewares
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(cors({ origin: process.env.FRONTEND_ORIGIN, credentials: true }));
app.use(morgan("dev"));

// Health simple
app.get("/health", (req, res) => res.json({ ok: true }));

// Debug de DB: estado + ping
app.get("/debug/db", async (req, res) => {
  try {
    const stateMap = ["disconnected", "connected", "connecting", "disconnecting"];
    const readyState = mongoose.connection.readyState;
    const state = stateMap[readyState] || "unknown";
    const ping = await pingDB(); // { ok: 1 }

    res.json({
      readyState, // número
      state,      // texto
      ping        // debería ser { ok: 1 }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 4000;

// Arranque: conecta a DB y luego levanta el server
connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 API en http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error("❌ No se pudo conectar a MongoDB:", e.message);
    process.exit(1);
  });
