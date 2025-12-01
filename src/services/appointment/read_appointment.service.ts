import * as dotenv from 'dotenv';
import { connectDatabase } from '../../config/db.config';
import Appointment from '../../models/Appointment';
import mongoose from 'mongoose';

dotenv.config();

// *: Fixed Endpoint Mateo: Reemplazar Body por query y verificar que funcione correctamente.
export async function get_meeting_status(
  requester_id: string,
  fixer_id: string,
  current_date: string,
  start_hour: string,
) {
  try {
    await connectDatabase();
    const adjusted_date = new Date(current_date);
    const current_year = adjusted_date.getUTCFullYear();
    const current_month = adjusted_date.getUTCMonth();
    const current_day = adjusted_date.getUTCDate();
    const start_hour_num = parseInt(start_hour, 10);
    const starting_date = new Date(
      Date.UTC(current_year, current_month, current_day, start_hour_num, 0, 0),
    );
    const finish_date = new Date(
      Date.UTC(current_year, current_month, current_day, start_hour_num + 1, 0, 0),
    );

    const appointment = await Appointment.findOne({
      id_requester: requester_id,
      id_fixer: fixer_id,
      starting_time: {
        $gte: starting_date,
        $lt: finish_date,
      },
    });
    if (!appointment) {
      return { name: '', status: 'available' };
    } else {
      return { name: appointment.current_requester_name, status: appointment.schedule_state };
    }
  } catch (err) {
    throw new Error((err as Error).message);
  }
}

// * Fixed Endpoint Arrick: Devolvia mucho 404.
// * Anteriores 2 endpoints unificados: se obtienen todas las citas de un dia
// ? Incluye a todas las citas de todos los requesters en el dia
export async function get_appointments_by_fixer_day(fixer_id: string, requested_date: string) {
  try {
    await connectDatabase();
    const founded_appointments = await Appointment.find({
      id_fixer: fixer_id,
      selected_date: requested_date,
    });
    if (!founded_appointments) {
      throw new Error('Not appointments founded');
    }
    return { appointments: founded_appointments };
  } catch (err) {
    throw new Error((err as Error).message);
  }
}

// * Fixear Endpoint Pichon: -
export async function get_modal_form_appointment(
  fixer_id: string,
  requester_id: string,
  appointment_date: string,
  start_hour: string,
) {
  try {
    await connectDatabase();

    const current_date = new Date(appointment_date);
    const current_year = current_date.getUTCFullYear();
    const current_month = current_date.getUTCMonth();
    const current_day = current_date.getUTCDate();

    const start_hour_int = parseInt(start_hour);
    const exact_start_date = new Date(
      Date.UTC(current_year, current_month, current_day, start_hour_int, 0, 0),
    );
    const appointment = await Appointment.findOne({
      id_fixer: fixer_id,
      id_requester: requester_id,
      starting_time: exact_start_date,
    });

    if (!appointment) {
      throw new Error('Appointment does not exist.');
    }

    return {
      _id: appointment._id,
      id_fixer: appointment.id_fixer,
      id_requester: appointment.id_requester,
      current_requester_name: appointment.current_requester_name,
      appointment_type: appointment.appointment_type,
      appointment_description: appointment.appointment_description,
      link_id: appointment.link_id,
      current_requester_phone: appointment.current_requester_phone,
      display_name_location: appointment.display_name_location,
      latitude: appointment.lat,
      longitude: appointment.lon,
    };
  } catch (err) {
    throw new Error((err as Error).message);
  }
}

export async function get_appointment_by_fixer_id_hour(
  fixer_id: string,
  date: string,
  hour: string,
) {
  try {
    await connectDatabase();
    const hourInt = parseInt(hour);
    const hourStr = hourInt < 10 ? '0' + hourInt : '' + hourInt;
    const appointmentDate = new Date(`${date}T${hourStr}:00:00.000Z`);
    const appointment = await Appointment.find({
      id_fixer: fixer_id,
      starting_time: appointmentDate,
    });
    return appointment;
  } catch (error) {
    throw new Error((error as Error).message);
  }
}

export async function get_fixer_availability(fixer_id: string) {
  const db = mongoose.connection.db!;
  const fixer = await db
    .collection('users')
    .findOne(
      { _id: new mongoose.Types.ObjectId(fixer_id) },
      { projection: { availability: 1, _id: 0 } },
    );
  if (!fixer) {
    throw new Error('Fixer not found.');
  }
  let availability;
  // la vdd no se cual funciona bien asi que puse ambosxd
  if (!('availability' in fixer) || !fixer.availability) {
    availability = {
      lunes: [8, 9, 10, 11, 14, 15, 16, 17],
      martes: [8, 9, 10, 11, 14, 15, 16, 17],
      miercoles: [8, 9, 10, 11, 14, 15, 16, 17],
      jueves: [8, 9, 10, 11, 14, 15, 16, 17],
      viernes: [8, 9, 10, 11, 14, 15, 16, 17],
      sabado: [],
      domingo: [],
    };
  } else {
    availability = fixer.availability;
  }
  return availability;
}

export async function get_appointments_by_fixer_id_date(fixer_id: string, date: string) {
  try {
    const [year, month] = date.split('-').map(Number);
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const endOfMonth = new Date(Date.UTC(year, month, 1));
    const appointments = await Appointment.find({
      id_fixer: fixer_id,
      selected_date: {
        $gte: startOfMonth,
        $lt: endOfMonth,
      },
      cancelled_fixer: false,
    }).sort({ selected_date: 1, starting_time: 1 });
    return appointments;
  } catch (error) {
    throw new Error((error as Error).message);
  }
}

export async function get_six_months_appointments(fixer_id: string, date: string) {
  try {
    await connectDatabase();
    const actualDate = new Date(date);
    const month = actualDate.getMonth();
    const year = actualDate.getFullYear();
    const lastDay = new Date(year, month + 6, 0).getDate();

    const lastMonth = month + 6;
    const finish_date = new Date(Date.UTC(year, lastMonth, lastDay, 23, 59, 59, 999));

    console.log(finish_date);
    const appointments = await Appointment.find({
      id_fixer: fixer_id,
      selected_date: {
        $gte: actualDate,
        $lte: finish_date,
      },
    });

    return appointments;
  } catch (err) {
    throw new Error((err as Error).message);
  }
}

export async function get_number_of_appointments(fixer_id: string, month: string, year: string) {
  try {
    const year_int = parseInt(year);
    const month_int = parseInt(month);
    const startDate = new Date(year_int, month_int - 1, 1);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 7);
    endDate.setDate(endDate.getDate() - 1);
    console.log(startDate, endDate);

    console.log('Rango:', startDate, 'a', endDate);

    const result = await Appointment.aggregate([
      {
        $match: {
          id_fixer: fixer_id,
          selected_date: {
            $gte: startDate,
            $lte: endDate,
          },
          cancelled_fixer: false,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$selected_date' },
            month: { $month: '$selected_date' },
            day: { $dayOfMonth: '$selected_date' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
          '_id.day': 1,
        },
      },
    ]);
    const appointmentsByMonth: Record<string, Record<number, number>> = {};

    result.forEach((item) => {
      const yearMonth = `${item._id.month.toString().padStart(2, '0')}-${item._id.year}`;

      if (!appointmentsByMonth[yearMonth]) {
        appointmentsByMonth[yearMonth] = {};
      }

      appointmentsByMonth[yearMonth][item._id.day] = item.count;
    });

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate();
      const yearMonth = `${month.toString().padStart(2, '0')}-${year}`;

      if (!appointmentsByMonth[yearMonth]) {
        appointmentsByMonth[yearMonth] = {};
      }

      if (!appointmentsByMonth[yearMonth][day]) {
        appointmentsByMonth[yearMonth][day] = 0;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return appointmentsByMonth;
  } catch (error) {
    throw new Error((error as Error).message);
  }
}
