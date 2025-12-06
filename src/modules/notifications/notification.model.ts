import mongoose, { Schema, Document, Model } from 'mongoose';

// Interfaz para el documento de Notificación
export interface INotification extends Document {
  appointment_id?: mongoose.Types.ObjectId;
  users_id?: mongoose.Types.ObjectId;
  recipient_phone: string;
  notification_type: 'whatsapp' | 'email';
  message_content: string;
  send_status: 'SUCCESS' | 'FAILED' | 'PENDING';
  error_details?: string | null;
  leido: boolean;
  // Campos de otros tipos de notificaciones que tienes
  tipo?: string;
  estado?: string;
}

// Esquema de Mongoose
const NotificationSchema = new Schema<INotification>(
  {
    appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    users_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recipient_phone: { type: String },
    notification_type: { type: String, enum: ['whatsapp', 'email'] },
    message_content: { type: String },
    send_status: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING'] },
    error_details: { type: String, default: null },
    leido: { type: Boolean, default: false, required: true },
    // Mantenemos estos campos flexibles por la data existente
    tipo: { type: String },
    estado: { type: String },
  },
  {
    timestamps: true, // Dejamos que Mongoose maneje createdAt y updatedAt
    strict: false,
  }
);

// Modelo de Mongoose
const Notification: Model<INotification> = mongoose.model<INotification>(
  'Notification',
  NotificationSchema
);

export default Notification;
