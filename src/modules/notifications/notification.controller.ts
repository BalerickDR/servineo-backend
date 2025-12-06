import { Response } from 'express';
import { Types } from 'mongoose';
import Notification from './notification.model';
import { AuthenticatedRequest } from '../../api/middleware/auth.middleware';
import { User } from '../../models/user.model';

type NotificationRecord = {
  _id: Types.ObjectId;
  appointment_id?: Types.ObjectId | string;
  users_id?: Types.ObjectId | string;
  notification_type?: string;
  message_content?: string;
  tipo?: string;
  estado?: string;
  creado?: Date | string;
  createdAt?: Date | string;
  siguiente?: string;
  ownerId?: string | null;
  owner?: Record<string, unknown> | null;
  [key: string]: any;
};

const FIXER_ROLE = 'fixer';
const DISCONNECTION_TYPE = 'desconexion 2 dias';

const PROMOTION_OFFER_TYPES = new Set([
  'oferta',
  'ofertas',
  'offer',
  'offers',
  'promocion',
  'promociones',
  'promotion',
  'promotions',
  'desconexion 2 dias',
]);

const USER_REFERENCE_FIELDS = [
  'users_id',
  'usersId',
  'user_id',
  'userId',
  'user',
  'usuario',
  'usuario_id',
  'usuarioId',
  'requester_id',
  'requesterId',
  'fixer_id',
  'fixerId',
  'owner_id',
  'ownerId',
  'cliente_id',
  'clienteId',
  'customer_id',
  'customerId',
  'provider_id',
  'providerId',
  'beneficiary_id',
  'beneficiaryId',
  'receiver_id',
  'receiverId',
  'recipient_id',
  'recipientId',
];

const normalizeIdentifier = (value?: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (value instanceof Types.ObjectId) {
    return value.toHexString();
  }

  const asString = String(value).trim();

  if (!asString || asString.toLowerCase() === 'null' || asString.toLowerCase() === 'undefined') {
    return null;
  }

  if (Types.ObjectId.isValid(asString)) {
    return new Types.ObjectId(asString).toHexString();
  }

  return asString;
};

const normalizeTipo = (tipo?: string | null): string => (typeof tipo === 'string' ? tipo.trim().toLowerCase() : '');

const getUserRole = async (userId?: string | null): Promise<string | null> => {
  if (!userId) {
    return null;
  }

  if (!Types.ObjectId.isValid(userId)) {
    return null;
  }

  const user = await User.findById(userId).select('role').lean<{ role?: string } | null>().exec();
  const role = typeof user?.role === 'string' ? user.role.trim().toLowerCase() : null;

  return role || null;
};

const resolveNotificationUserId = (
  notification: NotificationRecord,
  fallbackUserId?: string | null
): string | null => {
  const source = notification as Record<string, unknown>;

  for (const field of USER_REFERENCE_FIELDS) {
    const value = source[field];

    if (Array.isArray(value)) {
      const normalizedValues = value
        .map((entry) => normalizeIdentifier(entry))
        .filter(Boolean) as string[];

      if (fallbackUserId && normalizedValues.includes(fallbackUserId)) {
        return fallbackUserId;
      }

      if (normalizedValues.length > 0) {
        return normalizedValues[0];
      }
    } else {
      const normalized = normalizeIdentifier(value);
      if (normalized) {
        if (fallbackUserId && normalized === fallbackUserId) {
          return fallbackUserId;
        }
        return normalized;
      }
    }
  }

  return null;
};

const buildRecordKey = (notification: NotificationRecord, ownerId: string): string => {
  const appointmentKey = normalizeIdentifier(notification.appointment_id);
  if (appointmentKey) {
    return `appointment:${appointmentKey}`;
  }

  const jobKey = normalizeIdentifier((notification as Record<string, unknown>).job_id);
  if (jobKey) {
    return `job:${jobKey}`;
  }

  const relatedKey =
    normalizeIdentifier((notification as Record<string, unknown>).related_id) ||
    normalizeIdentifier((notification as Record<string, unknown>).registroId) ||
    normalizeIdentifier(notification.siguiente);

  if (relatedKey) {
    return `record:${relatedKey}`;
  }

  if (notification.tipo) {
    return `tipo:${normalizeTipo(notification.tipo)}:owner:${ownerId}`;
  }

  if (notification.message_content) {
    return `message:${ownerId}:${notification.message_content}`;
  }

  return `id:${notification._id.toString()}`;
};

const applyDeliveryRules = (notifications: NotificationRecord[], normalizedUserId: string): NotificationRecord[] => {
  const seenKeys = new Set<string>();
  const sanitized: NotificationRecord[] = [];

  for (const notification of notifications) {
    if (!notification) {
      continue;
    }

    const ownerId = resolveNotificationUserId(notification, null);

    if (!ownerId) {
      continue;
    }

    if (normalizedUserId && ownerId !== normalizedUserId) {
      continue;
    }

    const tipoLower = normalizeTipo(notification.tipo);
    const skipDedup = PROMOTION_OFFER_TYPES.has(tipoLower);
    const recordKey = buildRecordKey(notification, ownerId);

    if (!skipDedup) {
      if (seenKeys.has(recordKey)) {
        continue;
      }
      seenKeys.add(recordKey);
    }

    sanitized.push(notification);
  }

  return sanitized;
};

const filterNotificationsByRole = (
  notifications: NotificationRecord[],
  userRole?: string | null
): NotificationRecord[] => {
  if (!userRole || userRole !== FIXER_ROLE) {
    return notifications;
  }

  return notifications.filter((notification) => normalizeTipo(notification.tipo) !== DISCONNECTION_TYPE);
};

const OWNER_FIELD_PROJECTION = [
  'name',
  'email',
  'role',
  'telefono',
  'ubicacion',
  'ci',
  'servicios',
  'vehiculo',
  'acceptTerms',
  'metodoPago',
  'workLocation',
  'url_photo',
];

const buildOwnerSnapshotMap = async (
  notifications: NotificationRecord[]
): Promise<Map<string, Record<string, unknown>>> => {
  const ownerIds = Array.from(
    new Set(
      notifications
        .map((notification) => resolveNotificationUserId(notification, null))
        .filter((value): value is string => Boolean(value))
    )
  );

  if (!ownerIds.length) {
    return new Map();
  }

  const searchableIds = ownerIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));

  if (!searchableIds.length) {
    return new Map();
  }

  const owners = await User.find({ _id: { $in: searchableIds } })
    .select(OWNER_FIELD_PROJECTION.join(' '))
    .lean()
    .exec();

  const ownerMap = new Map<string, Record<string, unknown>>();

  for (const owner of owners) {
    if (!owner || !owner._id) {
      continue;
    }

    const normalizedOwnerId = normalizeIdentifier(owner._id as unknown);

    if (!normalizedOwnerId) {
      continue;
    }

    ownerMap.set(normalizedOwnerId, owner);
  }

  return ownerMap;
};

const enrichNotificationsWithOwner = async (
  notifications: NotificationRecord[]
): Promise<NotificationRecord[]> => {
  if (!notifications.length) {
    return notifications;
  }

  const ownerMap = await buildOwnerSnapshotMap(notifications);

  return notifications.map((notification) => {
    const ownerId = resolveNotificationUserId(notification, null);
    return {
      ...notification,
      ownerId,
      owner: ownerId ? ownerMap.get(ownerId) ?? null : null,
    };
  });
};

const buildUserFilter = (userId?: string | null) => {
  if (!userId) {
    return null;
  }

  const normalizedId = userId.trim();

  if (!normalizedId) {
    return null;
  }

  const filters: Array<Record<string, unknown>> = [
    {
      $expr: {
        $eq: [
          {
            $cond: [
              { $eq: [{ $type: '$users_id' }, 'objectId'] },
              { $toString: '$users_id' },
              '$users_id',
            ],
          },
          normalizedId,
        ],
      },
    },
  ];

  if (Types.ObjectId.isValid(normalizedId)) {
    filters.unshift({ users_id: new Types.ObjectId(normalizedId) });
  }

  return filters.length === 1 ? filters[0] : { $or: filters };
};

const buildAppointmentFilter = (appointmentId?: string | null) => {
  if (!appointmentId) {
    return null;
  }

  const normalizedId = appointmentId.trim();

  if (!normalizedId) {
    return null;
  }

  if (!Types.ObjectId.isValid(normalizedId)) {
    return null;
  }

  return { appointment_id: new Types.ObjectId(normalizedId) };
};

/**
 * Obtiene todas las notificaciones
 */
export async function getAllNotificationsController(
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> {
  try {
    const normalizedUserId = normalizeIdentifier(req.userId);
    const userFilter = buildUserFilter(normalizedUserId);
    const userRolePromise = getUserRole(normalizedUserId);
    const appointmentParam =
      (req.query?.appointmentId as string) ||
      (req.query?.appointment_id as string) ||
      (req.query?.appointment as string) ||
      null;
    const appointmentFilter = buildAppointmentFilter(appointmentParam);

    if (!normalizedUserId || !userFilter) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    const filters: Array<Record<string, unknown>> = [userFilter];
    if (appointmentFilter) {
      filters.push(appointmentFilter);
    }

    const queryFilter = filters.length === 1 ? filters[0] : { $and: filters };

    const notificationsPromise = Notification.find(queryFilter)
      .sort({ creado: -1, createdAt: -1 })
      .lean<NotificationRecord[]>();

    const [notifications, userRole] = await Promise.all([notificationsPromise, userRolePromise]);

    const sanitizedNotifications = applyDeliveryRules(notifications, normalizedUserId);
    const roleFilteredNotifications = filterNotificationsByRole(sanitizedNotifications, userRole);
    const enrichedNotifications = await enrichNotificationsWithOwner(roleFilteredNotifications);

    return res.status(200).json(enrichedNotifications);
  } catch (error: any) {
    console.error('Error al obtener notificaciones:', error);
    return res.status(500).json({
      message: 'Error al obtener notificaciones',
      error: error.message,
    });
  }
}

/**
 * Obtiene notificaciones por su tipo
 */
export async function getNotificationsByTypeController(
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> {
  try {
    const { notification_type } = req.params;
    const normalizedUserId = normalizeIdentifier(req.userId);
    const userFilter = buildUserFilter(normalizedUserId);
    const userRolePromise = getUserRole(normalizedUserId);
    const appointmentParam =
      (req.query?.appointmentId as string) ||
      (req.query?.appointment_id as string) ||
      (req.query?.appointment as string) ||
      null;
    const appointmentFilter = buildAppointmentFilter(appointmentParam);

    if (!normalizedUserId || !userFilter) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    const filters: Array<Record<string, unknown>> = [userFilter, { notification_type }];
    if (appointmentFilter) {
      filters.push(appointmentFilter);
    }

    const queryFilter = filters.length === 1 ? filters[0] : { $and: filters };

    const notificationsPromise = Notification.find(queryFilter)
      .sort({
        creado: -1,
        createdAt: -1,
      })
      .lean<NotificationRecord[]>();

    const [notifications, userRole] = await Promise.all([notificationsPromise, userRolePromise]);

    const sanitizedNotifications = applyDeliveryRules(notifications, normalizedUserId);
    const roleFilteredNotifications = filterNotificationsByRole(sanitizedNotifications, userRole);
    const enrichedNotifications = await enrichNotificationsWithOwner(roleFilteredNotifications);

    if (enrichedNotifications.length === 0) {
      return res.status(404).json({
        message: `No se encontraron notificaciones del tipo '${notification_type}'.`,
      });
    }

    return res.status(200).json(enrichedNotifications);
  } catch (error: any) {
    console.error('Error al obtener notificaciones por tipo:', error);
    return res.status(500).json({
      message: 'Error al obtener notificaciones por tipo',
      error: error.message,
    });
  }
}

/**
 * Marca una notificación como leída
 */
export async function markNotificationAsReadController(
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> {
  try {
    const { id } = req.params;
    const normalizedUserId = normalizeIdentifier(req.userId);
    const userFilter = buildUserFilter(normalizedUserId);

    if (!normalizedUserId || !userFilter) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Identificador inválido' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, ...userFilter },
      { leido: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notificación no encontrada' });
    }

    return res.status(200).json(notification);
  } catch (error: any) {
    console.error('Error al marcar la notificación como leída:', error);
    return res.status(500).json({
      message: 'Error al marcar la notificación como leída',
      error: error.message,
    });
  }
}
