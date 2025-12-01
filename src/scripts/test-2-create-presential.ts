// Ejecuta con: npx ts-node src/scripts/test-2-create-presential.ts
import { sendMeetingInvite } from '../utils/googleCalendarHelper';
import * as dotenv from 'dotenv';

dotenv.config();

async function testPresential() {
    console.log("🟠 TEST 2: Creando Cita PRESENCIAL (10 Dic 2025 - 10:00 AM)...");

    // Fecha: 10 de Diciembre 2025, 10:00 AM
    // (Recuerda: Mes 11 es Diciembre)
    const start = new Date(2025, 11, 10, 10, 0, 0); 
    const end = new Date(2025, 11, 10, 11, 0, 0);

    const result = await sendMeetingInvite({
        emails: ["valeyagami98@gmail.com"], // <--- TU CORREO
        title: "Cita con Servineo",
        description: `
Cliente: Hugo Suarez
Contacto: 78765556
Descripcion: Necesito plomero urgente, fuga en cocina
        `.trim(),
        start: start,
        end: end,
        isVirtual: false, // <--- PRESENCIAL
        
        // Simulación de datos que llegan de tu Frontend:
        locationName: "Calle Luisa Ascui, Cochabamba",
        locationCoordinates: { 
            lat: "-17.415413", 
            lon: "-66.161453" 
        }
    });

    if (result.success) {
        console.log("✅ Cita Presencial Creada!");
        console.log("-----------------------------------");
        console.log("🆔 ID DEL EVENTO:", result.eventId);
        console.log("🔗 Link Calendario:", result.htmlLink);
        console.log("-----------------------------------");
        console.log("👉 IMPORTANTE: Copia el ID para el test de Update");
    } else {
        console.error("❌ Falló:", result.error);
    }
}

testPresential();