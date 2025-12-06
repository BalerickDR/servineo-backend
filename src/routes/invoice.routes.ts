// src/routes/invoice.routes.ts
import { Router } from 'express';
import { getInvoiceDetail, downloadInvoice } from '../controllers/invoice.controller';

const router = Router();

// Rutas de facturas
router.get('/:invoiceId', getInvoiceDetail);
router.post('/:invoiceId/download', downloadInvoice);

export default router;
