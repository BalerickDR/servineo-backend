// src/Innosys/routes/invoice.routes.ts (VERIFICADO)

import { Router } from 'express';
// La ruta interna es correcta porque ya estamos dentro de Innosys
import { getInvoiceDetail } from '../controllers/invoice.controller'; 

const router: Router = Router();

// Define la ruta: GET /invoices/:id
router.get('/invoices/:id', getInvoiceDetail);

export default router;