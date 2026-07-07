import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../db/prisma.js';

describe('Assignment History and Soft-Deletion Logic', () => {
  let testWorkId: string;
  let testWorkerId: string;

  beforeAll(async () => {
    // Create temporary work and worker records
    const worker = await prisma.worker.create({
      data: {
        name: 'Test Worker QA',
        email: 'qa.test@brahmi.com',
        phone: '+91 99999 88888',
        role: 'Quality Inspector',
      },
    });
    testWorkerId = worker.id;

    const work = await prisma.work.create({
      data: {
        title: 'Test Work Item QA',
        description: 'Verify assignment history schema parameters',
        category: 'QA Testing',
        priority: 'low',
        status: 'pending',
        dueDate: new Date(),
      },
    });
    testWorkId = work.id;
  });

  afterAll(async () => {
    // Cleanup test records
    await prisma.workAssignment.deleteMany({
      where: {
        OR: [
          { workId: testWorkId },
          { workerId: testWorkerId }
        ],
      },
    });
    await prisma.work.delete({ where: { id: testWorkId } });
    await prisma.worker.delete({ where: { id: testWorkerId } });
  });

  it('should create an active assignment and unassign it without deleting the record', async () => {
    // 1. Assign worker
    const assignment = await prisma.workAssignment.create({
      data: {
        workId: testWorkId,
        workerId: testWorkerId,
        assignedAt: new Date(),
        unassignedAt: null,
      },
    });

    expect(assignment.id).toBeDefined();
    expect(assignment.unassignedAt).toBeNull();

    // Verify it counts as an active assignment
    const active = await prisma.workAssignment.findFirst({
      where: { workId: testWorkId, workerId: testWorkerId, unassignedAt: null },
    });
    expect(active).not.toBeNull();
    expect(active!.id).toBe(assignment.id);

    // 2. Unassign worker (soft-delete by updating unassignedAt)
    const now = new Date();
    await prisma.workAssignment.update({
      where: { id: assignment.id },
      data: {
        unassignedAt: now,
      },
    });

    // Verify active search returns nothing
    const activeAfter = await prisma.workAssignment.findFirst({
      where: { workId: testWorkId, workerId: testWorkerId, unassignedAt: null },
    });
    expect(activeAfter).toBeNull();

    // Verify historical record still exists in the database
    const dbRecord = await prisma.workAssignment.findUnique({
      where: { id: assignment.id },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord!.unassignedAt).not.toBeNull();
    expect(new Date(dbRecord!.unassignedAt!).getTime()).toBeGreaterThanOrEqual(now.getTime() - 1000);
  });
});
