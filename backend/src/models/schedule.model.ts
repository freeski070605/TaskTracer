import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ScheduleDocument extends Document {
  tenantId: string;
  dutyId: Types.ObjectId;
  associateId: Types.ObjectId;
  startsAt: Date;
  endsAt: Date;
}

const ScheduleSchema = new Schema<ScheduleDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    dutyId: { type: Schema.Types.ObjectId, ref: 'Duty', required: true } as any,
    associateId: { type: Schema.Types.ObjectId, ref: 'User', required: true } as any,
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export default mongoose.model<ScheduleDocument>('Schedule', ScheduleSchema);
