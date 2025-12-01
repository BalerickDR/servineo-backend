import { Router } from 'express';
import * as CreateAppointmentController from '../controllers/create_appointment.controller';

const router = Router();

// Rutas para Appointments (básicas)
// * Mantener endpoint Vale (revisar si existen fallas con el nuevo esquema de la db).
// * Existian incompatibilidades con el esquema modificado
// ? Asuntos modificados: Ya no se actualizan appointments existentes.
// ? Si ya existe un appointment con el mismo fixer, fecha y hora, se rechaza la creacion.
router.post('/appointments/create', CreateAppointmentController.createAppointment);

export default router;
