import 'express';
import { Request, Response } from 'express';
import * as GetScheduleService from '../../services/schedule/get_schedule.service';

// Obtener horarios de un requester en un mes específico
// TODO: fix, controladores deben devolver siempre status codes, dataExists no debe existir
// * FIXED Endpoint Chamo: -
export async function getRequesterSchedulesByFixerMonth(req: Request, res: Response) {
  try {
    const { fixer_id, requester_id, month } = req.query;
    if (!fixer_id || typeof fixer_id !== 'string') {
      res.status(400).json({ message: 'Missing required query parameters: fixer_id.' });
      return;
    }
    if (!requester_id || typeof requester_id !== 'string') {
      res.status(400).json({ message: 'Missing required query parameters: requester_id.' });
      return;
    }
    if (!month || typeof month !== 'string') {
      res.status(400).json({ message: 'Missing required query parameters: month.' });
      return;
    }
    const data = await GetScheduleService.get_requester_schedules_by_fixer_month(
      fixer_id,
      requester_id,
      month,
    );
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching requester schedules by fixer and month.' });
  }
}

// TODO: fix, controladores deben devolver siempre status codes, dataExists no debe existir
export async function getAllRequesterSchedulesByFixerMonth(req: Request, res: Response) {
  try {
    const { fixer_id, requester_id, month } = req.query;
    if (!fixer_id || typeof fixer_id !== 'string') {
      res.status(400).json({ message: 'Missing required query parameters: fixer_id.' });
      return;
    }
    if (!requester_id || typeof requester_id !== 'string') {
      res.status(400).json({ message: 'Missing required query parameters: requester_id.' });
      return;
    }
    if (!month || typeof month !== 'string') {
      res.status(400).json({ message: 'Missing required query parameters: month.' });
      return;
    }
    const data = await GetScheduleService.get_all_requester_schedules_by_fixer_month(
      fixer_id,
      requester_id,
      month,
    );
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching all requester schedules by fixer and month.' });
  }
}

//TODO: Fixear Endpoint Arrick: Unificar con el endpoint de arriba.
export async function getAllRequesterSchedulesByFixerDay(req: Request, res: Response) {
  try {
    const { fixer_id, requester_id, searched_date } = req.query;

    if (!fixer_id || typeof fixer_id !== 'string') {
      return res.status(400).json({ message: 'Missing required query parameters: fixer_id.' });
    }
    if (!requester_id || typeof requester_id !== 'string') {
      return res.status(400).json({ message: 'Missing required query parameters: requester_id.' });
    }
    if (!searched_date || typeof searched_date !== 'string') {
      return res.status(400).json({ message: 'Missing required query parameters: searched_date.' });
    }

    const date = new Date(searched_date);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ message: 'Invalid date format for searched_date.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching all requester schedules by fixer and day.' });
  }
}

// * Endpoints de rati ratone que no dice nada de lo que necesita...
export async function getRequesterSchedulesByFixerDay(req: Request, res: Response) {
  try {
    const { fixer_id, requester_id, searched_date } = req.query;
    if (!fixer_id || !requester_id || !searched_date) {
      return res
        .status(400)
        .json({
          message: 'Missing required query parameters: fixer_id, requester_id or searched_date.',
        });
    }
    if (
      typeof fixer_id !== 'string' ||
      typeof requester_id !== 'string' ||
      typeof searched_date !== 'string'
    ) {
      return res.status(400).json({ message: 'Type error definition in some parameter.' });
    }
    const data = await GetScheduleService.get_requester_schedules_by_fixer_day(
      fixer_id,
      requester_id,
      searched_date,
    );
    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: 'Error fetching requester schedules by fixer and day.' });
  }
}

// * Endpoints de rati ratone que no dice nada de lo que necesita...
export async function getOtherRequesterSchedulesByFixerDay(req: Request, res: Response) {
  try {
    const { fixer_id, requester_id, searched_date } = req.query;
    if (!fixer_id || !requester_id || !searched_date) {
      return res
        .status(400)
        .json({
          message: 'Missing required query parameters: fixer_id, requester_id or searched_date.',
        });
    }
    if (
      typeof fixer_id !== 'string' ||
      typeof requester_id !== 'string' ||
      typeof searched_date !== 'string'
    ) {
      return res.status(400).json({ message: 'Type error definition in some parameter.' });
    }
    const data = await GetScheduleService.get_other_requester_schedules_by_fixer_day(
      fixer_id,
      requester_id,
      searched_date,
    );
    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: 'Error fetching all requester schedules by fixer and day.' });
  }
}

// TODO: Endpoint que devuelve las citas canceladas por el propio requester que ve el calendario de un determinadon fixer en una fecha determinada.
export async function getCancelledSchedulesByRequesterDay(req: Request, res: Response) {
  try {
    const { fixer_id, requester_id, searched_date } = req.query;
    if (!fixer_id || !requester_id || !searched_date) {
      return res
        .status(400)
        .json({
          message: 'Missing required query parameters: fixer_id, requester_id or searched_date.',
        });
    }
    if (
      typeof fixer_id !== 'string' ||
      typeof requester_id !== 'string' ||
      typeof searched_date !== 'string'
    ) {
      return res.status(400).json({ message: 'Type error definition in some parameter.' });
    }
    const data = await GetScheduleService.get_cancelled_schedules_by_requester_day(
      fixer_id,
      requester_id,
      searched_date,
    );
    if (!data) {
      return res.status(400).json({
        message: 'Could not find any cancelled schedule by the requester on this date.',
      });
    } else {
      return res.status(200).json({
        cancelled_schedules_requester: data,
        message: 'Cancelled schedules by requester accessed successfully.',
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching cancelled schedules by requester.' });
  }
}

// TODO: Endpoint que devuelve las citas canceladas por el fixer respecto a un determinado requester en una determinada fecha.
export async function getCancelledSchedulesByFixerDay(req: Request, res: Response) {
  try {
    const { fixer_id, requester_id, searched_date } = req.query;
    if (!fixer_id || !requester_id || !searched_date) {
      return res
        .status(400)
        .json({
          message: 'Missing required query parameters: fixer_id, requester_id or searched_date.',
        });
    }
    if (
      typeof fixer_id !== 'string' ||
      typeof requester_id !== 'string' ||
      typeof searched_date !== 'string'
    ) {
      return res.status(400).json({ message: 'Type error definition in some parameter.' });
    }
    const data = await GetScheduleService.get_cancelled_schedules_by_fixer_day(
      fixer_id,
      requester_id,
      searched_date,
    );
    if (!data) {
      return res.status(400).json({
        message: 'Could not find any cancelled schedule by the fixer on this date.',
      });
    } else {
      return res.status(200).json({
        cancelled_schedules_fixer: data,
        message: 'Cancelled schedules by fixer accessed successfully.',
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching cancelled schedules by fixer.' });
  }
}
