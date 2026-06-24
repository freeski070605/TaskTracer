import mongoose, { Document, Schema } from 'mongoose';

export interface CompanyDocument extends Document {
  tenantId: string;
  slug: string;
  name: string;
  normalizedName: string;
  contactEmail: string;
  plan: string;
  isActive: boolean;
  squareCustomerId?: string | null;
}

const CompanySchema = new Schema<CompanyDocument>(
  {
    tenantId: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    normalizedName: { type: String, required: true, index: true },
    contactEmail: { type: String, required: true },
    plan: { type: String, required: true, default: 'starter' },
    isActive: { type: Boolean, default: true },
    squareCustomerId: { type: String, default: null },
  },
  { timestamps: true },
);

export default mongoose.model<CompanyDocument>('Company', CompanySchema);
