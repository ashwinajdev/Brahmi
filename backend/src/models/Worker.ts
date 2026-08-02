import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWorker extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  alternatePhone: string | null;
  email: string;
  role: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const workerSchema = new Schema<IWorker>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    alternatePhone: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for default sort by name
workerSchema.index({ name: 1 });

const Worker: Model<IWorker> =
  mongoose.models.Worker || mongoose.model<IWorker>('Worker', workerSchema);

export default Worker;
