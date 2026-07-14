import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../db/prisma.js';
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

// GET /api/works - List all work tasks
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Rollover past active tasks to today
    await autoUpdatePastWorks();

    const { search, priority, status, category } = req.query;

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { title: { contains: String(search) } },
        { description: { contains: String(search) } },
        { location: { contains: String(search) } },
      ];
    }

    if (priority) {
      whereClause.priority = String(priority);
    }

    if (status) {
      whereClause.status = String(status);
    }

    if (category) {
      whereClause.category = String(category);
    }

    const works = await prisma.work.findMany({
      where: whereClause,
      include: {
        assignments: {
          where: { unassignedAt: null },
          include: {
            worker: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                role: true,
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Format works to return structured assigned workers
    const formattedWorks = works.map((work) => ({
      ...work,
      // Deduplicate by worker id — a worker assigned to multiple shifts
      // (e.g. Tiffin + Dinner) should only appear once in the list
      assignedWorkers: Array.from(
        new Map(work.assignments.map((a) => [a.worker.id, a.worker])).values()
      ),
    }));

    res.json(formattedWorks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve works' });
  }
});

// GET /api/works/:id - Single work details
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const work = await prisma.work.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            worker: true,
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
    });

    if (!work) {
      res.status(404).json({ error: 'Work item not found' });
      return;
    }

    const activeWorkers = work.assignments
      .filter((a) => a.unassignedAt === null)
      .map((a) => ({
        ...a.worker,
        assignmentId: a.id,
        shift: a.shift,
        amount: a.amount,
      }));

    // Full assignment timeline history
    const assignmentHistory = work.assignments.map((a) => ({
      id: a.id,
      workerId: a.workerId,
      workerName: a.worker.name,
      workerAvatarUrl: a.worker.avatarUrl,
      assignedAt: a.assignedAt,
      unassignedAt: a.unassignedAt,
      amount: a.amount,
      shift: a.shift,
    }));

    res.json({
      ...work,
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

    const newWork = await prisma.work.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        status: data.status,
        dueDate: data.dueDate,
        location: data.location || null,
      },
    });

    res.status(201).json(newWork);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create work item' });
  }
});

// PUT /api/works/:id - Update work item details
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const data = workSchema.partial().parse(req.body);

    const existing = await prisma.work.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Work item not found' });
      return;
    }

    const updatedWork = await prisma.work.update({
      where: { id },
      data: {
        ...data,
        location: data.location === '' ? null : data.location,
      },
    });

    res.json(updatedWork);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update work item' });
  }
});

// DELETE /api/works/:id - Delete work item
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.work.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Work item not found' });
      return;
    }

    await prisma.work.delete({ where: { id } });

    res.json({ message: 'Work item deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete work item' });
  }
});

export default router;
