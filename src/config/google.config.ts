import { google } from 'googleapis';
import dotenv from 'dotenv';

// Cargamos las variables de entorno (por si este archivo se ejecuta aislado)
dotenv.config();
//los odio
// 1. Obtenemos las credenciales del .env
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// Verificación básica para evitar errores locos si falta algo
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
  console.error('ERROR: Faltan variables de entorno de Google Calendar.');
  console.error('Asegúrate de tener GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REFRESH_TOKEN en tu .env');
}

// 2. Configuramos el cliente OAuth2
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

// 3. ¡La magia! Seteamos el refresh token.
// Esto hace que Google gestione automáticamente la renovación del access token.
oauth2Client.setCredentials({
  refresh_token: GOOGLE_REFRESH_TOKEN,
});

// 4. Creamos la instancia del calendario
const calendar = google.calendar({ 
  version: 'v3', 
  auth: oauth2Client 
});

// Exportamos la instancia lista para usar y el ID del calendario
export { calendar };

// 'primary' usa el calendario principal de la cuenta.
// Si quieres uno específico, pon su ID (ej: kjsdhfksjdf@group.calendar.google.com)
export const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';