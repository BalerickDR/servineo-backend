import { Request, Response } from 'express';
import fs from "fs";
import { updateUserPhoto } from '../../../services/userManagement/fotoPerfil.service';
import { getUserById } from '../../../services/userManagement/registrarDatos.service';
import { generarToken } from '../../../utils/generadorToken';
import { uploadToGoogleDrive } from './googleDrive.service';

export async function actualizarFotoPerfil(req: Request, res: Response) {
  try {
    const { usuarioId } = req.body;
    const archivo = req.file;

    if (!usuarioId || !archivo) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos: usuarioId o archivo.',
      });
    }

    // Subir foto a Drive
    const urlFoto = await uploadToGoogleDrive(archivo.path, archivo.filename);

    // Borrar archivo temporal
    fs.unlink(archivo.path, (err) => {
      if (err) console.error("Error borrando archivo temporal:", err);
    });

    // Actualizar la foto en la base de datos
    await updateUserPhoto(usuarioId, urlFoto);

    // 🔥 Obtener usuario actualizado desde DB
    const user = await getUserById(usuarioId);

    if (!user) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }

    // 🔥 Generar un nuevo token con la foto actualizada
    const newToken = generarToken(
      user._id.toString(),
      user.name,
      user.email,
      user.role,
      user.url_photo      // foto nueva
    );

    return res.status(200).json({
      success: true,
      message: 'Foto actualizada.',
      url: urlFoto,
      token: newToken     // 🔥 enviar token actualizado
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al subir foto.'
    });
  }
}
