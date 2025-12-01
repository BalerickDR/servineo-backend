import { calendar, CALENDAR_ID } from '../config/google.config';

// 1. Interfaces (Tipado estricto)
interface EventParams {
    emails: string[];
    title: string;          
    description: string;    // Cliente telefono descripcion
    start: Date;
    end: Date;
    isVirtual: boolean;     
    customLink?: string;    
    locationName?: string;  
    locationCoordinates?: { lat: string, lon: string }; 
}

export interface CalendarResponse {
    success: boolean;
    eventId?: string | null;
    htmlLink?: string | null;
    error?: unknown;
}

// Estructura para Google API
interface GoogleEventBody {
    summary: string;
    description: string;
    location: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    attendees: { email: string }[];
}

//Hora (Bolivia)
const formatTime = (date: Date): string => {
    return date.toISOString().replace('Z', '');
};

// CREAR
export async function sendMeetingInvite(params: EventParams): Promise<CalendarResponse> {
    try {
        if (!calendar) return { success: false, error: "Calendar config missing" };

        let finalLocation = '';
        let finalDescription = params.description; // Empezamos con la descripción base

        if (params.isVirtual) {
            // Virtual: La ubicación es el Link
            finalLocation = params.customLink || '';
            finalDescription += `\n\nLink de Reunion: ${params.customLink}`;
        } else {
            finalLocation = params.locationName || '';
            if (params.locationCoordinates?.lat) {
                const mapLink = `https://www.google.com/maps/search/?api=1&query=${params.locationCoordinates.lat},${params.locationCoordinates.lon}`;
                finalDescription += `\n\nUbicacion GPS: ${mapLink}`;
            }
        }

        const eventBody: GoogleEventBody = {
            summary: params.title,
            description: finalDescription,
            location: finalLocation,
            start: { dateTime: formatTime(new Date(params.start)), timeZone: 'America/La_Paz' },
            end: { dateTime: formatTime(new Date(params.end)), timeZone: 'America/La_Paz' },
            attendees: params.emails.map(email => ({ email })), 
        };

        const response = await calendar.events.insert({
            calendarId: CALENDAR_ID,
            sendUpdates: 'all',
            requestBody: eventBody,
        });

        console.log(`Evento creado en Google. ID: ${response.data.id}`);

        return { 
            success: true, 
            eventId: response.data.id,
            htmlLink: response.data.htmlLink 
        };

    } catch (error) {
        console.error('Error en sendMeetingInvite:', error);
        return { success: false, error };
    }
}

// ACTUALIZAR
export async function updateMeetingInvite(eventId: string, params: EventParams): Promise<CalendarResponse> {
    try {
        if (!calendar) return { success: false, error: "Calendar config missing" };

        let finalLocation = '';
        let finalDescription = params.description;

        if (params.isVirtual) {
            finalLocation = params.customLink || '';
            finalDescription += `\n\nLink de Reunion: ${params.customLink}`;
        } else {
            finalLocation = params.locationName || '';
            if (params.locationCoordinates?.lat) {
                const mapLink = `https://www.google.com/maps/search/?api=1&query=${params.locationCoordinates.lat},${params.locationCoordinates.lon}`;
                finalDescription += `\n\nUbicacion GPS: ${mapLink}`;
            }
        }

        const eventBody: Partial<GoogleEventBody> = {
            summary: params.title,
            description: finalDescription,
            location: finalLocation,
            start: { dateTime: formatTime(new Date(params.start)), timeZone: 'America/La_Paz' },
            end: { dateTime: formatTime(new Date(params.end)), timeZone: 'America/La_Paz' },
        };

        await calendar.events.patch({
            calendarId: CALENDAR_ID,
            eventId: eventId,
            sendUpdates: 'all', // Notifica los cambios a los invitados
            requestBody: eventBody,
        });

        console.log(`Evento actualizado en Google: ${eventId}`);
        return { success: true };

    } catch (error) {
        console.error('Error en updateMeetingInvite:', error);
        return { success: false, error };
    }
}

// ELIMINAR 
export async function deleteMeetingEvent(eventId: string): Promise<CalendarResponse> {
    try {
        if (!calendar) return { success: false, error: "Calendar config missing" };

        await calendar.events.delete({
            calendarId: CALENDAR_ID,
            eventId: eventId,
            sendUpdates: 'all' 
        });

        console.log(`Evento eliminado de Google: ${eventId}`);
        return { success: true };

    } catch (error) {
        console.error('Error en deleteMeetingEvent:', error);
        return { success: false, error };
    }
}