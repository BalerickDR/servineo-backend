// src/routes/dev-wallet.ts
import mongoose from 'mongoose';
import { Router } from 'express';
import { makeRawCollectionWalletAdapter } from '../modules/wallet/adapter';
import { applyCommissionToWallet, applyTopUpToWallet } from '../modules/wallet/applyCommission';

export const devWalletRouter = Router();
const collectionName = process.env.FIXERS_COLLECTION || 'users';

// A) Ver DB y colecciones
devWalletRouter.get('/dbinfo', async (_req, res) => {
  const name = mongoose.connection.name;
  const cols = await mongoose.connection.db.listCollections().toArray();
  res.json({ db: name, collections: cols.map(c => c.name), using: collectionName });
});

// B) Buscar FIXER por email (devuelve _id y wallet)
devWalletRouter.get('/wallet/find-by-email', async (req, res) => {
  const email = String(req.query.email || '').trim();
  if (!email) return res.status(400).json({ error: 'EMAIL_REQUIRED' });

  const doc = await mongoose.connection.db.collection(collectionName).findOne(
    { email },
    { projection: { _id: 1, role: 1, name: 1, wallet: 1 } }
  );
  if (!doc) return res.status(404).json({ error: 'FIXER_NOT_FOUND_IN_COLLECTION', col: collectionName, email });
  res.json({ id: doc._id, role: doc.role, name: doc.name, wallet: doc.wallet, col: collectionName });
});

// Inicializar wallet (solo dev)
devWalletRouter.post('/wallet/init', async (req, res) => {
  try {
    const { fixerId, balance = 0, currency = 'BOB', lowBalanceThreshold = 50 } = req.body ?? {};
    if (!fixerId) return res.status(400).json({ error: 'FIXER_ID_REQUIRED' });

    const _id = /^[0-9a-fA-F]{24}$/.test(String(fixerId))
      ? new mongoose.Types.ObjectId(String(fixerId))
      : String(fixerId);

    const now = new Date();
    const r = await mongoose.connection.db.collection(collectionName).updateOne(
      { _id },
      {
        $set: {
          wallet: {
            balance,
            currency,
            status: 'active',
            minimumBalance: 0,
            lowBalanceThreshold,
            lastLowBalanceNotification: null,
            flags: {
              needsLowAlert: false,
              needsCriticalAlert: false,
              updatedAt: null,
              cooldownUntil: null,
            },
            createdAt: now,
            updatedAt: now,
          },
        },
      }
    );

    if (!r.matchedCount) {
      return res.status(404).json({ error: 'FIXER_NOT_FOUND_IN_COLLECTION', collection: collectionName, fixerId });
    }
    res.json({ ok: true, modified: r.modifiedCount === 1 });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'SERVER_ERROR' });
  }
});

devWalletRouter.post('/wallet/apply-commission', async (req, res) => {
  try {
    const { fixerId, commission } = req.body ?? {};
    if (!fixerId || typeof commission !== 'number') {
      return res.status(400).json({ error: 'BAD_REQUEST', hint: 'fixerId & commission:number' });
    }
    const adapter = makeRawCollectionWalletAdapter(collectionName);
    const result = await applyCommissionToWallet(adapter, String(fixerId), commission);
    res.json({ ok: true, result });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'SERVER_ERROR' });
  }
});

devWalletRouter.post('/wallet/top-up', async (req, res) => {
  try {
    const { fixerId, amount } = req.body ?? {};
    if (!fixerId || typeof amount !== 'number') {
      return res.status(400).json({ error: 'BAD_REQUEST', hint: 'fixerId & amount:number' });
    }
    const adapter = makeRawCollectionWalletAdapter(collectionName);
    const result = await applyTopUpToWallet(adapter, String(fixerId), amount);
    res.json({ ok: true, result });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'SERVER_ERROR' });
  }
});

devWalletRouter.get('/wallet/:id', async (req, res) => {
  const adapter = makeRawCollectionWalletAdapter(collectionName);
  const w = await adapter.getWalletById(String(req.params.id));
  if (!w) return res.status(404).json({ error: 'FIXER_NOT_FOUND' });
  res.json(w);
});
