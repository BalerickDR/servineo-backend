import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { JWT_SECRET } from '../../config/env.config';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

const UNAUTHORIZED_RESPONSE = { success: false, message: 'No autorizado' };

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Response | void {
  try {
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json(UNAUTHORIZED_RESPONSE);
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json(UNAUTHORIZED_RESPONSE);
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload | string;

    const userId = typeof decoded === 'string' ? decoded : decoded.sub || decoded.userId || decoded.id;

    if (!userId) {
      return res.status(401).json(UNAUTHORIZED_RESPONSE);
    }

    req.userId = Array.isArray(userId) ? userId[0] : String(userId);

    return next();
  } catch (error) {
    console.error('[AUTH MIDDLEWARE] Error verificando token', error);
    return res.status(401).json(UNAUTHORIZED_RESPONSE);
  }
}
