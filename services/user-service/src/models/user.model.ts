import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role: 'BUYER' | 'SELLER' | 'ADMIN' | 'DELIVERY';
  avatar?: string;
  referralCode: string;
  referredBy?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  refreshTokens: string[];
  wishlist: string[];
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  firstName:       { type: String, required: true, trim: true },
  lastName:        { type: String, required: true, trim: true },
  email:           { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:        { type: String, required: true, minlength: 6, select: false },
  phone:           { type: String, trim: true },
  role:            { type: String, enum: ['BUYER', 'SELLER', 'ADMIN', 'DELIVERY'], default: 'BUYER' },
  avatar:          { type: String },
  referralCode:    { type: String, unique: true },
  referredBy:      { type: String },
  isEmailVerified: { type: Boolean, default: false },
  isActive:        { type: Boolean, default: true },
  refreshTokens:   { type: [String], default: [], select: false },
  wishlist:        { type: [String], default: [] },
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.pre('save', function (next) {
  if (!this.referralCode) {
    this.referralCode = (this.firstName.toUpperCase().slice(0, 4) + Math.random().toString(36).slice(2, 8).toUpperCase());
  }
  next();
});

UserSchema.methods.comparePassword = async function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);
