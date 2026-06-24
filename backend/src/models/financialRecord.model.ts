import mongoose, { Document, Schema } from 'mongoose';

export const FINANCIAL_RECORD_TYPES = [
  'subscription',
  'payment',
  'refund',
  'adjustment',
  'note',
] as const;

export type FinancialRecordType = (typeof FINANCIAL_RECORD_TYPES)[number];

export interface FinancialRecordDocument extends Document {
  tenantId: string;
  type: FinancialRecordType;
  amount: number;
  currency: string;
  status: string;
  description: string;
  referenceId?: string | null;
  externalReferenceId?: string | null;
  createdBy?: string | null;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
}

const FinancialRecordSchema = new Schema<FinancialRecordDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: FINANCIAL_RECORD_TYPES,
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true, default: 'USD' },
    status: { type: String, required: true, default: 'recorded' },
    description: { type: String, required: true },
    referenceId: { type: String, default: null },
    externalReferenceId: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    occurredAt: { type: Date, required: true, default: Date.now, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export default mongoose.model<FinancialRecordDocument>('FinancialRecord', FinancialRecordSchema);
