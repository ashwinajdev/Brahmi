import { Router, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Worker from '../models/Worker.js';
import WorkAssignment from '../models/WorkAssignment.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

const workerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  alternatePhone: z
    .string()
    .regex(/^\d{10}$/, 'Alternate phone must be exactly 10 digits')
    .or(z.literal(''))
    .optional()
    .nullable(),
  email: z.string().email('Invalid email address'),
  role: z.string().min(1, 'Role/skill tag is required'),
  avatarUrl: z.string().or(z.literal('')).optional().nullable(),
  isActive: z.boolean().optional(),
});

// Helper: serialize a worker document with id string (matches API response shape)
function serializeWorker(worker: any) {
  const obj = worker.toObject ? worker.toObject() : { ...worker };
  return {
    ...obj,
    id: obj._id.toString(),
    _id: undefined,
  };
}

// GET /api/workers - List all workers
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, role, status } = req.query;

    const filter: any = {};

    if (search) {
      const regex = new RegExp(String(search), 'i');
      filter.$or = [
        { name: regex },
        { email: regex },
        { role: regex },
        { phone: regex },
        { alternatePhone: regex },
      ];
    }

    if (role) {
      filter.role = String(role);
    }

    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }

    const workers = await Worker.find(filter)
      .select('name phone alternatePhone email role avatarUrl isActive createdAt updatedAt')
      .sort({ name: 1 })
      .lean();

    if (workers.length === 0) {
      res.json([]);
      return;
    }

    const workerIds = workers.map((w) => w._id);

    // Fetch all active assignments for these workers in one query
    const activeAssignments = await WorkAssignment.find({
      workerId: { $in: workerIds },
      unassignedAt: null,
    })
      .populate({
        path: 'workId',
        select: 'title status dueDate',
      })
      .lean();

    // Group assignments by workerId string
    const assignmentsByWorker: Record<string, any[]> = {};
    for (const a of activeAssignments) {
      const wId = a.workerId.toString();
      if (!assignmentsByWorker[wId]) assignmentsByWorker[wId] = [];
      assignmentsByWorker[wId].push(a);
    }

    const formattedWorkers = workers.map((worker) => {
      const obj = worker;
      const assignments = assignmentsByWorker[obj._id.toString()] || [];
      return {
        ...obj,
        id: obj._id.toString(),
        _id: undefined,
        activeAssignmentsCount: assignments.length,
        activeWorks: assignments.map((a: any) => {
          const work = a.workId;
          return {
            id: work?._id?.toString() ?? work?.toString(),
            title: work?.title,
            status: work?.status,
          };
        }),
      };
    });

    res.json(formattedWorkers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve workers' });
  }
});

// GET /api/workers/:id - Single worker with assignment history
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(404).json({ error: 'Worker not found' });
      return;
    }

    const worker = await Worker.findById(id).lean();
    if (!worker) {
      res.status(404).json({ error: 'Worker not found' });
      return;
    }

    const assignments = await WorkAssignment.find({ workerId: id })
      .populate({
        path: 'workId',
        select: 'title description category priority status dueDate location createdAt updatedAt',
      })
      .sort({ assignedAt: -1 })
      .lean();

    const mapped = assignments.map((a: any) => ({
      id: a._id.toString(),
      workId: a.workId?._id?.toString() ?? a.workId?.toString(),
      workerId: a.workerId.toString(),
      assignedAt: a.assignedAt,
      unassignedAt: a.unassignedAt,
      amount: a.amount,
      shift: a.shift,
      work: a.workId
        ? {
            id: a.workId._id?.toString(),
            title: a.workId.title,
            description: a.workId.description,
            category: a.workId.category,
            priority: a.workId.priority,
            status: a.workId.status,
            dueDate: a.workId.dueDate,
            location: a.workId.location,
            createdAt: a.workId.createdAt,
            updatedAt: a.workId.updatedAt,
          }
        : null,
    }));

    const activeAssignments = mapped.filter((a) => a.unassignedAt === null);
    const historicalAssignments = mapped.filter((a) => a.unassignedAt !== null);

    res.json({
      ...worker,
      id: worker._id.toString(),
      _id: undefined,
      activeAssignments,
      historicalAssignments,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve worker details' });
  }
});

// POST /api/workers - Create new worker
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = workerSchema.parse(req.body);

    const worker = new Worker({
      name: data.name,
      phone: data.phone,
      alternatePhone: data.alternatePhone || null,
      email: data.email,
      role: data.role,
      avatarUrl: data.avatarUrl || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });
    await worker.save();

    const obj = worker.toObject();
    res.status(201).json({ ...obj, id: obj._id.toString(), _id: undefined });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create worker' });
  }
});

// PUT /api/workers/:id - Update worker
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = workerSchema.partial().parse(req.body);

    const existing = await Worker.findById(id);
    if (!existing) {
      res.status(404).json({ error: 'Worker not found' });
      return;
    }

    const updateData: any = { ...data };
    if (updateData.avatarUrl === '') updateData.avatarUrl = null;

    const updated = await Worker.findByIdAndUpdate(id, updateData, { new: true });
    const obj = updated!.toObject();
    res.json({ ...obj, id: obj._id.toString(), _id: undefined });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update worker' });
  }
});

// DELETE /api/workers/:id - Hard delete worker + cascade delete assignments
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await Worker.findById(id);
    if (!existing) {
      res.status(404).json({ error: 'Worker not found' });
      return;
    }

    // Cascade: delete all assignments for this worker first
    await WorkAssignment.deleteMany({ workerId: id });

    await Worker.findByIdAndDelete(id);

    const obj = existing.toObject();
    res.json({
      message: 'Worker deleted successfully',
      worker: { ...obj, id: obj._id.toString(), _id: undefined },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to deactivate worker' });
  }
});

export default router;
