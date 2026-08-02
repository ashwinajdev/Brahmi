import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import Work from '../models/Work.js';
import WorkAssignment from '../models/WorkAssignment.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { autoUpdatePastWorks } from '../utils/workHelper.js';

const router = Router();

const workSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['pending', 'in_progress', 'completed']),
  dueDate: z.string().transform((str) => new Date(str)),
  location: z.string().or(z.literal('')).optional(),
});

// Helper to serialize a Work document with its assignedWorkers
function serializeWork(work: any, assignedWorkers: any[] = []) {
  const obj = work.toObject ? work.toObject() : { ...work };
  return {
    ...obj,
    id: obj._id.toString(),
    _id: undefined,
    assignedWorkers,
  };
}

// GET /api/works - List all work tasks
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await autoUpdatePastWorks();

    const { search, priority, status, category } = req.query;

    const filter: any = {};

    if (search) {
      const regex = new RegExp(String(search), 'i');
      filter.$or = [
        { title: regex },
        { description: regex },
        { location: regex },
      ];
    }

    if (priority) filter.priority = String(priority);
    if (status) filter.status = String(status);
    if (category) filter.category = String(category);

    const works = await Work.find(filter)
      .select('title description category priority status dueDate location createdAt updatedAt')
      .sort({ dueDate: 1 })
      .lean();

    if (works.length === 0) {
      res.json([]);
      return;
    }

    const workIds = works.map((w) => w._id);

    // Fetch all active assignments for these works in one query
    const activeAssignments = await WorkAssignment.find({
      workId: { $in: workIds },
      unassignedAt: null,
    })
      .populate('workerId', 'id name avatarUrl role isActive')
      .lean();

    // Group assignments by workId string
    const assignmentsByWork: Record<string, any[]> = {};
    for (const a of activeAssignments) {
      const wId = a.workId.toString();
      if (!assignmentsByWork[wId]) assignmentsByWork[wId] = [];
      assignmentsByWork[wId].push(a);
    }

    const formattedWorks = works.map((work) => {
      const assignments = assignmentsByWork[work._id.toString()] || [];

      // Deduplicate by worker id (a worker assigned to multiple shifts appears once)
      const workerMap = new Map<string, any>();
      for (const a of assignments) {
        const worker = a.workerId as any;
        const wId = worker?._id?.toString();
        if (wId && !workerMap.has(wId)) {
          workerMap.set(wId, {
            id: wId,
            name: worker.name,
            avatarUrl: worker.avatarUrl,
            role: worker.role,
            isActive: worker.isActive,
          });
        }
      }

      return {
        ...work,
        id: work._id.toString(),
        _id: undefined,
        assignedWorkers: Array.from(workerMap.values()),
      };
    });

    res.json(formattedWorks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve works' });
  }
});

// GET /api/works/:id - Single work details with full assignment history
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(404).json({ error: 'Work item not found' });
      return;
    }

    const work = await Work.findById(id)
      .select('title description category priority status dueDate location createdAt updatedAt')
      .lean();
    if (!work) {
      res.status(404).json({ error: 'Work item not found' });
      return;
    }

    const assignments = await WorkAssignment.find({ workId: id })
      .populate({
        path: 'workerId',
        select: 'name avatarUrl role phone alternatePhone email isActive',
      })
      .sort({ assignedAt: -1 })
      .lean();

    const activeWorkers = assignments
      .filter((a) => a.unassignedAt === null)
      .map((a: any) => ({
        id: a.workerId?._id?.toString(),
        name: a.workerId?.name,
        avatarUrl: a.workerId?.avatarUrl,
        role: a.workerId?.role,
        phone: a.workerId?.phone,
        alternatePhone: a.workerId?.alternatePhone,
        email: a.workerId?.email,
        isActive: a.workerId?.isActive,
        assignmentId: a._id.toString(),
        shift: a.shift,
        amount: a.amount,
      }));

    const assignmentHistory = assignments.map((a: any) => ({
      id: a._id.toString(),
      workerId: a.workerId?._id?.toString() ?? a.workerId?.toString(),
      workerName: a.workerId?.name,
      workerAvatarUrl: a.workerId?.avatarUrl,
      assignedAt: a.assignedAt,
      unassignedAt: a.unassignedAt,
      amount: a.amount,
      shift: a.shift,
    }));

    res.json({
      ...work,
      id: work._id.toString(),
      _id: undefined,
      activeWorkers,
      assignmentHistory,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve work item details' });
  }
});

// POST /api/works - Create work item
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = workSchema.parse(req.body);

    const newWork = new Work({
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      status: data.status,
      dueDate: data.dueDate,
      location: data.location || null,
    });
    await newWork.save();

    const obj = newWork.toObject();
    res.status(201).json({ ...obj, id: obj._id.toString(), _id: undefined });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create work item' });
  }
});

// PUT /api/works/:id - Update work item
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = workSchema.partial().parse(req.body);

    const existing = await Work.findById(id);
    if (!existing) {
      res.status(404).json({ error: 'Work item not found' });
      return;
    }

    const updateData: any = { ...data };
    if (updateData.location === '') updateData.location = null;

    const updated = await Work.findByIdAndUpdate(id, updateData, { new: true });
    const obj = updated!.toObject();
    res.json({ ...obj, id: obj._id.toString(), _id: undefined });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update work item' });
  }
});

// DELETE /api/works/:id - Delete work item + cascade assignments
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await Work.findById(id);
    if (!existing) {
      res.status(404).json({ error: 'Work item not found' });
      return;
    }

    // Cascade: delete all assignments for this work first
    await WorkAssignment.deleteMany({ workId: id });

    await Work.findByIdAndDelete(id);

    res.json({ message: 'Work item deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete work item' });
  }
});

export default router;
