import { Router } from 'express';
import {
    registrarDispositivo,
    obtenerDispositivos,
    eliminarDispositivo,
    eliminarTodasExceptoActual
} from '../../controllers/userManagement/device.controller';

const router = Router();

// Registrar un dispositivo
router.post('/register', registrarDispositivo);

// Eliminar todas las sesiones excepto la actual
router.delete('/all/:userId', eliminarTodasExceptoActual);

// Eliminar un dispositivo específico
router.delete('/:id', eliminarDispositivo);

// Obtener dispositivos de un usuario
router.get('/:userId', obtenerDispositivos);

export default router;
