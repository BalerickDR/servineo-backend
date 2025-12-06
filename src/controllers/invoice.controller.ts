// src/controllers/invoice.controller.ts
import { Request, Response } from 'express';
import Invoice from '../models/Invoice';

// Obtener detalle de factura
export const getInvoiceDetail = async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }

    return res.status(200).json({
      message: "Factura encontrada",
      data: invoice
    });
  } catch (err) {
    return res.status(500).json({ message: "Error interno", error: err });
  }
};

// Marcar factura como descargada (descarga única)
export const downloadInvoice = async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }

    if (invoice.descargado) {
      return res.status(403).json({
        message: "Descarga única ya realizada"
      });
    }

    invoice.descargado = true;
    invoice.ultimaDescarga = new Date();
    await invoice.save();

    return res.status(200).json({
      message: "Marcado como descargado correctamente",
      data: invoice
    });
  } catch (err) {
    return res.status(500).json({ message: "Error interno", error: err });
  }
};
