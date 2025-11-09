import mongoose, { Schema, Document, model, models } from 'mongoose';

// Interfaz de TypeScript para tu documento de wallet
export interface IWallet extends Document {
  users_id: mongoose.Schema.Types.ObjectId; // ID del Fixer
  balance: number;
  currency: string;
  status: 'active' | 'inactive' | 'suspended';
  minimumBalance: number;
  lowBalanceThreshold: number;
  lastLowBalanceNotification?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Esquema de Mongoose
const walletSchema = new Schema<IWallet>(
  {
    users_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile', // O 'User', lo que estés usando como referencia
      required: true,
      unique: true, // Cada usuario solo debe tener una wallet
    },
    balance: {
      type: Number,
      required: true,
      default: 0, // Un nuevo wallet empieza con 0
    },
    currency: {
      type: String,
      required: true,
      default: 'BOB',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    minimumBalance: {
      type: Number,
      default: 0,
    },
    lowBalanceThreshold: {
      type: Number,
      default: 50,
    },
    lastLowBalanceNotification: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true, // Añade createdAt y updatedAt
  }
);

// Creación del Modelo
export const Wallet = models.Wallet || model<IWallet>('Wallet', walletSchema, 'wallets');

export default Wallet;