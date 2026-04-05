import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  name?:      string;
  email?:     string;
  subject:    string;
  message:    string;
  type?:      string;
  orderId?:   string;
  userId?:    string;
  userEmail?: string;
  status:     'open' | 'resolved';
  source:     'contact' | 'admin-contact';
}

const MessageSchema = new Schema<IMessage>({
  name:      { type: String, trim: true },
  email:     { type: String, trim: true, lowercase: true },
  subject:   { type: String, required: true, trim: true },
  message:   { type: String, required: true },
  type:      { type: String, default: 'general' },
  orderId:   { type: String },
  userId:    { type: String },
  userEmail: { type: String },
  status:    { type: String, enum: ['open', 'resolved'], default: 'open' },
  source:    { type: String, enum: ['contact', 'admin-contact'], required: true },
}, { timestamps: true });

export const Message = mongoose.models.Message as mongoose.Model<IMessage>
  ?? mongoose.model<IMessage>('Message', MessageSchema);
