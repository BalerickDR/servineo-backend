// src/routes/dev-wallet.ts
import mongoose from 'mongoose';
import { Router, Request, Response } from 'express'; // Importamos tipos (Mejora del General)
import { applyCommissionToWallet, applyTopUpToWallet } from '../../models/wallet/applyCommission';
import { walletAdapterReal } from '../../models/wallet/adapter.real';

export const devWalletRouter = Router();

// colección de USERS solo para buscar por email
const usersCollection = process.env.FIXERS_COLLECTION || 'users';

// A) Ver DB y colecciones
devWalletRouter.get('/dbinfo', async (_req: Request, res: Response) => {
  // 🛡️ PROTECCIÓN: Validamos que la DB exista antes de usarla
  if (!mongoose.connection.db) {
    return res.status(500).json({ error: 'DATABASE_NOT_CONNECTED' });
  }

  const name = mongoose.connection.name;
  const cols = await mongoose.connection.db.listCollections().toArray();

  res.json({
    db: name,
    collections: cols.map((c) => c.name),
    walletMode: process.env.WALLET_STORAGE_MODE,
    walletsCollection: process.env.WALLETS_COLLECTION,
    usersCollection,
  });
});

// B) Buscar FIXER por email (devuelve _id del user)
devWalletRouter.get('/wallet/find-by-email', async (req: Request, res: Response) => {
  // 🛡️ PROTECCIÓN
  if (!mongoose.connection.db) {
    return res.status(500).json({ error: 'DATABASE_NOT_CONNECTED' });
  }

  const email = String(req.query.email || '').trim();
  if (!email) return res.status(400).json({ error: 'EMAIL_REQUIRED' });

  // Usamos la conexión nativa para una búsqueda rápida sin Mongoose Model overhead
  const doc = await mongoose.connection.db
    .collection(usersCollection)
    .findOne({ email }, { projection: { _id: 1, role: 1, name: 1 } });

  if (!doc)
    return res
      .status(404)
      .json({ error: 'FIXER_NOT_FOUND_IN_COLLECTION', col: usersCollection, email });

  res.json({ id: doc._id, role: doc.role, name: doc.name, col: usersCollection });
});

// Inicializar/Upsert de wallet en colección separada (solo dev)
devWalletRouter.post('/wallet/init', async (req: Request, res: Response) => {
  try {
    const { fixerId, balance = 0, lowBalanceThreshold = 50 } = req.body ?? {};
    if (!fixerId) return res.status(400).json({ error: 'FIXER_ID_REQUIRED' });

    await walletAdapterReal.updateWalletById(String(fixerId), {
      balance,
      lowBalanceThreshold,
      flags: {
        needsLowAlert: false,
        needsCriticalAlert: false,
        updatedAt: null,
        cooldownUntil: null,
      },
      lastLowBalanceNotification: null,
    });

    res.json({ ok: true, upserted: true });
  } catch (e: unknown) {
    // ✅ Manejo de errores seguro (del General)
    res.status(500).json({ error: e instanceof Error ? e.message : 'SERVER_ERROR' });
  }
});

// Comisión (usa adapter REAL -> colección wallet)
devWalletRouter.post('/wallet/apply-commission', async (req: Request, res: Response) => {
  try {
    const { fixerId, commission } = req.body ?? {};
    if (!fixerId || typeof commission !== 'number') {
      return res.status(400).json({ error: 'BAD_REQUEST', hint: 'fixerId & commission:number' });
    }
    const result = await applyCommissionToWallet(walletAdapterReal, String(fixerId), commission);
    res.json({ ok: true, result });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'SERVER_ERROR' });
  }
});

// Recarga (usa adapter REAL -> colección wallet)
devWalletRouter.post('/wallet/top-up', async (req: Request, res: Response) => {
  try {
    const { fixerId, amount } = req.body ?? {};
    if (!fixerId || typeof amount !== 'number') {
      return res.status(400).json({ error: 'BAD_REQUEST', hint: 'fixerId & amount:number' });
    }
    const result = await applyTopUpToWallet(walletAdapterReal, String(fixerId), amount);
    res.json({ ok: true, result });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'SERVER_ERROR' });
  }
});

// Ver wallet (lee desde colección wallet)
devWalletRouter.get('/wallet/:id', async (req: Request, res: Response) => {
  try {
    const w = await walletAdapterReal.getWalletById(String(req.params.id));
    if (!w) return res.status(404).json({ error: 'FIXER_NOT_FOUND' });
    res.json(w);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'SERVER_ERROR' });
  }
});

export default devWalletRouter;