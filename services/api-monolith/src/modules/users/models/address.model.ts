import mongoose, { Document, Schema } from 'mongoose';

export interface IAddress extends Document {
  userId:       string;
  label:        string;
  fullName:     string;
  phone:        string;
  addressLine1: string;
  addressLine2?: string;
  city:         string;
  district:     string;
  province:     string;
  isDefault:    boolean;
}

const AddressSchema = new Schema<IAddress>({
  userId:       { type: String, required: true, index: true },
  label:        { type: String, default: 'Home' },
  fullName:     { type: String, required: true },
  phone:        { type: String, required: true },
  addressLine1: { type: String, required: true },
  addressLine2: { type: String },
  city:         { type: String, required: true },
  district:     { type: String, required: true },
  province:     { type: String, required: true },
  isDefault:    { type: Boolean, default: false },
}, { timestamps: true });

export const Address = mongoose.models.Address as mongoose.Model<IAddress>
  ?? mongoose.model<IAddress>('Address', AddressSchema);
