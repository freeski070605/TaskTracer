import AuditLog from '../models/auditLog.model';
import TaskLog from '../models/taskLog.model';

const days = (count: number) => count * 24 * 60 * 60 * 1000;

export const cleanupJob = async () => {
  const auditCutoff = new Date(Date.now() - days(90));
  const taskCutoff = new Date(Date.now() - days(180));

  await AuditLog.deleteMany({ createdAt: { $lt: auditCutoff } });
  await TaskLog.deleteMany({ createdAt: { $lt: taskCutoff } });
};
