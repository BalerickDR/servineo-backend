import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

// Definir la interfaz de la respuesta de reCAPTCHA
interface RecaptchaResponse {
    success: boolean;
    challenge_ts?: string;
    hostname?: string;
    'error-codes'?: string[];
}

// 🟢 CORRECCIÓN CLAVE: Ahora busca 'RECAPTCHA_SECRET_KEY_MINE' (tu variable actual)
// También busca la estándar por si acaso, y usa .trim() para limpiar espacios.
const RECAPTCHA_SECRET_KEY = (process.env.RECAPTCHA_SECRET_KEY_MINE || process.env.RECAPTCHA_SECRET_KEY || '').trim();

export const verifyRecaptchaV2 = async (req: Request, res: Response, next: NextFunction) => {
    const recaptchaToken = req.body['g-recaptcha-response']; 

    // 1. Validar que llegue el token del frontend
    if (!recaptchaToken) {
        return res.status(400).json({ message: 'Error de seguridad: Falta el token CAPTCHA. Por favor, marca la casilla "No soy un robot".' });
    }
    
    // 2. Validar que tengamos la clave secreta configurada
    if (!RECAPTCHA_SECRET_KEY) {
        console.error('CRÍTICO: No se encontró RECAPTCHA_SECRET_KEY_MINE en el archivo .env');
        return res.status(500).json({ message: 'Error de configuración del servidor.' });
    }

    try {
        const verificationURL = 'https://www.google.com/recaptcha/api/siteverify';
        
        // 🟢 CORRECCIÓN DE FORMATO: Usamos URLSearchParams para evitar errores con caracteres especiales
        const params = new URLSearchParams();
        params.append('secret', RECAPTCHA_SECRET_KEY);
        params.append('response', recaptchaToken);
        
        // Hacemos la petición a Google
        const response = await axios.post<RecaptchaResponse>(
            verificationURL, 
            params,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        
        const data = response.data;
        
        // 3. Verificar si Google aprobó el token
        if (!data.success) {
            console.warn(`Bloqueando solicitud: Verificación CAPTCHA fallida. Clave usada: ...${RECAPTCHA_SECRET_KEY.slice(-5)}`, data['error-codes']);
            
            return res.status(403).json({ 
                message: 'Verificación CAPTCHA fallida. Inténtalo de nuevo.',
                errorCodes: data['error-codes']
            });
        }
        
        // Si todo está bien, pasamos al siguiente controlador
        next();

    } catch (error) {
        console.error('Error al verificar reCAPTCHA:', error);
        res.status(500).json({ message: 'Error en la verificación de seguridad externa.' });
    }
};