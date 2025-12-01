import { Router } from 'express';
import * as GetScheduleController from '../controllers/get_schedule.controller';

const router = Router();

// Rutas para Schedules - Por mes
// * Fixed endpoint Chamo
router.get(
  '/schedules/get_by_fixer_current_requester_month',
  GetScheduleController.getRequesterSchedulesByFixerMonth,
);
// * Fixed ndpoint Chamo (consultar)
router.get(
  '/schedules/get_by_fixer_other_requesters_month',
  GetScheduleController.getAllRequesterSchedulesByFixerMonth,
);

// * Endpoints de rati ratone que no dice nada de lo que necesita...
router.get(
  '/schedules/get_by_fixer_current_requester_day',
  GetScheduleController.getRequesterSchedulesByFixerDay,
);
// * Endpoints de rati ratone que no dice nada de lo que necesita...
router.get(
  '/schedules/get_by_fixer_other_requesters_day',
  GetScheduleController.getOtherRequesterSchedulesByFixerDay,
);

// TODO: Endpoint que devuelve las citas canceladas por el propio requester que ve el calendario de un determinadon fixer en una fecha determinada.
router.get(
  '/schedules/get_cancelled_appointments_by_requester_date',
  GetScheduleController.getCancelledSchedulesByRequesterDay,
);
// TODO: Endpoint que devuelve las citas canceladas por el fixer respecto a un determinado requester en una determinada fecha.
router.get(
  '/schedules/get_cancelled_appointments_by_fixer_date',
  GetScheduleController.getCancelledSchedulesByFixerDay,
);

export default router;
