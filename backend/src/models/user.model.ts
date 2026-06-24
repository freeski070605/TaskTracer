import mongoose, { Document, Schema } from 'mongoose';
import { ROLES, Role } from '../utils/constants';

export interface UserDocument extends Document {
  tenantId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  refreshTokenHash?: string | null;
  isActive: boolean;
}

const UserSchema = new Schema<UserDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true, default: 'associate' },
    refreshTokenHash: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshTokenHash;
  return obj;
};

export default mongoose.model<UserDocument>('User', UserSchema);
