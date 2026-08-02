import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWork extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: Date;
  location: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const workSchema = new Schema<IWork>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient filtering and sorting
workSchema.index({ dueDate: 1 });
workSchema.index({ status: 1 });
workSchema.index({ category: 1 });
workSchema.index({ priority: 1 });
workSchema.index({ status: 1, dueDate: 1 });

const Work: Model<IWork> =
  mongoose.models.Work || mongoose.model<IWork>('Work', workSchema);

export default Work;
