import { Request, Response } from 'express';
// 🟢 CORRECCIÓN: Usamos tu modelo local 'jobs.model' para asegurar compatibilidad con la BD
import Jobspay from '../../models/jobs.model';
import User from '../../models/userPayment.model';

// =========================
// Listar trabajos de usuario (solo requester)
// =========================
export const listJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;
    console.log('🟦 [listJobs] Iniciando búsqueda de trabajos...');
    console.log('🔹 Parámetro recibido userId:', userId);

    // 1️⃣ Validar que el userId esté presente
    if (!userId) {
      console.warn('⚠️ No se envió el parámetro userId');
      res.status(400).json({ error: 'Falta el parámetro userId' });
      return;
    }

    // 2️⃣ Buscar usuario en MongoDB
    console.log('🔍 Buscando usuario en la base de datos...');
    const user = await User.findById(userId);

    if (!user) {
      console.warn('❌ Usuario no encontrado con ID:', userId);
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    console.log('✅ Usuario encontrado:', {
      id: user._id,
      name: user.name,
      role: user.role,
      email: user.email,
    });

    // 3️⃣ Verificar que sea requester
    if (user.role !== 'requester') {
      console.warn('⛔ Acceso denegado. Rol del usuario:', user.role);
      res.status(403).json({ error: 'Acceso denegado: el usuario no es requester' });
      return;
    }

    console.log('🟢 Rol verificado: requester');

    // 4️⃣ Buscar trabajos donde el usuario sea el solicitante
    // Usamos el modelo Jobspay (que viene de jobs.model)
    console.log('🧾 Buscando trabajos asociados al requester...');
    const jobs = await Jobspay.find({ requesterId: userId });

    // 5️⃣ Si no hay trabajos, devolver array vacío (Status 200)
    // CAMBIO IMPORTANTE: No devolver 404 si es un array vacío, devolver [],
    // para que el frontend no lance error "Error al obtener trabajos".
    if (!jobs || jobs.length === 0) {
      console.log('📭 No se encontraron trabajos, devolviendo lista vacía.');
      res.status(200).json([]); 
      return;
    }

    console.log(`📦 ${jobs.length} trabajo(s) encontrado(s) para el usuario ${user.name}`);

    // 6️⃣ Retornar los trabajos encontrados
    res.status(200).json(jobs);
  } catch (error) {
    console.error('🔥 Error listJobs:', error);
    res.status(500).json({ error: (error as Error).message });
  }
};