import { updateMeetingInvite } from '../utils/googleCalendarHelper';
import * as dotenv from 'dotenv';

dotenv.config();

// IDs QUE OBTUVISTE EN TU PRUEBA ANTERIOR
const ID_CITA_VIRTUAL = "02o20u8d7qhfdj4nqaaeo33gko";
const ID_CITA_PRESENCIAL = "ap1l6pm7ln4gotrvo9u03nlvoo";

async function testUpdates() {
    console.log("TEST 3: Ejecutando actualizaciones...");

    // 1. EDITAR LA VIRTUAL (Cambiamos a Zoom)
    console.log("Actualizando Cita Virtual...");
    await updateMeetingInvite(ID_CITA_VIRTUAL, {
        emails: ["valeyagami98@gmail.com"],
        title: "Cita con Servineo (EDITADO)", 
        description: `
Cliente: Juan
Contacto: 78954124
Descripcion: El cliente pidio cambiar de plataforma a Zoom.
        `.trim(),
        start: new Date(2025, 11, 10, 8, 0, 0),
        end: new Date(2025, 11, 10, 9, 0, 0),
        isVirtual: true,
        customLink: "https://zoom.us/j/123456789" // Nuevo link
    });

    // 2. EDITAR LA PRESENCIAL (Corregimos ubicación)
    console.log("Actualizando Cita Presencial...");
    await updateMeetingInvite(ID_CITA_PRESENCIAL, {
        emails: ["valeyagami98@gmail.com"],
        title: "Cita con Servineo (UBICACION CORREGIDA)",
        description: `
Cliente: Juan
Contacto: 78765556
Descripcion: Direccion corregida, casa de al lado.
        `.trim(),
        start: new Date(2025, 11, 10, 10, 0, 0),
        end: new Date(2025, 11, 10, 11, 0, 0),
        isVirtual: false,
        locationName: "Calle Luisa Ascui #555 (Corregido)",
        locationCoordinates: { 
            lat: "-17.389302", // Coordenadas ligeramente diferentes
            lon: "-66.159925" 
        }
    });
}

testUpdates();