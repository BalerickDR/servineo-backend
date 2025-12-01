// controllers/get-fixer-earnings.controller.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import { Payment } from "../../models/payment.model";

/**
 * GET /api/fixer/earnings/:fixerId
 * Query params: 
 *   - fromDate: YYYY-MM-DD (opcional, default: hace 7 días)
 *   - toDate: YYYY-MM-DD (opcional, default: hoy)
 * 
 * Retorna las ganancias del fixer agrupadas por día
 */
export const getFixerEarnings = async (req: Request, res: Response) => {
  try {
    const { fixerId } = req.params;
    let { fromDate, toDate } = req.query;

    console.log("[getFixerEarnings] Params:", { fixerId, fromDate, toDate });

    // ===== VALIDACIONES =====
    if (!fixerId || !mongoose.isValidObjectId(fixerId)) {
      return res.status(400).json({ error: "fixerId inválido o faltante" });
    }

    // Si no vienen fechas, usar últimos 7 días por defecto
    if (!fromDate || !toDate) {
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6); // Últimos 7 días (incluyendo hoy)
      
      fromDate = weekAgo.toISOString().split('T')[0];
      toDate = today.toISOString().split('T')[0];
      
      console.log("[getFixerEarnings] Usando fechas por defecto:", { fromDate, toDate });
    }

    // Parsear fechas
    const from = new Date(fromDate as string);
    const to = new Date(toDate as string);

    // Validar que sean fechas válidas
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ error: "Fechas inválidas" });
    }

    // Ajustar las fechas para incluir el día completo
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    // Validar orden de fechas
    if (from > to) {
      return res.status(400).json({ 
        error: "La fecha inicial no puede ser posterior a la fecha final" 
      });
    }

    // Validar rango máximo de 7 días
    const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 7) {
      return res.status(400).json({ 
        error: "El rango de fechas no puede ser mayor a 7 días" 
      });
    }

    console.log("[getFixerEarnings] Rango de fechas:", { 
      from: from.toISOString(), 
      to: to.toISOString(),
      days: daysDiff 
    });

    // ===== BUSCAR PAGOS PAID (CASH Y CARD) =====
    // Usamos updatedAt porque es cuando se marcó como "paid"
    const paidPayments = await Payment.find({
      fixerId: new mongoose.Types.ObjectId(fixerId),
      status: "paid",
      updatedAt: {
        $gte: from,
        $lte: to,
      },
    }).select("amount.total paymentMethods updatedAt paidAt createdAt");

    console.log(`[getFixerEarnings] Pagos PAID encontrados: ${paidPayments.length}`);

    // Separar por tipo para estadísticas
    const cashPayments = paidPayments.filter(p => p.paymentMethods === "cash");
    const cardPayments = paidPayments.filter(p => p.paymentMethods === "card");

    console.log(`[getFixerEarnings] - Efectivo: ${cashPayments.length}`);
    console.log(`[getFixerEarnings] - Tarjeta: ${cardPayments.length}`);

    // ===== AGRUPAR POR DÍA =====
    const earningsByDay: { [key: string]: number } = {};

    // Función helper para formatear fecha a YYYY-MM-DD
    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0];
    };

    // Procesar todos los pagos PAID
    paidPayments.forEach((payment) => {
      // Usar updatedAt (cuando se marcó como paid) o paidAt como fallback
      const paymentDate = payment.paidAt || payment.updatedAt;
      const dateKey = formatDate(new Date(paymentDate));
      const amount = payment.amount?.total || 0;
      
      earningsByDay[dateKey] = (earningsByDay[dateKey] || 0) + amount;
    });

    // ===== FORMATEAR RESPUESTA =====
    // Convertir a array y ordenar por fecha
    const earningsArray = Object.entries(earningsByDay)
      .map(([date, total]) => ({
        date,
        total: Math.round(total * 100) / 100, // Redondear a 2 decimales
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calcular total general
    const totalEarnings = earningsArray.reduce((sum, item) => sum + item.total, 0);

    console.log("[getFixerEarnings] Ganancias agrupadas:", earningsArray);
    console.log("[getFixerEarnings] Total general:", totalEarnings);

    // ===== RESPUESTA =====
    return res.status(200).json({
      success: true,
      data: {
        fixerId,
        dateRange: {
          from: formatDate(from),
          to: formatDate(to),
        },
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        earningsByDay: earningsArray,
        stats: {
          totalPayments: paidPayments.length,
          cashPayments: cashPayments.length,
          cardPayments: cardPayments.length,
        },
      },
    });

  } catch (error: any) {
    console.error("[getFixerEarnings] Error:", error);
    return res.status(500).json({ 
      error: error?.message || "Error al obtener ganancias" 
    });
  }
};