import fs from "fs";
import path from "path";
import mime from "mime-types";
import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_DRIVE_CLIENT_ID,
  process.env.GOOGLE_DRIVE_CLIENT_SECRET
);

// Usamos el refresh token para autenticación automática
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
});

export async function uploadToGoogleDrive(filePath: string, fileName?: string) {
  const drive = google.drive({
    version: "v3",
    auth: oauth2Client,
  });

  const fileMetadata: any = {
    name: fileName || path.basename(filePath),
  };

  if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
    fileMetadata.parents = [process.env.GOOGLE_DRIVE_FOLDER_ID];
  }

  const media = {
    mimeType: mime.lookup(filePath) || "image/jpeg",
    body: fs.createReadStream(filePath),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id",
  });

  const fileId = response.data.id;
  if (!fileId) throw new Error("Google Drive no devolvió fileId");

  // Hacer el archivo público
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  // URL pública
  const url = `https://drive.google.com/uc?id=${fileId}`;

  return url; // 👈 esto es lo que recibe tu controlador
}
