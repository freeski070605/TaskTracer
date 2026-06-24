import AuditLog from '../models/auditLog.model';

export const audit = async (
  tenantId: string,
  action: string,
  actorId?: string,
  metadata?: Record<string, unknown>,
) => {
  await AuditLog.create({ tenantId, action, actorId: actorId ?? null, metadata });
};
