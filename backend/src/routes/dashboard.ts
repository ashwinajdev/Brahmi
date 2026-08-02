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
    const todayAssignments = await WorkAssignment.aggregate([
      { $match: { unassignedAt: null } },
      {
        $lookup: {
          from: 'works',
          localField: 'workId',
          foreignField: '_id',
          as: 'work',
        },
      },
      { $unwind: '$work' },
      {
        $match: {
          'work.dueDate': { $gte: startOfToday, $lte: endOfToday },
        },
      },
      {
        $lookup: {
          from: 'workers',
          localField: 'workerId',
          foreignField: '_id',
          as: 'worker',
        },
      },
      { $unwind: '$worker' },
      {
        $match: { 'worker.isActive': true },
      },
      {
        $group: {
          _id: '$worker._id',
          name: { $first: '$worker.name' },
          role: { $first: '$worker.role' },
          avatarUrl: { $first: '$worker.avatarUrl' },
          activeAssignmentsCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          id: { $toString: '$_id' },
          name: 1,
          role: 1,
          avatarUrl: 1,
          activeAssignmentsCount: 1,
        },
      },
      { $sort: { activeAssignmentsCount: -1 } },
    ]);

    const workload = todayAssignments as any[];
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
