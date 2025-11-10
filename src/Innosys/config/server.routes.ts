// ============================================
// ARCHIVO: src/Innosys/routes/invoice.routes.ts
// Propósito: Definir solo las rutas específicas del módulo de facturas.
// ============================================

import { Router } from 'express';
// La ruta es relativa a routes/, por eso usamos ../controllers
import { getInvoiceDetail } from '../controllers/invoice.controller'; 

const router: Router = Router();

// Define la ruta específica: /invoices/:id
// NOTA: No lleva /api/v1/ aquí, solo el sufijo.
router.get('/invoices/:id', getInvoiceDetail);

export default router;