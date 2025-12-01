import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase } from '../../config/db.config';
import Appointment from '../../models/Appointment';

import { updateMeetingInvite, deleteMeetingEvent } from '../../utils/googleCalendarHelper';

dotenv.config();

interface IAppointment {
  _id: string;
  googleEventId?: string;
  schedule_state?: 'cancelled' | 'booked';
  current_requester_name: string;
  current_requester_phone: string;
  appointment_description: string;
  starting_time: Date;
  finishing_time?: Date;
  mail: string[];
  appointment_type: 'virtual' | 'presential';
  link_id?: string;
  display_name_location?: string;
  lat?: string;
  lon?: string;
  cancelled_fixer?: boolean;
}

// * Fixed Endpoint Pichon: Refactorizar y probar en Postman.
// * El endpoint estaba actualizando mas slots de los que deberia, ahora con el nuevo esquema actualiza lo solicitado.
export async function update_appointment_by_id(id: string, attributes: Partial<IAppointment>) {
  try {
    await connectDatabase();

    //obtener el googleEventId ANTES del cambio
    const originalAppointment = (await Appointment.findById(id)) as unknown as IAppointment | null;

    // * atributos hay que tener cuidado con schedule (ya no es necesario con el nuevo esquema).
    // * desestructurar schedule (ya no es necesario con el nuevo esquema).

    const updated_appointment = (await Appointment.findByIdAndUpdate(
      id,
      { $set: attributes },
      { new: true },
    )) as unknown as IAppointment | null;

    // google
    if (updated_appointment && originalAppointment?.googleEventId) {
      const googleId = originalAppointment.googleEventId;

      // CANCELACION (Si el estado cambia a cancelled)
      if (attributes.schedule_state === 'cancelled') {
        console.log('Cancelacion detectada. Eliminando de Google Calendar...');
        await deleteMeetingEvent(googleId);
      }
      // EDICION DE DATOS (Si no es cancelacion)
      else {
        console.log('Edicion detectada. Actualizando Google Calendar...');

        // Usamos los datos actualizados para reflejarlos en el calendario
        const appt = updated_appointment;

        const desc = `Cliente: ${appt.current_requester_name}\nContacto: ${appt.current_requester_phone}\nDescripcion: ${appt.appointment_description}`;

        // Mantenemos las fechas originales (ya que dijiste que no se editan)
        const start = appt.starting_time;
        const end = appt.finishing_time || new Date(new Date(start).getTime() + 60 * 60000);

        // El titulo tambien se actualiza por si cambio el nombre del cliente
        const title = 'Cita Servineo';

        await updateMeetingInvite(googleId, {
          emails: appt.mail,
          title: title,
          description: desc,
          start: start,
          end: end,
          isVirtual: appt.appointment_type === 'virtual',
          customLink: appt.link_id,
          locationName: appt.display_name_location,
          locationCoordinates: appt.lat && appt.lon ? { lat: appt.lat, lon: appt.lon } : undefined,
        });
      }
    }

    if (updated_appointment) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    throw new Error((err as Error).message);
  }
}

export async function fixer_cancell_appointment_by_id(appointment_id: string) {
  try {
    await connectDatabase();

    // cita original para tener el ID
    const originalAppointment = (await Appointment.findById(
      appointment_id,
    )) as unknown as IAppointment | null;

    const result = (await Appointment.findByIdAndUpdate(
      appointment_id,
      {
        cancelled_fixer: true,
      },
      {
        new: true,
      },
    )) as unknown as IAppointment | null;

    //google
    if (result && originalAppointment?.googleEventId) {
      console.log('Fixer cancelo la cita. Eliminando evento de Google Calendar...');
      await deleteMeetingEvent(originalAppointment.googleEventId);
    }

    if (!result) {
      throw new Error('Appointment no econtrado');
    }
    return result;
  } catch (error) {
    throw new Error((error as Error).message);
  }
}

interface Availability {
  lunes: number[];
  martes: number[];
  miercoles: number[];
  jueves: number[];
  viernes: number[];
  sabado: number[];
  domingo: number[];
}

export async function update_fixer_availability(fixer_id: string, availability: Availability) {
  try {
    const db = mongoose.connection.db!;
    const result = await db
      .collection('users')
      .updateOne(
        { _id: new mongoose.Types.ObjectId(fixer_id) },
        { $set: { availability: availability } },
      );
    return result;
  } catch (err) {
    throw new Error((err as Error).message);
  }
}
