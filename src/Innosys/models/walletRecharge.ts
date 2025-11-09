import mongoose, { Schema, Types } from 'mongoose';

export type RechargeMethod = 'card' | 'QR' | 'transfer';
export type RechargeStatus = 'pending' | 'confirmed' | 'failed';

export interface WalletRechargeDoc extends mongoose.Document {
  fixerId: Types.ObjectId; // usuario que hace la recarga
  walletId: Types.ObjectId; // billetera asociada
  method: RechargeMethod;
  status: RechargeStatus;
  amount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const WalletRechargeSchema = new Schema<WalletRechargeDoc>(
  {
    fixerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true, index: true },

    method: { type: String, enum: ['card', 'QR', 'transfer'], required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'BOB' },
  },
  { timestamps: true, versionKey: false },
);

// índices útiles para consultas
WalletRechargeSchema.index({ fixerId: 1, createdAt: -1 });
WalletRechargeSchema.index({ walletId: 1 });
WalletRechargeSchema.index({ status: 1 });

export const WalletRecharge =
  mongoose.models.WalletRecharge ||
  mongoose.model<WalletRechargeDoc>('WalletRecharge', WalletRechargeSchema);

export default WalletRecharge;
