// src/Innosys/controllers/invoice.controller.ts

import { Request, Response } from 'express';
import mongoose, { PipelineStage } from 'mongoose';

// Importación de tu modelo Invoice (que está mapeado a la colección 'payments')
import Invoice, { IInvoiceDocument } from '../models/invoice.model'; 

// --- IDs de Prueba para la seguridad ---
// Usamos el ID EXACTO que aparece en tu colección 'users' y 'payments'
const MOCK_FIXER_ID = "60a5e8c1d5f2a1b9c7d4e3f3"; 

// =========================================================
// FUNCIÓN 1: Listado de Facturas (getInvoicesList)
// =========================================================
export const getInvoicesList = async (req: Request, res: Response) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search, 
            startDate, 
            endDate, 
            fixerId 
        } = req.query;

        const currentPage = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (currentPage - 1) * limitNum;
        
        const FIXER_ID = fixerId as string || MOCK_FIXER_ID; 
        
        // El FixerId en la DB es string, no requiere validación de ObjectId, solo de existencia
        if (!FIXER_ID) {
            return res.status(400).json({ success: false, error: 'ID de Fixer requerido.' });
        }
        
        let matchQuery: any = {
            // 🟢 SOLUCIÓN FINAL: Usamos el ID de Fixer como string para que coincida con la DB
            fixerId: FIXER_ID, 
            status: { $in: ['paid', 'succeeded'] } 
        };

        // Lógica de Filtro por Fecha (no modificada)
        if (startDate || endDate) {
            matchQuery.paymentDate = {};
            if (startDate) {
                matchQuery.paymentDate.$gte = new Date(startDate as string);
            }
            if (endDate) {
                const end = new Date(endDate as string);
                end.setDate(end.getDate() + 1); 
                matchQuery.paymentDate.$lt = end;
            }
        }
        
        // --- AGGREGATION PIPELINE ---
        const pipeline: PipelineStage[] = [
            // A. Filtrado Inicial de Seguridad y Fechas
            { $match: matchQuery },
            
            // B. Lookup al Requester (asume que el _id en 'users' es ObjectId)
            {
                $lookup: {
                    from: 'users', 
                    localField: 'requesterId',
                    foreignField: '_id',
                    as: 'requesterDetails'
                }
            },
            { $unwind: { path: '$requesterDetails', preserveNullAndEmptyArrays: true } },

            // C. Lookup al Job (asume que el _id en 'jobs' es ObjectId)
            {
                $lookup: {
                    from: 'jobs', 
                    localField: 'jobId',
                    foreignField: '_id',
                    as: 'jobDetails'
                }
            },
            { $unwind: { path: '$jobDetails', preserveNullAndEmptyArrays: true } },

            // D. Búsqueda Flexible (Search) - No modificada
            ...((search) ? [{ 
                $match: {
                    $or: [
                        { '_id': { $regex: new RegExp(search as string, 'i') } },
                        { 'requesterDetails.name': { $regex: new RegExp(search as string, 'i') } },
                        { 'jobDetails.category': { $regex: new RegExp(search as string, 'i') } },
                        { 'jobDetails.title': { $regex: new RegExp(search as string, 'i') } },
                    ]
                }
            }] : []),

            // E. Proyección: Seleccionar y calcular los campos finales - No modificada
            {
                $project: {
                    _id: 1,
                    amount: 1,
                    commissionAmount: 1,
                    totalFinal: { $add: ["$amount", "$commissionAmount"] }, 
                    currency: 1,
                    status: 1,
                    paymentDate: 1,
                    method: '$type',
                    requesterName: '$requesterDetails.name', 
                    category: '$jobDetails.category', 
                    fixerId: 1, 
                    requesterId: 1,
                }
            },
            
            // F. Facet para Paginación y Metadata
            {
                $facet: {
                    metadata: [
                        { $count: "total" }, 
                        { $addFields: { 
                            page: currentPage, 
                            limit: limitNum, 
                            totalPages: { $ceil: { $divide: ["$total", limitNum] } } 
                        }}
                    ],
                    data: [
                        { $sort: { paymentDate: -1 } }, 
                        { $skip: skip }, 
                        { $limit: limitNum }
                    ]
                }
            }
        ];

        const [result] = await Invoice.aggregate(pipeline);

        const metadata = result.metadata[0] || { total: 0, page: currentPage, limit: limitNum, totalPages: 0 };
        const data = result.data;

        return res.json({ success: true, data, metadata });
    } catch (error) {
        console.error('Error fetching invoices list:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor al listar facturas.' });
    }
};


// =========================================================
// FUNCIÓN 2: Detalle de Factura (getInvoiceDetail)
// =========================================================
export const getInvoiceDetail = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const LOGGED_FIXER_ID = MOCK_FIXER_ID; 

        if (!mongoose.Types.ObjectId.isValid(id) || !LOGGED_FIXER_ID) {
            return res.status(400).json({ message: 'Parámetros inválidos o no autorizado.' });
        }
        
        const pipeline: PipelineStage[] = [
            // A. Match por ID de pago Y seguridad del Fixer
            { 
                $match: {
                    _id: new mongoose.Types.ObjectId(id), // El _id del documento SIEMPRE es ObjectId
                    // 🟢 SOLUCIÓN FINAL: Usamos el ID de Fixer como string
                    fixerId: LOGGED_FIXER_ID, 
                } 
            },
            
            // B, C, D, E - Los Lookups permanecen iguales
            {
                $lookup: {
                    from: 'users', 
                    localField: 'requesterId',
                    foreignField: '_id',
                    as: 'requesterDetails'
                }
            },
            { $unwind: { path: '$requesterDetails', preserveNullAndEmptyArrays: true } },
            
            {
                $lookup: {
                    from: 'users', 
                    localField: 'fixerId',
                    foreignField: '_id',
                    as: 'fixerDetails'
                }
            },
            { $unwind: { path: '$fixerDetails', preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: 'jobs', 
                    localField: 'jobId',
                    foreignField: '_id',
                    as: 'jobDetails'
                }
            },
            { $unwind: { path: '$jobDetails', preserveNullAndEmptyArrays: true } },

            {
                $project: {
                    _id: 1, amount: 1, commissionAmount: 1,
                    totalFinal: { $add: ["$amount", "$commissionAmount"] }, 
                    currency: 1, status: 1, paymentDate: 1, method: '$type', 
                    requesterName: '$requesterDetails.name', fixerName: '$fixerDetails.name', 
                    category: '$jobDetails.category', jobTitle: '$jobDetails.title', 
                    requesterId: 1, fixerId: 1, 
                }
            }
        ];

        const paymentDetail = await Invoice.aggregate(pipeline);
        const invoiceData = paymentDetail[0];

        if (!invoiceData) {
            return res.status(404).json({ success: false, message: 'Factura no encontrada o no te pertenece.' });
        }
        
        return res.status(200).json({ success: true, data: invoiceData });
    } catch (error) {
        console.error('Error interno al obtener el detalle de la factura:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};