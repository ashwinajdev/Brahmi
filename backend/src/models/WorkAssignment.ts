import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWorkAssignment extends Document {
  _id: mongoose.Types.ObjectId;
  workId: mongoose.Types.ObjectId;
  workerId: mongoose.Types.ObjectId;
  assignedAt: Date;
  unassignedAt: Date | null;
  amount: number | null;
  shift: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const workAssignmentSchema = new Schema<IWorkAssignment>(
  {
    workId: {
      type: Schema.Types.ObjectId,
      ref: 'Work',
      required: true,
    },
    workerId: {
      type: Schema.Types.ObjectId,
      ref: 'Worker',
      required: true,
    },
    assignedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    unassignedAt: {
      type: Date,
      default: null,
    },
    amount: {
      type: Number,
      default: null,
    },
    shift: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookups by work / worker
workAssignmentSchema.index({ workId: 1 });
workAssignmentSchema.index({ workerId: 1 });
workAssignmentSchema.index({ workId: 1, unassignedAt: 1 });
workAssignmentSchema.index({ workerId: 1, unassignedAt: 1 });

const WorkAssignment: Model<IWorkAssignment> =
  mongoose.models.WorkAssignment ||
  mongoose.model<IWorkAssignment>('WorkAssignment', workAssignmentSchema);

export default WorkAssignment;
