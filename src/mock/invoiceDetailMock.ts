// backend/src/mock/invoiceDetailMock.ts (Backend)
// Define la interfaz de datos completa que tu controlador debe devolver (copia del frontend)

// Interfaz para los items dentro de la factura
export interface DetailItem {
    description: string;
    amount: number;
}

export interface InvoiceDetailData {
    id: string;
    requesterId: string;
    date: string;
    time: string;
    amount: number;
    currency: string;
    status: 'PAID' | 'PENDING' | 'CANCELLED';
    paymentMethod: string;
    jobId: string;
    jobAmount: number; 
    commission: number;
    items: DetailItem[]; // <--- CRÍTICO: Agregamos la lista de items
}

// Base de datos de Mocks de Detalle de Factura
const MOCK_DETAIL_DATA: InvoiceDetailData[] = [
    { 
        id: 'mock-0', 
        requesterId: 'USR-2024-001A', 
        date: '08/11/2025', 
        time: '17:30', 
        amount: 500.00, 
        currency: 'BS', 
        status: 'PAID', 
        paymentMethod: 'Tarjeta de Crédito',
        jobId: 'JOB-XYZ-001',
        jobAmount: 550.00, 
        commission: 50.00, 
        items: [ // <--- CRÍTICO: Agregamos items al mock
            { description: 'Monto del Servicio Principal', amount: 550.00 },
            { description: 'Descuento / Ajuste', amount: 0.00 },
            { description: 'Comisión del Sistema', amount: -50.00 },
        ]
    },
    { 
        id: 'mock-1', 
        requesterId: 'USR-2024-002B', 
        date: '08/11/2025', 
        time: '14:00', 
        amount: 56.10, 
        currency: 'BS', 
        status: 'PENDING', 
        paymentMethod: 'Transferencia Bancaria',
        jobId: 'JOB-XYZ-002',
        jobAmount: 60.00,
        commission: 3.90,
        items: [
            { description: 'Trabajo de Plomería', amount: 60.00 },
            { description: 'Comisión del Sistema', amount: -3.90 },
        ]
    },
    { 
        id: 'mock-2', 
        requesterId: 'USR-2024-003C', 
        date: '07/11/2025', 
        time: '10:00', 
        amount: 229.90, 
        currency: 'BS', 
        status: 'PAID', 
        paymentMethod: 'Efectivo',
        jobId: 'JOB-XYZ-003',
        jobAmount: 240.00,
        commission: 10.10,
        items: [
            { description: 'Mantenimiento Eléctrico', amount: 240.00 },
            { description: 'Comisión del Sistema', amount: -10.10 },
        ]
    },
];

/**
 * Simula la búsqueda de un detalle de factura por ID en el backend.
 * @param invoiceId El ID de la factura solicitada.
 * @returns InvoiceDetailData o null si no se encuentra.
 */
export function findInvoiceDetailById(invoiceId: string): InvoiceDetailData | null {
    const detail = MOCK_DETAIL_DATA.find(inv => inv.id === invoiceId);
    
    // Devuelve el objeto completo o null
    return detail || null;
}