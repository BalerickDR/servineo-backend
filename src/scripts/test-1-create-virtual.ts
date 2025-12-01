import { sendMeetingInvite } from '../utils/googleCalendarHelper';
import * as dotenv from 'dotenv';

dotenv.config();

async function testVirtual() {
    console.log("🔵 TEST 1: Creando Cita VIRTUAL (10 Dic 2025 - 08:00 AM)...");

    // Fecha específica: 10 de Diciembre 2025, 08:00 AM
    // Nota: El mes es index 11 porque Enero es 0
    const start = new Date(2025, 11, 10, 8, 0, 0); 
    const end = new Date(2025, 11, 10, 9, 0, 0);   // 09:00 AM

    const result = await sendMeetingInvite({
        emails: ["valeyagami98@gmail.com"], // <--- Asegúrate que este sea tu correo
        title: "Servineo Cita: Adasd Adsdas",
        description: `
👤 Cliente: Adasd Adsdas
📱 Contacto: 78954124
📝 Problema: Necesito revisión virtual de la instalación
        `.trim(),
        start: start,
        end: end,
        isVirtual: true,
        customLink: "https://meet.google.com/gaa-rfwy-jkz", // Link simulado que viene del front
        locationName: "" // En virtual suele ir vacío o el link
    });

    if (result.success) {
        console.log("✅ Cita Virtual Creada!");
        console.log("🆔 ID DEL EVENTO (Cópialo para el update):", result.eventId);
        console.log("🔗 Ver en calendario:", result.htmlLink);
    } else {
        console.error("❌ Falló:", result.error);
    }
}

testVirtual();