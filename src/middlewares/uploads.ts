import multer from "multer";
import path from "path";
import fs from "fs";

let uploadDir;

if (process.env.NODE_ENV === 'production') {
  uploadDir = '/tmp/uploads';
} else {
  uploadDir = path.resolve(__dirname, "..", "..", "uploads");
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

// Crear carpeta si no existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});

function fileFilter(req: any, file: Express.Multer.File, cb: any) {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Solo se permiten imágenes."), false);
  }
  cb(null, true);
}

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
}).single("foto");
