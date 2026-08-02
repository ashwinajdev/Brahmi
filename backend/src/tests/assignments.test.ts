import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectDB } from '../db/mongoose.js';
import Worker from '../models/Worker.js';
import Work from '../models/Work.js';
import WorkAssignment from '../models/WorkAssignment.js';
import mongoose from 'mongoose';

describe('Assignment History and Soft-Deletion Logic', () => {
  let testWorkId: string;
  let testWorkerId: string;

  beforeAll(async () => {
    await connectDB();

    // Create temporary work and worker records
    const worker = new Worker({
      name: 'Test Worker QA',
      email: 'qa.test@brahmi.com',
      phone: '9999988888',
      role: 'Quality Inspector',
    });
    await worker.save();
    testWorkerId = worker._id.toString();

    const work = new Work({
      title: 'Test Work Item QA',
      description: 'Verify assignment history schema parameters',
      category: 'QA Testing',
      priority: 'low',
      status: 'pending',
      dueDate: new Date(),
    });
    await work.save();
    testWorkId = work._id.toString();
  });

  afterAll(async () => {
    // Cleanup test records
    await WorkAssignment.deleteMany({
      $or: [{ workId: testWorkId }, { workerId: testWorkerId }],
    });
    await Work.findByIdAndDelete(testWorkId);
    await Worker.findByIdAndDelete(testWorkerId);
    await mongoose.disconnect();
  });

  it('should create an active assignment and unassign it without deleting the record', async () => {
    // 1. Assign worker
    const assignment = new WorkAssignment({
      workId: testWorkId,
      workerId: testWorkerId,
      assignedAt: new Date(),
      unassignedAt: null,
    });
    await assignment.save();

    expect(assignment._id).toBeDefined();
    expect(assignment.unassignedAt).toBeNull();

    // Verify it counts as an active assignment
    const active = await WorkAssignment.findOne({
      workId: testWorkId,
      workerId: testWorkerId,
      unassignedAt: null,
    });
    expect(active).not.toBeNull();
    expect(active!._id.toString()).toBe(assignment._id.toString());

    // 2. Unassign worker (soft-delete by updating unassignedAt)
    const now = new Date();
    await WorkAssignment.findByIdAndUpdate(assignment._id, {
      unassignedAt: now,
    });

    // Verify active search returns nothing
    const activeAfter = await WorkAssignment.findOne({
      workId: testWorkId,
      workerId: testWorkerId,
      unassignedAt: null,
    });
    expect(activeAfter).toBeNull();

    // Verify historical record still exists in the database
    const dbRecord = await WorkAssignment.findById(assignment._id);
    expect(dbRecord).not.toBeNull();
    expect(dbRecord!.unassignedAt).not.toBeNull();
    expect(new Date(dbRecord!.unassignedAt!).getTime()).toBeGreaterThanOrEqual(now.getTime() - 1000);
  });
});
