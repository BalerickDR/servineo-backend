import { Router } from 'express';
import { actualizarFotoPerfil } from '../../controllers/userManagement/fotoPefil.controller';
import { uploadImage } from '../../../middlewares/uploads';

const router = Router();

router.put('/usuarios/foto', uploadImage, actualizarFotoPerfil);

export default router;
