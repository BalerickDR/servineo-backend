import mongoose, { Schema, Document } from 'mongoose';

export interface IDevice extends Document {
  userId: string;
  os: string;
  type: string;
  userAgent: string;  
  lastLogin: Date;
}

const DeviceSchema = new Schema<IDevice>({
  userId: { type: String, required: true },
  os: { type: String, required: true },
  type: { type: String, required: true },

  userAgent: { type: String, required: true }, 

  lastLogin: { type: Date, default: Date.now },
});

export default mongoose.model<IDevice>('Device', DeviceSchema);
