import * as dotenv from 'dotenv';
import { connectDatabase } from '../../config/db.config';
import Appointment from '../../models/Appointment';

dotenv.config();

// TODO: CHAMO LOCURAS (Todos los occupied de un fixer_id, que NO vayan con el requester_id)
export async function get_all_requester_schedules_by_fixer_month(
  fixer_id: string,
  requester_id: string,
  month: string,
) {
  await connectDatabase();
  const current_date = new Date();
  const current_year = current_date.getUTCFullYear();
  const target_month = parseInt(month) - 1; // Mongoose usa 0-indexed months
  const start_date = new Date(Date.UTC(current_year, target_month, 1, 0, 0, 0));
  const finish_date = new Date(Date.UTC(current_year, target_month + 1, 0, 23, 59, 59, 999));
  return Appointment.find(
    {
      id_fixer: fixer_id,
      id_requester: { $ne: requester_id },
      selected_date: {
        $gte: start_date,
        $lte: finish_date,
      },
      cancelled_fixer: { $ne: true },
    },
    {
      starting_time: 1,
      finishing_time: 1,
      schedule_state: 1,
      appointment_description: 1,
      display_name_location: 1,
      lat: 1,
      lon: 1,
      _id: 1,
    },
  );
}

// *: Fixed endpoint Chamo
export async function get_requester_schedules_by_fixer_month(
  fixer_id: string,
  requester_id: string,
  month: string,
) {
  await connectDatabase();
  const current_date = new Date();
  const current_year = current_date.getUTCFullYear();
  const target_month = parseInt(month) - 1; // Mongoose usa 0-indexed months
  const start_date = new Date(Date.UTC(current_year, target_month, 1, 0, 0, 0));
  const finish_date = new Date(Date.UTC(current_year, target_month + 1, 0, 23, 59, 59, 999));
  return Appointment.find(
    {
      id_fixer: fixer_id,
      id_requester: requester_id,
      selected_date: {
        $gte: start_date,
        $lte: finish_date,
      },
      cancelled_fixer: { $ne: true },
    },
    {
      starting_time: 1,
      finishing_time: 1,
      schedule_state: 1,
      appointment_description: 1,
      display_name_location: 1,
      lat: 1,
      lon: 1,
      _id: 1,
    },
  );
}

// * Endpoints de rati ratone que no dice nada de lo que necesita...
export async function get_requester_schedules_by_fixer_day(
  fixer_id: string,
  requester_id: string,
  searched_date: string,
) {
  await connectDatabase();
  const current_date = new Date(searched_date);
  const current_year = current_date.getUTCFullYear();
  const current_month = current_date.getUTCMonth();
  const current_day = current_date.getUTCDate();
  const start_date = new Date(Date.UTC(current_year, current_month, current_day, 0, 0, 0));
  const finish_date = new Date(Date.UTC(current_year, current_month, current_day, 23, 59, 59, 999));
  const daily_appointments = await Appointment.find(
    {
      id_fixer: fixer_id,
      id_requester: requester_id,
      selected_date: {
        $gte: start_date,
        $lte: finish_date,
      },
      cancelled_fixer: { $ne: true },
    },
    {
      starting_time: 1,
      finishing_time: 1,
      schedule_state: 1,
    },
    { new: true },
  );

  const formated_appointments = [];
  for (const appointment of daily_appointments) {
    if (!appointment.starting_time || !appointment.finishing_time) continue;
    const start_hour = appointment.starting_time.getUTCHours();
    const finish_hour = appointment.finishing_time.getUTCHours();
    formated_appointments.push({
      starting_hour: start_hour,
      finishing_hour: finish_hour,
      schedule_state: 'booked',
    });
  }
  return formated_appointments;
}

// * Endpoints de rati ratone que no dice nada de lo que necesita...
export async function get_other_requester_schedules_by_fixer_day(
  fixer_id: string,
  requester_id: string,
  searched_date: string,
) {
  await connectDatabase();
  const current_date = new Date(searched_date);
  const current_year = current_date.getUTCFullYear();
  const current_month = current_date.getUTCMonth();
  const current_day = current_date.getUTCDate();
  const start_date = new Date(Date.UTC(current_year, current_month, current_day, 0, 0, 0));
  const finish_date = new Date(Date.UTC(current_year, current_month, current_day, 23, 59, 59, 999));
  const daily_appointments = await Appointment.find(
    {
      id_fixer: fixer_id,
      id_requester: { $ne: requester_id },
      selected_date: {
        $gte: start_date,
        $lte: finish_date,
      },
      cancelled_fixer: { $ne: true },
    },
    {
      starting_time: 1,
      finishing_time: 1,
      schedule_state: 1,
    },
    { new: true },
  );

  const formated_appointments = [];
  for (const appointment of daily_appointments) {
    if (!appointment.starting_time || !appointment.finishing_time) continue;
    const start_hour = appointment.starting_time.getUTCHours();
    const finish_hour = appointment.finishing_time.getUTCHours();
    const current_appointment_state = appointment.schedule_state;
    formated_appointments.push({
      starting_hour: start_hour,
      finishing_hour: finish_hour,
      schedule_state: current_appointment_state,
    });
  }
  return formated_appointments;
}

// TODO: Endpoint que devuelve las citas canceladas por el propio requester que ve el calendario de un determinadon fixer en una fecha determinada.
export async function get_cancelled_schedules_by_requester_day(
  fixer_id: string,
  requester_id: string,
  searched_date: string,
) {
  try {
    await connectDatabase();
    const current_date = new Date(searched_date);
    const current_year = current_date.getUTCFullYear();
    const current_month = current_date.getUTCMonth();
    const current_day = current_date.getUTCDate();
    const starting_date = new Date(Date.UTC(current_year, current_month, current_day, 0, 0, 0));
    const finish_date = new Date(
      Date.UTC(current_year, current_month, current_day, 23, 59, 59, 999),
    );
    const cancelled_appointments_requester = await Appointment.find(
      {
        id_fixer: fixer_id,
        id_requester: requester_id,
        selected_date: {
          $gte: starting_date,
          $lte: finish_date,
        },
        schedule_state: 'cancelled',
        cancelled_fixer: false,
      },
      {
        starting_time: 1,
        finishing_time: 1,
        schedule_state: 1,
      },
      { new: true },
    );

    const formated_appointments = [];
    for (const cancelled_appointment of cancelled_appointments_requester) {
      if (!cancelled_appointment.starting_time || !cancelled_appointment.finishing_time) continue;
      const start_hour = cancelled_appointment.starting_time.getUTCHours();
      const finish_hour = cancelled_appointment.finishing_time.getUTCHours();
      const current_appointment_state = cancelled_appointment.schedule_state;
      formated_appointments.push({
        starting_hour: start_hour,
        finishing_hour: finish_hour,
        schedule_state: current_appointment_state,
      });
    }
    return formated_appointments;
  } catch (err) {
    throw new Error((err as Error).message);
  }
}

// TODO: Endpoint que devuelve las citas canceladas por el fixer respecto a un determinado requester en una determinada fecha.
export async function get_cancelled_schedules_by_fixer_day(
  fixer_id: string,
  requester_id: string,
  searched_date: string,
) {
  try {
    await connectDatabase();
    const current_date = new Date(searched_date);
    const current_year = current_date.getUTCFullYear();
    const current_month = current_date.getUTCMonth();
    const current_day = current_date.getUTCDate();
    const start_date = new Date(Date.UTC(current_year, current_month, current_day, 0, 0, 0));
    const finish_date = new Date(
      Date.UTC(current_year, current_month, current_day, 23, 59, 59, 999),
    );
    const cancelled_appointments_fixer = await Appointment.find(
      {
        id_fixer: fixer_id,
        id_requester: requester_id,
        selected_date: {
          $gte: start_date,
          $lte: finish_date,
        },
        cancelled_fixer: true,
        schedule_state: {
          $ne: 'cancelled',
        },
      },
      {
        starting_time: 1,
        finishing_time: 1,
        cancelled_fixer: 1,
        schedule_state: 1,
      },
      { new: true },
    );

    const formated_appointments = [];
    for (const cancelled_appointment of cancelled_appointments_fixer) {
      if (!cancelled_appointment.starting_time || !cancelled_appointment.finishing_time) continue;
      const start_hour = cancelled_appointment.starting_time.getUTCHours();
      const finish_hour = cancelled_appointment.finishing_time.getUTCHours();
      const wasCanceelledByFixer = cancelled_appointment.cancelled_fixer;
      const current_appointment_state = cancelled_appointment.schedule_state;
      formated_appointments.push({
        starting_hour: start_hour,
        finishing_hour: finish_hour,
        schedule_state: current_appointment_state,
        cancelled_fixer: wasCanceelledByFixer,
      });
    }
    return formated_appointments;
  } catch (err) {
    throw new Error((err as Error).message);
  }
}
