import 'express';
import { Request, Response } from 'express';
import * as CreateAppointmentService from '../../services/appointment/create_appointment.service';

// * Fixed: fix, controladores deben devolver siempre status codes, dataExists no debe existir
// *Fixed: no esta devolviendo status code con json de respuesta, revisar dataExists
// * preguntar a vale que necesita de devolucion
// * boolean si se pudo o no

// * Mantener endpoint Vale (revisar si existen fallas con el nuevo esquema de la db).
// * Existian incompatibilidades con el esquema modificado
// ? Asuntos modificados: Ya no se actualizan appointments existentes.
// ? Si ya existe un appointment con el mismo fixer, fecha y hora, se rechaza la creacion.
export async function createAppointment(req: Request, res: Response) {
  try {
    const appointmentData = req.body;

    if (!appointmentData || Object.keys(appointmentData).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'Parametros insuficientes en el body.' });
    }

    const { result, message_state } =
      await CreateAppointmentService.create_appointment(appointmentData);

    console.log(result);
    console.log(message_state);
    if (!result) {
      if (message_state === 'Fixer no encontrado.') {
        return res.status(400).json({
          success: false,
          message: 'No se pudo crear la cita correctamente, id de fixer no encontrado',
        });
      }
      if (message_state === 'Requester no encontrado.') {
        return res.status(400).json({
          success: false,
          message: 'No se pudo crear la cita correctamente, id de requester no encontrado',
        });
      }
      return res.status(400).json({
        success: false,
        message: 'No se pudo crear la cita, la cita actual ya existe.',
      });
    } else {
      return res.status(200).json({
        success: true,
        message: 'Cita creada satisfactoriamente.',
        created: result,
      });
    }
  } catch (err) {
    console.error('Error en el controlador:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Error de servidor.', error: (err as Error).message });
  }
}
