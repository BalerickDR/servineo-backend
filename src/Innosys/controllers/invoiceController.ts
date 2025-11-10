// src/Innosys/controllers/invoiceController.ts
// src/Innosys/controllers/invoiceController.ts

import { Request, Response } from 'express';
import PDFDocument from 'pdfkit'; 
// IMPORTANTE: Asegúrate de que esta ruta sea correcta para tu mock
import { findInvoiceDetailById } from '../../mock/invoiceDetailMock'; 

// ----------------------------------------------------------------------
// 1. FUNCIÓN DE VISUALIZACIÓN DE DETALLE (GET /api/v1/invoices/:id)
// ----------------------------------------------------------------------
export const getInvoiceDetail = (req: Request, res: Response) => {
    const { invoiceId } = req.params;

    // Llama a la función de búsqueda que devuelve la estructura InvoiceDetailData
    const invoiceDetail = findInvoiceDetailById(invoiceId);

    if (invoiceDetail) {
        // Devuelve los datos JSON esperados por el frontend
        res.status(200).json(invoiceDetail); 
    } else {
        // Factura no encontrada
        res.status(404).json({ message: "Factura no encontrada." }); 
    }
};


// ----------------------------------------------------------------------
// 2. FUNCIÓN DE DESCARGA DE PDF (POST /api/v1/invoices/:id/pdf)
// ----------------------------------------------------------------------
export const generateInvoicePDF = async (req: Request, res: Response) => {
    // Código para generar el PDF y devolver Base64
    const invoiceId = req.params.invoiceId;
    
    const pdfBuffer: Buffer = await new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50, });
        let pdfData: any[] = [];
        
        doc.on('data', (chunk) => { pdfData.push(chunk); });
        doc.on('end', () => { resolve(Buffer.concat(pdfData)); });
        doc.on('error', (err) => { reject(err); });

        // --- Contenido de Simulación del PDF ---
        doc.fontSize(20); 
        doc.text('Comprobante de Pago Electrónico', { align: 'center' });
        doc.moveDown();
        
        doc.fontSize(12)
            .font('Helvetica-Bold') 
            .text(`ID de Factura: ${invoiceId}`);
        
        doc.font('Helvetica'); 
        doc.moveDown(); 

        doc.text('Monto Total: 985.00 Bs.');
        doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`); 
        
        doc.moveDown(2); 
        doc.text('Este documento es una prueba para validar la codificación Base64.', { align: 'justify' });
        // --- Fin del Contenido ---

        doc.end(); 
    });

    try {
        const pdfBase64 = pdfBuffer.toString('base64');
        const filename = `comprobante_${invoiceId}.pdf`;

        res.json({
            status: 'success',
            message: 'PDF generado y codificado en Base64.',
            base64Pdf: pdfBase64,
            filename: filename,   
        });

    } catch (error) {
        console.error('Error en generateInvoicePDF:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Fallo interno del servidor al procesar el PDF.' 
        });
    }
};

// ----------------------------------------------------------------------
export const handleOptions = (req: Request, res: Response) => {
    res.status(204).send();
};