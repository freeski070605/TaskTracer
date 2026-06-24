import mongoose, { Document, Schema } from 'mongoose';

export interface LocationDocument extends Document {
  tenantId: string;
  name: string;
  qrCode: string;
}

const LocationSchema = new Schema<LocationDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    qrCode: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

export default mongoose.model<LocationDocument>('Location', LocationSchema);
