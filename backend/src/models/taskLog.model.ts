import mongoose, { Document, Schema, Types } from 'mongoose';

export interface TaskLogDocument extends Document {
  tenantId: string;
  taskId: Types.ObjectId;
  action: string;
  actorId: Types.ObjectId;
  metadata?: Record<string, unknown>;
}

const TaskLogSchema = new Schema<TaskLogDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true } as any,
    action: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true } as any,
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export default mongoose.model<TaskLogDocument>('TaskLog', TaskLogSchema);
