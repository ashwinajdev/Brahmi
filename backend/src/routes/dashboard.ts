import { Router, Response } from 'express';
import prisma from '../db/prisma.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { autoUpdatePastWorks } from '../utils/workHelper.js';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Rollover past active tasks to today
    await autoUpdatePastWorks();

    // 1. Get total works by status
    const worksByStatus = await prisma.work.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    const statusCounts = {
      pending: 0,
      in_progress: 0,
      completed: 0,
    };

    worksByStatus.forEach((group) => {
      const status = group.status as keyof typeof statusCounts;
      if (statusCounts[status] !== undefined) {
        statusCounts[status] = group._count.id;
      }
    });

    const totalWorks = statusCounts.pending + statusCounts.in_progress + statusCounts.completed;

    // Today's works count
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todaysWorksCount = await prisma.work.count({
      where: {
        dueDate: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    // 2. Total active workers count
    const totalActiveWorkers = await prisma.worker.count({
      where: { isActive: true },
    });

    // 4. Unassigned works count (status != completed and no active assignments)
    // To do this, we can query works that have no active assignments.
    const unassignedWorks = await prisma.work.findMany({
      where: {
        status: { not: 'completed' },
        assignments: {
          none: {
            unassignedAt: null,
          },
        },
      },
    });

    // 5. Worker workload (active assignment count per worker)
    const activeWorkersWithWorkload = await prisma.worker.findMany({
      where: { isActive: true },
      include: {
        assignments: {
          where: { unassignedAt: null },
        },
      },
    });

    const workloadData = activeWorkersWithWorkload.map((w) => ({
      id: w.id,
      name: w.role, // role/skill tag helper placeholder
      role: w.role,
      avatarUrl: w.avatarUrl,
      activeAssignmentsCount: w.assignments.length,
    }));

    // Actually map user fields correctly
    const correctWorkloadData = activeWorkersWithWorkload.map((w) => ({
      id: w.id,
      name: w.name,
      role: w.role,
      avatarUrl: w.avatarUrl,
      activeAssignmentsCount: w.assignments.length,
    })).sort((a, b) => b.activeAssignmentsCount - a.activeAssignmentsCount);

    const assignedWorkersCount = correctWorkloadData.filter(w => w.activeAssignmentsCount > 0).length;

    res.json({
      totalWorks,
      todaysWorksCount,
      statusCounts,
      totalActiveWorkers,
      assignedWorkersCount,
      unassignedCount: unassignedWorks.length,
      unassignedWorks: unassignedWorks.map((w) => ({
        id: w.id,
        title: w.title,
        dueDate: w.dueDate,
        priority: w.priority,
        status: w.status,
      })),
      workload: correctWorkloadData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve dashboard stats' });
  }
});

export default router;
