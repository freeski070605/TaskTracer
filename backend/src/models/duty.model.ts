import mongoose, { Document, Schema } from 'mongoose';

export interface DutyDocument extends Document {
  tenantId: string;
  name: string;
  description?: string;
  locationId?: string;
  requiresPhoto: boolean;
  requiresQr: boolean;
}

const DutySchema = new Schema<DutyDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    locationId: { type: String },
    requiresPhoto: { type: Boolean, default: false },
    requiresQr: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model<DutyDocument>('Duty', DutySchema);
