import { Router, Response } from 'express';
import Work from '../models/Work.js';
import Worker from '../models/Worker.js';
import WorkAssignment from '../models/WorkAssignment.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { autoUpdatePastWorks } from '../utils/workHelper.js';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Rollover past active tasks to today
    await autoUpdatePastWorks();

    // Today's date bounds
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // 1. Get total works by status using MongoDB $group aggregation
    const worksByStatus = await Work.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statusCounts = {
      pending: 0,
      in_progress: 0,
      completed: 0,
    };

    worksByStatus.forEach((group) => {
      const status = group._id as keyof typeof statusCounts;
      if (statusCounts[status] !== undefined) {
        statusCounts[status] = group.count;
      }
    });

    const totalWorks = statusCounts.pending + statusCounts.in_progress + statusCounts.completed;

    // 2. Today's works count
    const todaysWorksCount = await Work.countDocuments({
      dueDate: { $gte: startOfToday, $lte: endOfToday },
    });

    // 3. Total active workers count
    const totalActiveWorkers = await Worker.countDocuments({ isActive: true });

    // 4. Unassigned works due TODAY (status != completed and no active assignments)
    const todayIncompleteWorks = await Work.find({
      status: { $ne: 'completed' },
      dueDate: { $gte: startOfToday, $lte: endOfToday },
    }).lean();

    let unassignedWorks: any[] = [];

    if (todayIncompleteWorks.length > 0) {
      const workIds = todayIncompleteWorks.map((w) => w._id);
      const activeAssignments = await WorkAssignment.find({
        workId: { $in: workIds },
        unassignedAt: null,
      }).distinct('workId');

      const assignedWorkIdSet = new Set(activeAssignments.map((id) => id.toString()));
      unassignedWorks = todayIncompleteWorks
        .filter((w) => !assignedWorkIdSet.has(w._id.toString()))
        .map((w) => ({
          id: w._id.toString(),
          title: w.title,
          dueDate: w.dueDate,
          priority: w.priority,
          status: w.status,
        }));
    }

    // 5. Worker workload – only count active assignments for works due TODAY
    const todayAssignments = await WorkAssignment.find({ unassignedAt: null })
      .populate({
        path: 'workId',
        match: { dueDate: { $gte: startOfToday, $lte: endOfToday } },
      })
      .populate('workerId', 'name role avatarUrl isActive')
      .lean();

    // Build workload map: only workers with at least one valid today-assignment
    const workloadByWorker: Record<string, { id: string; name: string; role: string; avatarUrl: string | null; activeAssignmentsCount: number }> = {};

    for (const a of todayAssignments as any[]) {
      // Skip assignments whose populated work didn't match the dueDate filter
      if (!a.workId) continue;

      const worker = a.workerId;
      if (!worker || !worker.isActive) continue;

      const wId = worker._id.toString();
      if (!workloadByWorker[wId]) {
        workloadByWorker[wId] = {
          id: wId,
          name: worker.name,
          role: worker.role,
          avatarUrl: worker.avatarUrl,
          activeAssignmentsCount: 0,
        };
      }
      workloadByWorker[wId].activeAssignmentsCount++;
    }

    const workload = Object.values(workloadByWorker).sort(
      (a, b) => b.activeAssignmentsCount - a.activeAssignmentsCount
    );

    const assignedWorkersCount = workload.length;

    res.json({
      totalWorks,
      todaysWorksCount,
      statusCounts,
      totalActiveWorkers,
      assignedWorkersCount,
      unassignedCount: unassignedWorks.length,
      unassignedWorks,
      workload,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve dashboard stats' });
  }
});

export default router;
