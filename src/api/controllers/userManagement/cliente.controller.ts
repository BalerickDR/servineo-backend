import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import clientPromise from "../../../config/db/mongodb";
import { getClientById } from "../../../services/userManagement/cliente.service";


export async function getClientProfile(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ status: "error", message: "No autenticado: userId no presente en el token." });
    }

    const client = await getClientById(userId);

    if (!client) {
      return res.status(404).json({ status: "error", message: "Cliente no encontrado" });
    }

    const authProvidersSafe = (client.authProviders || []).map((p: any) => ({
      provider: p.provider,
      providerId: p.providerId,
      linkedAt: p.linkedAt ? new Date(p.linkedAt).toISOString() : undefined,
    }));

    const clientData = {
      ...client,
      loginMethods: authProvidersSafe,
    };

    return res.json({ status: "ok", client: clientData });
  } catch (err) {
    console.error("Error en getClientProfile:", err);
    return res.status(500).json({ status: "error", message: "Error interno del servidor" });
  }
}

export async function unlinkLoginMethod(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const { provider } = req.body;


    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "No autenticado: userId no presente en el token.",
      });
    }

    if (!provider) {
      return res.status(400).json({
        status: "error",
        message: "Falta el provider",
      });
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db("ServineoBD");

    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Usuario no encontrado.",
      });
    }

    const tieneProvider = Array.isArray(user.authProviders) && user.authProviders.some((p: any) => p.provider === provider);
    if (!tieneProvider) {
      return res.status(400).json({
        status: "error",
        message: `El método ${provider} no está vinculado.`,
      });
    }

    const result = await db.collection("users").findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $pull: { authProviders: { provider } } } as unknown as import("mongodb").UpdateFilter<any>,
      { returnDocument: "after" }
    );

    if (!result) {
      return res.status(500).json({
        status: "error",
        message: "No se pudo actualizar el usuario.",
      });
    }

    const updated = (result as any).value || result;
    if (!updated) {
      return res.status(500).json({
        status: "error",
        message: "No se pudo actualizar el usuario al desvincular el método.",
      });
    }

    let authProvidersSafe: Array<{ provider: string; providerId?: string; linkedAt?: string }> = [];
    try {
      authProvidersSafe = (updated.authProviders || []).map((p: any, idx: number) => {
        if (!p) {
          return { provider: "unknown", providerId: undefined, linkedAt: undefined };
        }
        return {
          provider: p.provider,
          providerId: p.providerId,
          linkedAt: p.linkedAt ? new Date(p.linkedAt).toISOString() : undefined,
        };
      });
    } catch (err) {
      return res.status(500).json({
        status: "error",
        message: "Error procesando métodos de autenticación",
      });
    }

    const clientResponse = {
      id: updated._id?.toString?.() || String(updated._id),
      name: updated.name,
      email: updated.email,
      authProviders: authProvidersSafe,
    };

    return res.json({
      status: "ok",
      message: `Método ${provider} desvinculado correctamente.`,
      client: clientResponse,
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Error interno al desvincular método.",
    });
  }
}

// -----------------------------
// Vincular email + contraseña
// -----------------------------
export async function linkEmailPasswordMethod(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ status: "error", message: "No autenticado: userId no presente en el token." });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ status: "error", message: "Faltan datos (email o contraseña)" });
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db("ServineoBD");

    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ status: "error", message: "Usuario no encontrado" });
    }

    const yaVinculado = Array.isArray(user.authProviders) && user.authProviders.some((p: any) => p.provider === "email");

    if (yaVinculado) {
      return res.status(400).json({
        status: "error",
        message: "Ya tienes un método de correo vinculado.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const now = new Date();
    const result = await db.collection("users").findOneAndUpdate(
      { _id: new ObjectId(userId) },
      {
        $push: {
          authProviders: {
            provider: "email",
            providerId: email,
            password: passwordHash,
            linkedAt: now,
          },
        },
      } as any,
      { returnDocument: "after" }
    );

    if (!result) {
      return res.status(500).json({
        status: "error",
        message: "No se pudo vincular el método email",
      });
    }

    const updated = (result as any).value || result;
    if (!updated?.authProviders) {
      return res.status(500).json({
        status: "error",
        message: "No se pudo vincular el método email",
      });
    }

    let authProvidersSafe: Array<{ provider: string; providerId?: string; linkedAt?: string }> = [];
    try {
      authProvidersSafe = (updated.authProviders || []).map((p: any, idx: number) => {
        if (!p) {
          return { provider: 'unknown', providerId: undefined, linkedAt: undefined };
        }
        return {
          provider: p.provider,
          providerId: p.providerId,
          linkedAt: p.linkedAt ? new Date(p.linkedAt).toISOString() : undefined,
        };
      });
    } catch (err) {
      console.error('Error mapeando authProvidersSafe:', err, updated.authProviders);
      return res.status(500).json({ status: 'error', message: 'Error procesando métodos de autenticación' });
    }

    const clientResponse = {
      id: updated._id?.toString?.() || String(updated._id),
      name: updated.name,
      email: updated.email,
      authProviders: authProvidersSafe,
    };
    return res.json({
      status: "ok",
      message: "Método email vinculado correctamente",
      client: clientResponse,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ status: "error", message: "Error interno del servidor" });
  }
}

export async function linkGoogleMethod(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ status: "error", message: "No autenticado: userId no presente en el token." });
    }

    const { tokenGoogle } = req.body;
    if (!tokenGoogle) {
      return res.status(400).json({
        status: "error",
        message: "Falta el token de Google",
      });
    }

    const googleResponse = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${tokenGoogle}`
    );
    const googleData = await googleResponse.json();

    if (!googleData.sub) {
      return res.status(400).json({
        status: "error",
        message: "Token de Google inválido.",
      });
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db("ServineoBD");

    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ status: "error", message: "Usuario no encontrado" });
    }

    const yaVinculado = Array.isArray(user.authProviders) && user.authProviders.some((p: any) => p.provider === "google");
    if (yaVinculado) {
      return res.status(400).json({
        status: "error",
        message: "Ya tienes una cuenta de Google vinculada.",
      });
    }

    const now = new Date();
    const result = await db.collection("users").findOneAndUpdate(
      { _id: new ObjectId(userId) },
      {
        $push: {
          authProviders: {
            provider: "google",
            providerId: googleData.sub,
            linkedAt: now,
          },
        },
      } as any,
      { returnDocument: "after" }
    );

    if (!result) {
      return res.status(500).json({
        status: "error",
        message: "No se pudo vincular el método Google.",
      });
    }

    const updated = (result as any).value || result;
    const authProvidersSafe = (updated.authProviders || []).map((p: any) => ({
      provider: p.provider,
      providerId: p.providerId,
      linkedAt: p.linkedAt ? new Date(p.linkedAt).toISOString() : undefined,
    }));

    const clientResponse = {
      id: updated._id?.toString?.() || String(updated._id),
      name: updated.name,
      email: updated.email,
      authProviders: authProvidersSafe,
    };

    return res.json({
      status: "ok",
      message: "Cuenta de Google vinculada correctamente",
      client: clientResponse,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ status: "error", message: "Error interno del servidor" });
  }
}
