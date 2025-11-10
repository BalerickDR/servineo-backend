// src/Innosys/routes/invoicelist.routes.ts

import { Router } from 'express';
// Importamos los dos controladores
import { getInvoicesList, getInvoiceDetail } from '../controllers/invoice.controller'; 

const router: Router = Router();

// 1. Ruta de Listado (GET /api/v1/invoices?...)
router.get('/', getInvoicesList);

// 2. Ruta de Detalle (GET /api/v1/invoices/:id)
router.get('/:id', getInvoiceDetail);

export default router;