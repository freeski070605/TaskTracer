import mongoose, { Document, Schema } from 'mongoose';

export interface SubscriptionDocument extends Document {
  tenantId: string;
  squareCustomerId: string;
  squareSubscriptionId: string;
  status: string;
  plan: string;
}

const SubscriptionSchema = new Schema<SubscriptionDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    squareCustomerId: { type: String, required: true },
    squareSubscriptionId: { type: String, required: true },
    status: { type: String, required: true },
    plan: { type: String, required: true },
  },
  { timestamps: true },
);

export default mongoose.model<SubscriptionDocument>('Subscription', SubscriptionSchema);
