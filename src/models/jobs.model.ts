import mongoose from 'mongoose';

export interface IJob extends mongoose.Document {
  title: string;
  description: string;
  status: string;
  requesterId: string;
  fixerId: string;
  price: number;
  createdAt: Date;
  rating?: number;
  comment?: string;
  type: string;
}

const JobSchema = new mongoose.Schema({
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
});

JobSchema.index({ requesterId: 1, createdAt: -1 });
JobSchema.index({ fixerId: 1, status: 1 });
JobSchema.index({ status: 1 });
JobSchema.index({ createdAt: -1 });

JobSchema.methods.toJSON = function () {
  const job = this.toObject();
  return job;
};

export const Job = mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);
export default Job;
