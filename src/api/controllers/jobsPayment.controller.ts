import { Request, Response } from 'express';
import  Job  from '../../models/jobs.model';
import {User} from "../../models/user.model";

export async function createJobController(req: Request, res: Response) {
  try {
    const job = await Job.create(req.body);
    res.status(200).json(job);
  } catch (error) {
    console.log('Error to create Job:', error);
    res.status(500).json({ error: 'Error creating Job' });
  }
}

export async function getJobs(req: Request, res: Response) {
  try {
    const jobs = await Job.find({});
    res.status(200).json(jobs);
  } catch (error) {
    console.log('Error to get Jobs:', error);
    res.status(500).json({ error: 'Error getting Jobs' });
  }
}

export async function getJob(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.status(200).json(job);
  } catch (error) {
    console.log('Error to get Job:', error);
    res.status(500).json({ error: 'Error getting Job' });
  }
}

export async function updateJob(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const job = await Job.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.status(200).json(job);
  } catch (error) {
    console.log('Error to update Job:', error);
    res.status(500).json({ error: 'Error updating Job' });
  }
}

export async function deleteJob(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const job = await Job.findByIdAndDelete(id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.status(200).json({ message: 'Job deleted successfully', job });
  } catch (error) {
    console.log('Error to delete Job:', error);
    res.status(500).json({ error: 'Error deleting Job' });
  }
}


// =========================
// Listar trabajos de usuario (solo requester)
// (Esta función se queda igual)
// =========================
export const listJobs = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query as { userId: string };
    console.log("🟦 [listJobs] Iniciando búsqueda de trabajos...");
    console.log("🔹 Parámetro recibido userId:", userId);

    // 1️⃣ Validar que el userId esté presente
    if (!userId) {
      console.warn("⚠️ No se envió el parámetro userId");
      return res.status(400).json({ error: "Falta el parámetro userId" });
    }

    // 2️⃣ Buscar usuario en MongoDB
    console.log("🔍 Buscando usuario en la base de datos...");
    const user = await User.findById(userId);

    if (!user) {
      console.warn("❌ Usuario no encontrado con ID:", userId);
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    console.log("✅ Usuario encontrado:", {
      id: user._id,
      name: user.name,
      role: user.role,
      email: user.email,
    });

    // 3️⃣ Verificar que sea requester
    if (user.role !== "requester") {
      console.warn("⛔ Acceso denegado. Rol del usuario:", user.role);
      return res.status(403).json({ error: "Acceso denegado: el usuario no es requester" });
    }

    console.log("🟢 Rol verificado: requester");

    // 4️⃣ Buscar trabajos donde el usuario sea el solicitante
    console.log("🧾 Buscando trabajos asociados al requester...");
    const jobs = await Job.find({ requesterId: userId });

    // 5️⃣ Si no hay trabajos, devolver mensaje
    if (!jobs || jobs.length === 0) {
  return res.status(200).json([]);
}

    console.log(`📦 ${jobs.length} trabajo(s) encontrado(s) para el usuario ${user.name}`);

    // 6️⃣ Retornar los trabajos encontrados
    res.json(jobs);

  } catch (error: any) { // Tipado de 'error'
    console.error("🔥 Error listJobs:", error);
    res.status(500).json({ error: error.message });
  }
};


// ===================================
// 🔥 NUEVA FUNCIÓN: Listar trabajos para el Fixer
// (Esta es la función que tu lista de Fixer debe llamar)
// ===================================
export const listFixerJobs = async (req: Request, res: Response) => {
  try {
    const { fixerId } = req.query as { fixerId: string };
    console.log("🟦 [listFixerJobs] Iniciando búsqueda de trabajos para Fixer...");
    console.log("🔹 Parámetro recibido fixerId:", fixerId);

    // 1️⃣ Validar que el fixerId esté presente
    if (!fixerId) {
      console.warn("⚠️ No se envió el parámetro fixerId");
      return res.status(400).json({ error: "Falta el parámetro fixerId" });
    }

    // 2️⃣ (Opcional pero recomendado) Validar que el usuario es un Fixer
    const user = await User.findById(fixerId);
    if (!user) {
      console.warn("❌ Fixer no encontrado con ID:", fixerId);
      return res.status(404).json({ error: "Usuario (Fixer) no encontrado" });
    }
    if (user.role !== "fixer") {
      console.warn("⛔ Acceso denegado. Rol del usuario:", user.role);
      return res.status(403).json({ error: "Acceso denegado: el usuario no es fixer" });
    }

    console.log("🟢 Rol verificado: fixer");

    // 3️⃣ Buscar trabajos PENDIENTES para este Fixer
    console.log("🧾 Buscando trabajos PENDIENTES asociados al fixer...");
    
    // Usamos el modelo 'Job' (que apunta a 'jobspays')
    // Buscamos los trabajos que este Fixer necesita confirmar
    const jobs = await Job.find({ 
      fixerId: fixerId,
      status: "Pendiente" // <-- ¡Solo trae los que faltan por confirmar!
    });

    if (!jobs || jobs.length === 0) {
      console.log("📭 No se encontraron trabajos pendientes para este fixer");
      // Devolvemos un array vacío (un 200 OK) para que el frontend muestre "No hay trabajos"
      return res.status(200).json([]); 
    }

    console.log(`📦 ${jobs.length} trabajo(s) pendiente(s) encontrado(s)`);

    // 4️⃣ Retornar los trabajos encontrados
    res.json(jobs);

  } catch (error: any) {
    console.error("🔥 Error listFixerJobs:", error);
    res.status(500).json({ error: error.message });
  }
};
