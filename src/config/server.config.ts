import express from 'express';
import cors from 'cors';
import AppRoutes from './server.routes.js';
import serviciosRoutes from '../routes/servicios.routes';

const app = express();
const allowedOrigin = 'https://servineo-frontend-lorem.vercel.app';

app.use(cors());
app.use(express.json());
app.use(AppRoutes);

app.use('/api/newoffers', serviciosRoutes);

export default app;
