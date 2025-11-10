// src/Innosys/routes/invoiceRoutes.ts
// src/Innosys/routes/invoiceRoutes.ts

import { Router } from 'express';
import { generateInvoicePDF, getInvoiceDetail, handleOptions } from '../controllers/invoiceController'; 

const router = Router();

// Middleware CORS
const setCorsHeaders = (req: any, res: any, next: any) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); 
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.status(204).send();
    }
    next();
};

// Aplicar middleware CORS
router.use(setCorsHeaders);

// 1. RUTA PRINCIPAL DE DETALLE (VISUALIZACIÓN JSON)
// Mapea a: /api/v1/invoices/:invoiceId
router.get('/:invoiceId', getInvoiceDetail);

// 2. RUTA DE DESCARGA (GENERACIÓN DE PDF)
// Mapea a: /api/v1/invoices/:invoiceId/pdf
router.post('/:invoiceId/pdf', generateInvoicePDF);

// La ruta OPTIONS (preflight)
router.options('/:invoiceId', handleOptions);

export default router;