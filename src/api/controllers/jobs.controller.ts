import { Request, Response } from 'express';
// Asegúrate de que la importación coincida con cómo exportas el modelo (default o named)
// En el general estaba como named { Job }, en el tuyo como default Job.
// He dejado la del general, si falla, quita las llaves { }.
import { Job } from '../../models/jobs.model'; 
import { User } from '../../models/user.model';

// ==========================================
// CRUD ESTÁNDAR (Del Repo General)
// ==========================================

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

// ==========================================
// FUNCIONES ESPECIALES (Del Repo General)
// ==========================================

// Obtener lista de trabajos (servicios) con sus fixers asociados
export async function getJobsWithFixers(_req: Request, res: Response) {
  try {
    // 1. Obtener todos los usuarios que son fixers y tienen fixerProfile
    const fixers = await User.find({ role: 'fixer', fixerProfile: { $exists: true } }).lean();

    // 2. Construir conjunto de servicios distintos
    const serviceSet = new Set<string>();
    for (const fixer of fixers) {
      const services = (fixer as any).fixerProfile?.services as string[] | undefined;
      if (Array.isArray(services)) {
        for (const service of services) {
          if (service) {
            serviceSet.add(service);
          }
        }
      }
    }

    // 3. Para cada servicio, obtener los fixers que lo ofrecen
    const jobsWithFixers = Array.from(serviceSet).map((service) => {
      const fixersForService = fixers
        .filter((fixer) => (fixer as any).fixerProfile?.services?.includes(service))
        .map((fixer) => ({
          id: (fixer as any)._id.toString(),
          name: fixer.name,
          city: '', 
          rating: 0, 
          avatar: (fixer as any).fixerProfile?.photoUrl || undefined,
        }));

      return {
        jobType: service,
        fixers: fixersForService,
      };
    });

    return res.status(200).json({
      success: true,
      data: jobsWithFixers,
    });
  } catch (error: any) {
    console.log('Error to get JobsWithFixers:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error getting Jobs with Fixers',
    });
  }
}

// ==========================================
// TUS FUNCIONES LOCALES (Pagos / Workflow)
// ==========================================

// Listar trabajos de usuario (solo requester)
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

    // 5️⃣ Si no hay trabajos, devolver lista vacía (Status 200)
    if (!jobs || jobs.length === 0) {
      return res.status(200).json([]);
    }

    console.log(`📦 ${jobs.length} trabajo(s) encontrado(s) para el usuario ${user.name}`);

    // 6️⃣ Retornar los trabajos encontrados
    res.json(jobs);

  } catch (error: any) { 
    console.error("🔥 Error listJobs:", error);
    res.status(500).json({ error: error.message });
  }
};

// Listar trabajos para el Fixer (Pendientes)
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

    // 2️⃣ Validar Fixer
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
    
    // Buscamos los trabajos que este Fixer necesita confirmar
    const jobs = await Job.find({ 
      fixerId: fixerId,
      status: "Pendiente" 
    });

    if (!jobs || jobs.length === 0) {
      console.log("📭 No se encontraron trabajos pendientes para este fixer");
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