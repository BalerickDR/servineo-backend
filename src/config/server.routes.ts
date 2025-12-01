import { Router } from 'express';
import LocationRoutes from '../api/routes/location.routes.js';
import CreateRoutes from '../api/routes/create_appointment.routes.js';
import ReadRoutes from '../api/routes/read_appointment.routes.js';
import UpdateRoutes from '../api/routes/update_appointment.routes.js';
import GetScheduleRoutes from '../api/routes/get_schedule.routes.js';
// import HealthRoutes from '../modules/health/health.routes';

const router = Router();

// router.use('/api', HealthRoutes);
router.use('/api/location', LocationRoutes);
router.use('/api/crud_create', CreateRoutes);
router.use('/api/crud_read', ReadRoutes);
router.use('/api/crud_update', UpdateRoutes);
router.use('/api/crud_read', GetScheduleRoutes);

// Manejo de rutas no encontradas
router.use((req, res) => {
  console.log('Not found:', req.method, req.originalUrl);
  res.status(404).send({
    message: 'route not found',
  });
});

export default router;
