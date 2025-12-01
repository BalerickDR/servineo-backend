import 'express';
import { Request, Response } from 'express';
import * as ReadAppointmentService from '../../services/appointment/read_appointment.service';

// * Fixed Endpoint Arrick: Devolvia mucho 404.
// * Anteriores 2 endpoints unificados: se obtienen todas las citas de un dia
// ? Inclue a todas las citas de todos los requesters en el dia
export async function getAppointmentsByDate(req: Request, res: Response) {
  try {
    const { id_fixer, selected_date } = req.query;
    if (
      !id_fixer ||
      !selected_date ||
      typeof id_fixer !== 'string' ||
      typeof selected_date !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing parameter: required fixer id or selected date',
      });
    }
    const { appointments } = await ReadAppointmentService.get_appointments_by_fixer_day(
      id_fixer,
      selected_date,
    );
    return res.status(200).json({
      success: true,
      message: 'Appointments for the selected date successfully accessed',
      accessed_appointments: appointments,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error accessing appointments for the selected date.',
      error: (err as Error).message,
    });
  }
}

// * Fixed Endpoint Pichon: -
export async function getModalFormAppointment(req: Request, res: Response) {
  try {
    const { fixer_id, requester_id, appointment_date, start_hour } = req.query;
    console.log(req.query);
    if (!fixer_id || !requester_id || !appointment_date || !start_hour) {
      return res
        .status(400)
        .json({
          message:
            'Missing parameter: required fixer_id, requester_id, appointment_date and start_hour',
        });
    }
    if (
      typeof fixer_id !== 'string' ||
      typeof requester_id !== 'string' ||
      typeof appointment_date !== 'string' ||
      typeof start_hour !== 'string'
    ) {
      return res.status(400).json({ message: 'Type error definition in some parameter.' });
    }

    const date = new Date(appointment_date);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ message: 'Invalid date format for appointment_date.' });
    }

    const hour = parseInt(start_hour);
    if (isNaN(hour) || hour < 0 || hour > 23) {
      return res.status(400).json({ message: 'Invalid start_hour. Must be between 0 and 23.' });
    }

    const date_string = date.toISOString();
    const hour_string = hour.toString();
    const data = await ReadAppointmentService.get_modal_form_appointment(
      fixer_id,
      requester_id,
      date_string,
      hour_string,
    );

    if (!data) {
      return res
        .status(404)
        .json({ message: 'No appointment found for the specified parameters.' });
    }

    return res.status(200).json({
      message: 'Appointment modal data found.',
      data: data,
    });
  } catch (error) {
    console.error(error);

    if ((error as Error).message === 'Appointment does not exist.') {
      return res.status(404).json({ message: (error as Error).message });
    }

    res.status(500).json({ message: 'Error fetching modal form appointment data.' });
  }
}

// * Fixed Endpoint Mateo: Reemplazar Body por query y verificar que funcione correctamente.
export async function getMeetingStatus(req: Request, res: Response) {
  try {
    const { id_requester, id_fixer, selected_date, starting_time } = req.query;
    console.log(req.query);
    if (!id_requester || !id_fixer || !selected_date || !starting_time) {
      return res
        .status(400)
        .json({
          message: 'Missing parameters: required requester id, fixer id, date or starting hour',
        });
    }
    if (
      typeof id_requester !== 'string' ||
      typeof id_fixer !== 'string' ||
      typeof selected_date !== 'string' ||
      typeof starting_time !== 'string'
    ) {
      return res.status(400).json({ message: 'Type error definition in some parameter.' });
    }
    const { name, status } = await ReadAppointmentService.get_meeting_status(
      id_requester,
      id_fixer,
      selected_date,
      starting_time,
    );
    console.log(name, status);
    return res.status(200).json({ message: 'Meeting status successfully accessed', name, status });
  } catch (err) {
    return res
      .status(500)
      .json({
        message: 'Error updating appointment data',
        name: '',
        status: '',
        error: (err as Error).message,
      });
  }
}

export async function getAppointmentByFixerIdHour(req: Request, res: Response) {
  try {
    const { fixer_id, date, hour } = req.query;
    if (!fixer_id || !date || !hour) {
      return res.status(400).json({
        succeed: false,
        message: 'Missing query parameters',
      });
    }
    if (typeof fixer_id !== 'string' || typeof date !== 'string' || typeof hour !== 'string') {
      return res.status(400).json({ message: 'Type error definition in some parameter.' });
    }
    const data = await ReadAppointmentService.get_appointment_by_fixer_id_hour(
      fixer_id,
      date,
      hour,
    );
    res.status(200).json({
      succeed: true,
      message: data ? 'Appointment found' : 'Appoitment not found',
      appointment: data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      succeed: false,
      message: 'Error fetching appointment',
    });
  }
}

export async function getFixerAvailability(req: Request, res: Response) {
  const { fixer_id } = req.query;
  if (!fixer_id || typeof fixer_id !== 'string') {
    return res.status(400).json({ message: 'Missing parameter: required fixer_id' });
  }
  try {
    const data = await ReadAppointmentService.get_fixer_availability(fixer_id);
    return res
      .status(200)
      .json({ message: 'Fixer availability fetched successfully', availability: data });
  } catch (err) {
    return res
      .status(500)
      .json({ message: 'Error fetching fixer availability: ' + (err as Error).message });
  }
}

export async function getAppointmentsByFixerIdAndDate(req: Request, res: Response) {
  try {
    const { id_fixer, date } = req.query;
    if (!id_fixer || !date || typeof id_fixer !== 'string' || typeof date !== 'string') {
      return res.status(400).json({
        succeed: false,
        message: 'Missing query parameters',
      });
    }
    const appointments = await ReadAppointmentService.get_appointments_by_fixer_id_date(
      id_fixer,
      date,
    );
    res.status(200).json({
      succeed: true,
      message: 'Appointments fetched succesfully',
      appointments,
    });
  } catch (error) {
    res.status(500).json({
      succeed: false,
      message: 'Error fetching appointments',
      error: (error as Error).message,
    });
  }
}

export async function getSixMonthsAppointments(req: Request, res: Response) {
  try {
    const { fixer_id, date } = req.query;
    console.log(req.query);
    if (!fixer_id || !date || typeof fixer_id !== 'string' || typeof date !== 'string') {
      return res.status(500).json({ message: 'Parameter fixer_id and date are required' });
    }
    const data = await ReadAppointmentService.get_six_months_appointments(fixer_id, date);
    return res.status(200).json({
      message: 'Six months appointments fetched successfully',
      appointments: data,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching data: ' + (err as Error).message });
  }
}

export async function getNumberOfAppointments(req: Request, res: Response) {
  try {
    const { fixer_id, month, year } = req.query;
    if (!fixer_id || !month || !year) {
      return res.status(500).json({ message: 'Parameter fixer_id, month and year are required' });
    }
    if (typeof fixer_id !== 'string' || typeof month !== 'string' || typeof year !== 'string') {
      return res.status(400).json({ message: 'Type error definition in some parameter.' });
    }
    const data = await ReadAppointmentService.get_number_of_appointments(fixer_id, month, year);
    return res.status(200).json({
      message: 'Number of appointments fetched successfully',
      number_of_appointments: data,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching data: ' + (err as Error).message });
  }
}
