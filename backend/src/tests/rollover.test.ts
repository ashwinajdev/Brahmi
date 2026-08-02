import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectDB } from '../db/mongoose.js';
import Work from '../models/Work.js';
import { autoUpdatePastWorks } from '../utils/workHelper.js';
import mongoose from 'mongoose';

describe('Auto Rollover of Past Uncompleted Tasks', () => {
  let testPastWorkId: string;
  let testCompletedPastWorkId: string;
  let testFutureWorkId: string;

  beforeAll(async () => {
    await connectDB();

    // 1. Create a past incomplete task (yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    const pastWork = new Work({
      title: 'Test Past Work (Incomplete)',
      description: 'Should be rolled over',
      category: 'Testing',
      priority: 'medium',
      status: 'pending',
      dueDate: yesterday,
    });
    await pastWork.save();
    testPastWorkId = pastWork._id.toString();

    // 2. Create a past completed task (yesterday)
    const completedPastWork = new Work({
      title: 'Test Past Work (Completed)',
      description: 'Should NOT be rolled over',
      category: 'Testing',
      priority: 'medium',
      status: 'completed',
      dueDate: yesterday,
    });
    await completedPastWork.save();
    testCompletedPastWorkId = completedPastWork._id.toString();

    // 3. Create a future incomplete task (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    const futureWork = new Work({
      title: 'Test Future Work',
      description: 'Should NOT be rolled over',
      category: 'Testing',
      priority: 'medium',
      status: 'pending',
      dueDate: tomorrow,
    });
    await futureWork.save();
    testFutureWorkId = futureWork._id.toString();
  });

  afterAll(async () => {
    // Clean up test records
    await Work.deleteMany({
      _id: { $in: [testPastWorkId, testCompletedPastWorkId, testFutureWorkId] },
    });
    await mongoose.disconnect();
  });

  it('should preserve past uncompleted tasks and not touch others (no db mutation)', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    // Call rollover function
    await autoUpdatePastWorks();

    // Verify past incomplete task remained at yesterday's date (no database mutation)
    const updatedPastWork = await Work.findById(testPastWorkId);
    expect(updatedPastWork?.dueDate.toISOString()).toBe(yesterday.toISOString());

    // Verify past completed task remained at yesterday's date
    const updatedCompletedPastWork = await Work.findById(testCompletedPastWorkId);
    expect(updatedCompletedPastWork?.dueDate.toISOString()).toBe(yesterday.toISOString());

    // Verify future task remained at tomorrow's date
    const updatedFutureWork = await Work.findById(testFutureWorkId);
    expect(updatedFutureWork?.dueDate.toISOString()).toBe(tomorrow.toISOString());
  });
});
