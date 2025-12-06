import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    status: String,
    requesterId: String,
    fixerId: String,
    price: Number,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    rating: Number,
    comment: String,
    type: String,
  },
  {
    collection: "jobspays",
  }
);

export const Job =
  mongoose.models.Job || mongoose.model("Job", jobSchema);
