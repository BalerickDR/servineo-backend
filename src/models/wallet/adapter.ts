import mongoose from 'mongoose';

// Interfaz para el adaptador de wallet
export interface WalletModelAdapter {
  getWalletById(fixerId: string): Promise<WalletSlice | null>;
  updateWalletById(fixerId: string, patch: Partial<WalletSlice>): Promise<void>;
}

export interface WalletSlice {
  balance: number;
  lowBalanceThreshold: number;
  flags: any;
  lastLowBalanceNotification: Date | null;
}

// helper: si son 24 hex, usa ObjectId; si no, deja string
function normalizeId(raw: string): mongoose.Types.ObjectId | string {
  const s = String(raw).trim();
  return /^[0-9a-fA-F]{24}$/.test(s) ? new mongoose.Types.ObjectId(s) : s;
}

// Verificar que la conexión esté establecida
function getDb() {
  if (!mongoose.connection.db) {
    throw new Error('Database connection not established');
  }
  return mongoose.connection.db;
}

export function makeRawCollectionWalletAdapter(collectionName: string): WalletModelAdapter {
  return {
    async getWalletById(fixerId: string): Promise<WalletSlice | null> {
      const _id = normalizeId(fixerId);
      if (!mongoose.connection.db) throw new Error('Database not connected');
      const doc = await mongoose.connection.db.collection(collectionName).findOne({ _id } as any, {
        projection: {
          'wallet.balance': 1,
          'wallet.lowBalanceThreshold': 1,
          'wallet.flags': 1,
          'wallet.lastLowBalanceNotification': 1,
        },
      });

      if (!doc?.wallet) return null;
      return {
        balance: Number(doc.wallet.balance ?? 0),
        lowBalanceThreshold: Number(doc.wallet.lowBalanceThreshold ?? 0),
        flags: doc.wallet.flags ?? null,
        lastLowBalanceNotification: doc.wallet.lastLowBalanceNotification ?? null,
      };
    },

    async updateWalletById(fixerId: string, patch: Partial<WalletSlice>): Promise<void> {
      const _id = normalizeId(fixerId);

      const $set: any = { 'wallet.updatedAt': new Date() };
      if (patch.balance !== undefined) $set['wallet.balance'] = patch.balance;
      if (patch.lowBalanceThreshold !== undefined)
        $set['wallet.lowBalanceThreshold'] = patch.lowBalanceThreshold;
      if (patch.flags !== undefined) $set['wallet.flags'] = patch.flags;
      if (patch.lastLowBalanceNotification !== undefined)
        $set['wallet.lastLowBalanceNotification'] = patch.lastLowBalanceNotification;

      if (!mongoose.connection.db) throw new Error('Database not connected');
      await mongoose.connection.db.collection(collectionName).updateOne({ _id } as any, { $set });
    },
  };
}
