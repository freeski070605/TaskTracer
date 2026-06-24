import mongoose, { Document, Schema, Types } from 'mongoose';

export interface NotificationDocument extends Document {
  tenantId: string;
  userId: Types.ObjectId;
  message: string;
  readAt?: Date | null;
}

const NotificationSchema = new Schema<NotificationDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true } as any,
    message: { type: String, required: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model<NotificationDocument>('Notification', NotificationSchema);
