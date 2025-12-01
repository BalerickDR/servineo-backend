import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Payment } from '../../models/payment.model';
import { User } from '../../models/usersPayment.model';

// 1. Definimos la interfaz de lo que devuelve tu consulta .select()
interface PaymentDoc {
  _id: mongoose.Types.ObjectId;
  fixerId: mongoose.Types.ObjectId;
  status?: string;
  codeExpiresAt?: Date;
  currency?: string;
  createdAt?: Date;
  // Tu lógica maneja 'amount' como número O como objeto, así que lo tipamos así:
  amount?: number | { total?: number; currency?: string };
}

export async function getPaymentSummaryByFixerIdLab(req: Request, res: Response) {
  try {
    const { fixerId } = req.params;
    if (!mongoose.isValidObjectId(fixerId)) {
      return res.status(400).json({ error: 'fixerId inválido' });
    }

    // ... (Tu lógica de verificación de usuarios se mantiene igual) ...
    const existsInUsers = await User.findById(fixerId)
      .lean()
      .catch(() => null);
    const existsInUserPay = existsInUsers
      ? null
      : await User.findById(fixerId)
          .lean()
          .catch(() => null);

    if (!existsInUsers && !existsInUserPay) {
      return res.status(404).json({ error: 'fixer no encontrado (users/userpay)' });
    }

    const qs = (req.query?.status as string | undefined)?.toLowerCase();
    const allowed = new Set(['paid', 'pending', 'failed']);
    const statusQuery = qs && allowed.has(qs) ? { status: qs } : {};

    const docs = await Payment.find({
      fixerId: new mongoose.Types.ObjectId(fixerId),
      ...statusQuery,
    })
      .sort({ createdAt: -1 })
      .select({
        amount: 1,
        currency: 1,
        status: 1,
        codeExpiresAt: 1,
        _id: 1,
        fixerId: 1,
        createdAt: 1,
      })
      // 2. Aquí aplicamos la interfaz en lugar de 'unknown[]'
      .lean<PaymentDoc[]>();

    if (!docs || docs.length === 0) {
      return res.json({ data: [] });
    }

    const data = docs.map((doc) => {
      // TypeScript ya sabe que 'doc' tiene la forma de PaymentDoc
      const amt = doc.amount;

      // Lógica segura
      const total = typeof amt === 'number' ? amt : (amt?.total ?? 0);

      // Aquí también ajustamos el acceso para que TS no se queje
      const currencyFromAmount = typeof amt === 'object' && amt !== null ? amt.currency : undefined;
      const currency = currencyFromAmount ?? doc.currency ?? 'BOB';

      return {
        id: String(doc._id),
        total,
        currency,
        status: doc.status,
        codeExpiresAt: doc.codeExpiresAt ?? null,
      };
    });

    return res.json({ data });
  } catch (e: unknown) {
    return res
      .status(400)
      .json({ error: (e as Error).message || 'Error summary por fixerId (lab)' });
  }
}
