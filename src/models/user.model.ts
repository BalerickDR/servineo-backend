import { Schema, model, models, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  url_photo?: string;
  description?: string;
  role: string;

  authProviders?: Array<{
    provider: string;
    providerId: string;
    password?: string;
  }>;

  telefono?: string;

  ubicacion?: {
    lat?: number;
    lng?: number;
    direccion?: string;
    departamento?: string;
    pais?: string;
  };

  ci?: string;
  servicios?: string[];

  vehiculo?: {
    hasVehiculo?: boolean;
    tipoVehiculo?: string;
  };

  fixerProfile?: string;
  acceptTerms?: boolean;

  metodoPago?: {
    hasEfectivo?: boolean;
    qr?: boolean;
    tarjetaCredito?: boolean;
  };

  experience?: {
    descripcion?: string;
  };

  workLocation?: {
    lat?: number;
    lng?: number;
    direccion?: string;
    departamento?: string;
    pais?: string;
  };

  stripeCustomerId?: string;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    url_photo: { type: String },

    role: {
      type: String,
      enum: ["requester", "fixer", "visitor", "admin"],
      default: "requester",
    },

    authProviders: [
      {
        provider: { type: String, required: true },
        providerId: { type: String, required: true },
        password: { type: String },
      },
    ],

    telefono: { type: String },

    ubicacion: {
      lat: Number,
      lng: Number,
      direccion: String,
      departamento: String,
      pais: String,
    },

    ci: String,
    description: String,

    servicios: [String],

    vehiculo: {
      hasVehiculo: Boolean,
      tipoVehiculo: String,
    },

    acceptTerms: { type: Boolean, default: false },

    fixerProfile: String,

    metodoPago: {
      hasEfectivo: { type: Boolean, default: false },
      qr: { type: Boolean, default: false },
      tarjetaCredito: { type: Boolean, default: false },
    },

    experience: {
      descripcion: String,
    },

    workLocation: {
      lat: Number,
      lng: Number,
      direccion: String,
      departamento: String,
      pais: String,
    },

    stripeCustomerId: String,
  },
  {
    collection: "users",
    timestamps: true,
  }
);

export const User = models.User || model<IUser>("User", userSchema);
