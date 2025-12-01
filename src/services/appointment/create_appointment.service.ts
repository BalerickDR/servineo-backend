import * as dotenv from 'dotenv';
import { connectDatabase } from '../../config/db.config';
import Appointment from '../../models/Appointment';
import mongoose from 'mongoose';
import { sendMeetingInvite } from '../../utils/googleCalendarHelper';

dotenv.config();

interface AppointmentParameter {
  id_fixer: string;
  id_requester: string;
  selected_date: Date;
  current_requester_name: string;
  appointment_type: 'virtual' | 'presential';
  appointment_description: string;
  link_id?: string;
  current_requester_phone: string;
  starting_time: Date;
  finishing_time?: Date;
  schedule_state?: 'cancelled' | 'booked';
  display_location_name?: string;
  lat?: string;
  lon?: string;
  mail: string[] | string; // ← aceptamos también string
  cancelled_fixer?: boolean;
  reprogram_reason?: string;
  googleEventId?: string;
}

export async function create_appointment(current_appointment: AppointmentParameter) {
  try {
    await connectDatabase();

    const requester_id = current_appointment.id_requester;
    const fixer_id = current_appointment.id_fixer;
    const date_selected = current_appointment.selected_date;
    const time_starting = current_appointment.starting_time;
    const appointment_description = current_appointment.appointment_description;

    // 🔥 CONVERTIR MAIL A ARRAY SI LLEGA COMO STRING
    const mailInput = current_appointment.mail;
    const mailList = Array.isArray(mailInput) ? mailInput : [mailInput];

    const db = mongoose.connection.db!;
    const formated_id_fixer = new mongoose.Types.ObjectId(fixer_id);
    const formated_id_requester = new mongoose.Types.ObjectId(requester_id);

    const existingRequester = await db.collection('users').findOne({
      _id: formated_id_requester,
    });
    if (!existingRequester || existingRequester.role !== 'requester') {
      return { result: false, message_state: 'Requester no encontrado.' };
    }

    const existingFixer = await db.collection('users').findOne({
      _id: formated_id_fixer,
    });
    if (!existingFixer || existingFixer.role !== 'fixer') {
      return { result: false, message_state: 'Fixer no encontrado.' };
    }

    const exists = await Appointment.findOne({
      id_fixer: fixer_id,
      id_requester: requester_id,
      selected_date: date_selected,
      starting_time: time_starting,
    });

    const syncWithGoogle = async () => {
      if (mailList && mailList.length > 0) {
        const endTime =
          current_appointment.finishing_time ||
          new Date(new Date(time_starting).getTime() + 60 * 60000);

        const desc = `Cliente: ${current_appointment.current_requester_name}\nContacto: ${current_appointment.current_requester_phone}\nDescripcion: ${appointment_description}`;

        const googleResult = await sendMeetingInvite({
          emails: mailList,
          title: 'Cita con Servineo',
          description: desc,
          start: time_starting,
          end: endTime,
          isVirtual: current_appointment.appointment_type === 'virtual',
          customLink: current_appointment.link_id,
          locationName: current_appointment.display_location_name,
          locationCoordinates:
            current_appointment.lat && current_appointment.lon
              ? { lat: current_appointment.lat, lon: current_appointment.lon }
              : undefined,
        });

        if (googleResult.success) {
          current_appointment.googleEventId = googleResult.eventId || undefined;
        }
      }
    };

    let appointment = null;

    if (!exists || (exists && exists.cancelled_fixer)) {
      await syncWithGoogle();

      appointment = new Appointment(current_appointment);
      await appointment.save();
      return { result: true, message_state: 'Cita creada correctamente.' };
    } else if (exists && exists.schedule_state === 'cancelled') {
      await syncWithGoogle();

      const id_appointmente_exists = exists._id;
      current_appointment.schedule_state = 'booked';
      current_appointment.reprogram_reason = '';
      await Appointment.findByIdAndUpdate(
        id_appointmente_exists,
        { $set: current_appointment },
        { new: true },
      );

      return { result: true, message_state: 'Cita creada correctamente.' };
    } else {
      return {
        result: true,
        message_state: 'No se puede crear la cita, la cita ya existe.',
      };
    }
  } catch (err) {
    throw new Error('Error creating appointment: ' + (err as Error).message);
  }
}
