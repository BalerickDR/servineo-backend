import { Router } from 'express';
import * as UpdateAppointmentController from '../controllers/update_appointment.controller';

const router = Router();

// * Fixed Endpoint Pichon: Refactorizar y probar en Postman.
// * El endpoint estaba actualizando mas slots de los que deberia, ahora con el nuevo esquema actualiza lo solicitado.
router.put('/appointments/update_by_id', UpdateAppointmentController.updateAppointmentById);

router.put(
  '/appointments/update_fixer_availability',
  UpdateAppointmentController.updateFixerAvailability,
);

router.put(
  '/appointments/update_cancell_appointment_fixer',
  UpdateAppointmentController.fixerCancellAppointment,
);

export default router;
