/* eslint-disable @typescript-eslint/no-explicit-any */
// src/scripts/test-google.ts
import { calendar, CALENDAR_ID } from '../config/google.config'; // Asegúrate que esta ruta sea correcta
import dotenv from 'dotenv';

// Cargar variables de entorno por si acaso
dotenv.config();

async function createTestEvent() {
  console.log('📅 Intentando conectar con Google Calendar...');
  console.log('ID del Calendario:', CALENDAR_ID);

  const start = new Date();
  start.setHours(start.getHours() + 1); // Empieza en 1 hora
  
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 30); // Dura 30 mins

  try {
    const response = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: '🚀 PRUEBA DE SERVINEO (BACKEND)',
        description: 'Si estás leyendo esto, la integración OAuth funciona perfectamente.',
        start: {
          dateTime: start.toISOString(),
          timeZone: 'America/La_Paz', // O tu zona horaria local
        },
        end: {
          dateTime: end.toISOString(),
          timeZone: 'America/La_Paz',
        },
        colorId: '5', // 5 es amarillo, para que resalte
      },
    });

    console.log('✅ ¡ÉXITO! Evento creado.');
    console.log('🔗 Link al evento:', response.data.htmlLink);
    console.log('🆔 ID del evento:', response.data.id);
    
  } catch (error: any) {
    console.error('❌ ERROR al crear el evento:');
    console.error(error.message);
    
    if (error.response) {
        console.error('Detalles de Google:', error.response.data);
    }
  }
}

createTestEvent();