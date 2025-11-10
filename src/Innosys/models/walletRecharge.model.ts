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

  // Nuevos campos Stripe:
  paymentIntentId?: string;    // ID del PaymentIntent en Stripe
  paymentMethodId?: string;    // ID del método de pago usado (opcional)
  stripeChargeId?: string;     // ID del cargo Stripe (charge), opcional

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

    // Campos para datos Stripe
    paymentIntentId: { type: String, index: true },    // para buscar por este campo
    paymentMethodId: { type: String },
    stripeChargeId: { type: String },

  },
  { timestamps: true, versionKey: false },
);

// índices útiles para consultas
WalletRechargeSchema.index({ fixerId: 1, createdAt: -1 });
WalletRechargeSchema.index({ walletId: 1 });
WalletRechargeSchema.index({ status: 1 });
WalletRechargeSchema.index({ paymentIntentId: 1 }); // índice para buscar por paymentIntentId

export const WalletRecharge =
  mongoose.models.WalletRecharge ||
  mongoose.model<WalletRechargeDoc>('WalletRecharge', WalletRechargeSchema);

export default WalletRecharge;
