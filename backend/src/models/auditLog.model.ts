import mongoose, { Document, Schema } from 'mongoose';

export interface AuditLogDocument extends Document {
  tenantId: string;
  action: string;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export default mongoose.model<AuditLogDocument>('AuditLog', AuditLogSchema);
