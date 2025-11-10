// src/Innosys/models/invoice.model.ts

import mongoose, { Document, Schema, Model, ObjectId } from 'mongoose';

// 1. Interfaz IInvoice (SIN _id para evitar el conflicto con Mongoose.Document)
export interface IInvoice {
    requesterId: ObjectId;
    userId: ObjectId; 
    jobId: ObjectId;
    status: string;
    amount: number;
    commissionAmount: number;
    currency: string;
    type: string;
    paymentDate?: Date; 
}

// 2. Interfaz del Documento de Mongoose (usa el tipo genérico)
export interface IInvoiceDocument extends IInvoice, Document<IInvoice> {}

// 3. Esquema (Schema) de Mongoose
const InvoiceSchema: Schema = new Schema(
    {
        requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
        status: { type: String, required: true, default: 'pending' },
        amount: { type: Number, required: true },
        commissionAmount: { type: Number, required: true },
        currency: { type: String, required: true },
        type: { type: String, required: true },
        paymentDate: { type: Date, required: false },
    },
    {
        timestamps: true,
        collection: 'payments', 
    }
);

// 4. Modelo
const Invoice: Model<IInvoiceDocument> = mongoose.model<IInvoiceDocument>('Invoice', InvoiceSchema);

export default Invoice;