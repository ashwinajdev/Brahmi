import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../db/prisma.js';
import { autoUpdatePastWorks } from '../utils/workHelper.js';

describe('Auto Rollover of Past Uncompleted Tasks', () => {
  let testPastWorkId: string;
  let testCompletedPastWorkId: string;
  let testFutureWorkId: string;

  beforeAll(async () => {
    // 1. Create a past incomplete task (yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    const pastWork = await prisma.work.create({
      data: {
        title: 'Test Past Work (Incomplete)',
        description: 'Should be rolled over',
        category: 'Testing',
        priority: 'medium',
        status: 'pending',
        dueDate: yesterday,
      },
    });
    testPastWorkId = pastWork.id;

    // 2. Create a past completed task (yesterday)
    const completedPastWork = await prisma.work.create({
      data: {
        title: 'Test Past Work (Completed)',
        description: 'Should NOT be rolled over',
        category: 'Testing',
        priority: 'medium',
        status: 'completed',
        dueDate: yesterday,
      },
    });
    testCompletedPastWorkId = completedPastWork.id;

    // 3. Create a future incomplete task (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    const futureWork = await prisma.work.create({
      data: {
        title: 'Test Future Work',
        description: 'Should NOT be rolled over',
        category: 'Testing',
        priority: 'medium',
        status: 'pending',
        dueDate: tomorrow,
      },
    });
    testFutureWorkId = futureWork.id;
  });

  afterAll(async () => {
    // Clean up test records
    await prisma.work.deleteMany({
      where: {
        id: {
          in: [testPastWorkId, testCompletedPastWorkId, testFutureWorkId],
        },
      },
    });
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
    const updatedPastWork = await prisma.work.findUnique({
      where: { id: testPastWorkId },
    });
    expect(updatedPastWork?.dueDate.toISOString()).toBe(yesterday.toISOString());

    // Verify past completed task remained at yesterday's date
    const updatedCompletedPastWork = await prisma.work.findUnique({
      where: { id: testCompletedPastWorkId },
    });
    expect(updatedCompletedPastWork?.dueDate.toISOString()).toBe(yesterday.toISOString());

    // Verify future task remained at tomorrow's date
    const updatedFutureWork = await prisma.work.findUnique({
      where: { id: testFutureWorkId },
    });
    expect(updatedFutureWork?.dueDate.toISOString()).toBe(tomorrow.toISOString());
  });
});
