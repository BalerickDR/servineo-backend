import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
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

// CORRECCIÓN: Cambiado 'mongoose.models.User' por 'mongoose.models.jobspays'
// Asegúrate de que el nombre coincida con el string del model ('jobspays')
export const Jobspay = mongoose.models.jobspays || mongoose.model('jobspays', jobSchema);