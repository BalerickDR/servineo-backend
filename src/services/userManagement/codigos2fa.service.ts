import clientPromise from '../../config/db/mongodb';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || "servineo_super_secret_key";
const TOKEN_EXPIRES = "2h";

export async function verifyRecoveryCodeForEmail(email: string, codigo: string) {
  try {

    const mongoClient = await clientPromise;
    const db = mongoClient.db("ServineoBD");

    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return { success: false, message: "Usuario no encontrado" };
    }

    if (!user.recoveryCodes || !Array.isArray(user.recoveryCodes)) {
      return { success: false, message: "No hay códigos registrados" };
    }

    // Generar hash SHA-256 del código ingresado
    const hashIngresado = crypto
      .createHash("sha256")
      .update(codigo)
      .digest("hex");

    // Buscar coincidencia
    const index = user.recoveryCodes.findIndex(
      storedHash => storedHash === hashIngresado
    );

    if (index === -1) {
      return { success: false, message: "Código incorrecto" };
    }

    user.recoveryCodes.splice(index, 1);

    await db.collection("users").updateOne(
      { _id: new ObjectId(user._id) },
      { $set: { recoveryCodes: user.recoveryCodes } }
    );

    // Generar token JWT
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRES }
    );

    return {
      success: true,
      message: "Código verificado correctamente",
      data: {
        token,
        user: {
          _id: user._id.toString(),
          email: user.email,
          name: user.name,
          picture: user.picture ?? null
        }
      }
    };

  } catch (err) {
    return { success: false, message: "Error interno del servidor" };
  }
}
