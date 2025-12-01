import { Request, Response } from 'express';
import fs from "fs";
import { updateUserPhoto } from '../../../services/userManagement/fotoPerfil.service';
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

    const urlFoto = await uploadToGoogleDrive(archivo.path, archivo.filename);

    fs.unlink(archivo.path, (err) => {
      if (err) console.error("Error borrando archivo temporal:", err);
    });
    await updateUserPhoto(usuarioId, urlFoto);

    return res.status(200).json({
      success: true,
      message: 'Foto actualizada.',
      url: urlFoto
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al subir foto.'
    });
  }
}
