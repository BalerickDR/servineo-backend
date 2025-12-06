import { Router } from 'express';
import * as NotificationController from './notification.controller';
import { requireAuth } from '../../api/middleware/auth.middleware';

const router = Router();

// GET /api/notifications - Obtiene todas las notificaciones
router.get('/', requireAuth, NotificationController.getAllNotificationsController);

// GET /api/notifications/tipo/:tipo - Obtiene notificaciones por tipo
router.get(
  '/tipo/:notification_type',
  requireAuth,
  NotificationController.getNotificationsByTypeController
);

// PATCH /api/notifications/:id/leido - Marca una notificación como leída
router.patch(
  '/:id/leido',
  requireAuth,
  NotificationController.markNotificationAsReadController
);

export default router;
