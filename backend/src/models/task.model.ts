import mongoose, { Document, Schema, Types } from 'mongoose';

export interface TaskDocument extends Document {
  tenantId: string;
  dutyId: Types.ObjectId;
  associateId: Types.ObjectId;
  locationId?: string;
  status: 'assigned' | 'completed' | 'approved' | 'rejected';
  completedAt?: Date | null;
  proofPhoto?: string | null;
  notes?: string | null;
  supervisorApproval?: boolean | null;
}

const TaskSchema = new Schema<TaskDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    dutyId: { type: Schema.Types.ObjectId, ref: 'Duty', required: true } as any,
    associateId: { type: Schema.Types.ObjectId, ref: 'User', required: true } as any,
    locationId: { type: String },
    status: {
      type: String,
      enum: ['assigned', 'completed', 'approved', 'rejected'],
      default: 'assigned',
    },
    completedAt: { type: Date, default: null },
    proofPhoto: { type: String, default: null },
    notes: { type: String, default: null },
    supervisorApproval: { type: Boolean, default: null },
  },
  { timestamps: true },
);

export default mongoose.model<TaskDocument>('Task', TaskSchema);
