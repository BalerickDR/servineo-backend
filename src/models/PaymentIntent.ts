import { Schema, model, models, InferSchemaType } from "mongoose";

const PaymentIntentSchema = new Schema({
  bookingId: { type: String, index: true, required: true, unique: true },
  providerId: { type: String, index: true, required: true },
  amountExpected: { type: Number, required: true },
  currency: { type: String, default: "BOB" },
  paymentReference: { type: String, index: true, required: true }, // p.ej. SV-8F3K1
  status: {
    type: String,
    enum: ["pending", "under_review", "confirmed", "rejected", "expired"],
    default: "pending",
  },
  deadlineAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export type PaymentIntent = InferSchemaType<typeof PaymentIntentSchema>;
export default models.PaymentIntent || model("PaymentIntent", PaymentIntentSchema);
