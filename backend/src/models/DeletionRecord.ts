import mongoose, { Schema, Document, Model } from 'mongoose';

export type DeletionRecordType = 'worker' | 'work';

export interface IDeletionRecord extends Document {
  type: DeletionRecordType;
  originalId: string;
  snapshot: Record<string, unknown>;
  deletedAt: Date;
}

const deletionRecordSchema = new Schema<IDeletionRecord>(
  {
    type: {
      type: String,
      enum: ['worker', 'work'],
      required: true,
      index: true,
    },
    originalId: {
      type: String,
      required: true,
    },
    snapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },
    deletedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { versionKey: false }
);

deletionRecordSchema.index({ type: 1, deletedAt: -1 });

const DeletionRecord: Model<IDeletionRecord> =
  mongoose.models.DeletionRecord || mongoose.model<IDeletionRecord>('DeletionRecord', deletionRecordSchema);

export default DeletionRecord;
