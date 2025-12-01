// servineo-backend/src/Innosys/controllers/bankAccount.controller.ts

import { Request, Response } from 'express';
import mongoose from 'mongoose'; // Necesario para tus validaciones de ID
import { MongoServerError } from 'mongodb'; // Del General: Para mejor manejo de errores
import { BankAccount } from '../../models/bankAccount.model';
import User from '../../models/userPayment.model'; // Mantenemos TU ruta local

/**
 * @route POST /api/bank-accounts
 * @desc Registra una nueva cuenta bancaria para un Fixer y actualiza su estado a CCB.
 * @access Private
 */
export const createBankAccount = async (req: Request, res: Response) => {
  try {
    const {
      fixerId,
      nameFixer,
      identification,
      accountType,
      accountNumber,
      bankName,
    } = req.body;

    // Validación básica
    if (!fixerId || !accountNumber || !bankName) {
      return res.status(400).json({
        message: 'Faltan campos obligatorios (fixerId, accountNumber, bankName).',
        error: 'Missing required fields',
      });
    }

    // Validación de ObjectId (Mantenida de TU versión local por seguridad)
    if (!mongoose.Types.ObjectId.isValid(fixerId)) {
      return res.status(400).json({
        message: 'El formato del ID del fixer es inválido.',
        error: 'Invalid Fixer ID format',
      });
    }

    // Crear una nueva instancia de Cuenta Bancaria
    const newBankAccount = new BankAccount({
      fixerId,
      nameFixer,
      identification,
      accountType,
      accountNumber,
      bankName,
    });

    // Guardar en la base de datos
    await newBankAccount.save();

    // Actualizar estado del usuario
    await User.findOneAndUpdate(
      { _id: fixerId },
      { bank_status: 'CCB' }
    );

    // Respuesta exitosa
    res.status(201).json({
      message: 'Cuenta bancaria registrada exitosamente y estado de usuario actualizado a CCB.',
      data: newBankAccount.toJSON(),
    });

  } catch (error: unknown) {
    // MEJORA DEL GENERAL: Tipado estricto de errores
    if (error instanceof MongoServerError && error.code === 11000) {
      return res.status(409).json({
        message: 'El número de cuenta bancaria ya ha sido registrado.',
        error: 'Duplicate account number',
      });
    }

    console.error('Error al crear cuenta bancaria:', error);
    res.status(500).json({
      message: 'Error interno del servidor al registrar la cuenta bancaria.',
      error: (error as Error).message,
    });
  }
};

/**
 * @route DELETE /api/bank-accounts/:fixerId
 * @desc Elimina la cuenta bancaria de un Fixer y actualiza su estado a SCB.
 * @access Private
 */
export const deleteBankAccount = async (req: Request, res: Response) => {
  try {
    const { fixerId } = req.params;

    // Validación de ObjectId (Mantenida de TU versión local)
    if (!mongoose.Types.ObjectId.isValid(fixerId)) {
      return res.status(400).json({
        message: 'El formato del ID del fixer es inválido.',
        error: 'Invalid Fixer ID format',
      });
    }

    // 1. Busca y elimina la cuenta.
    const deletedAccount = await BankAccount.findOneAndDelete({ fixerId });

    if (!deletedAccount) {
      return res.status(404).json({ message: 'No se encontró la cuenta para eliminar.' });
    }

    // Actualizar el estado del usuario/fixer a SCB
    await User.findOneAndUpdate(
      { _id: fixerId },
      { bank_status: 'SCB' }
    );

    res.status(200).json({
      message: 'Cuenta bancaria eliminada exitosamente y estado de usuario actualizado a SCB.',
      deletedId: deletedAccount._id,
    });

  } catch (error: unknown) {
    console.error('Error al eliminar cuenta bancaria:', error);
    res.status(500).json({
      message: 'Error interno del servidor al eliminar la cuenta bancaria.',
      error: (error as Error).message,
    });
  }
};