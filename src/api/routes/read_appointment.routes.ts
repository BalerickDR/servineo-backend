import { Router } from 'express';
import * as ReadAppointmentController from '../controllers/read_appointment.controller';

const router = Router();

// * Fixed Endpoint Arrick: Devolvia mucho 404.
// * Anteriores 2 endpoints unificados: se obtienen todas las citas de un dia
// ? Inclue a todas las citas de todos los requesters en el dia
router.get('/appointments/get_appointments_date', ReadAppointmentController.getAppointmentsByDate);

// Ruta para Modal Form
// * Fixed Endpoint Pichon
router.get('/appointments/get_modal_form', ReadAppointmentController.getModalFormAppointment);

// * Fixed Endpoint Mateo: Reemplazar Body por query y verificar que funcione correctamente.
router.get('/appointments/get_meeting_status', ReadAppointmentController.getMeetingStatus);

router.get(
  '/appointments/get_appointment_by_fixer_hour',
  ReadAppointmentController.getAppointmentByFixerIdHour,
);
router.get(
  '/appointments/get_all_appointments_by_fixer_date',
  ReadAppointmentController.getAppointmentsByFixerIdAndDate,
);

router.get('/appointments/get_fixer_availability', ReadAppointmentController.getFixerAvailability);

router.get(
  '/schedules/get_six_months_appointments',
  ReadAppointmentController.getSixMonthsAppointments,
);

router.get(
  '/schedules/get_number_of_appointments',
  ReadAppointmentController.getNumberOfAppointments,
);

export default router;
