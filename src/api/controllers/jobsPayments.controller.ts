import { Request, Response } from 'express';
// 🟢 CORRECCIÓN: Importación con llaves { } porque es una exportación nombrada
import { Jobspay } from '../../models/jobsPayment.model';
import User from '../../models/userPayment.model';

// =========================
// Listar trabajos de usuario (solo requester)
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
    
    // 🟢 CORRECCIÓN: Usar 'Jobspay'
    const jobs = await Jobspay.find({ requesterId: userId });

    // 5️⃣ Si no hay trabajos, devolver array vacío (Status 200)
    if (!jobs || jobs.length === 0) {
      console.log("📭 No se encontraron trabajos, devolviendo lista vacía.");
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


// ===================================
// 🔥 Listar trabajos para el Fixer
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

    // 2️⃣ Validar Fixer (Opcional, útil para seguridad)
    const user = await User.findById(fixerId);
    if (!user) {
      return res.status(404).json({ error: "Usuario (Fixer) no encontrado" });
    }
    if (user.role !== "fixer") {
      return res.status(403).json({ error: "Acceso denegado: el usuario no es fixer" });
    }

    // 3️⃣ Buscar trabajos PENDIENTES para este Fixer
    console.log("🧾 Buscando trabajos PENDIENTES asociados al fixer...");
    
    // 🟢 CORRECCIÓN: Usar 'Jobspay'
    const jobs = await Jobspay.find({ 
      fixerId: fixerId,
      status: "Pendiente" // Filtro para mostrar solo lo que falta pagar/confirmar
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