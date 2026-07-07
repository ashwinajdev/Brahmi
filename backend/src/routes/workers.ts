import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../db/prisma.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

const workerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  alternatePhone: z.string().regex(/^\d{10}$/, 'Alternate phone must be exactly 10 digits').or(z.literal('')).optional().nullable(),
  email: z.string().email('Invalid email address'),
  role: z.string().min(1, 'Role/skill tag is required'),
  avatarUrl: z.string().or(z.literal('')).optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET /api/workers - List all workers
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, role, status } = req.query;

    const whereClause: any = {};

    // Filter by name/email/phone search
    if (search) {
      whereClause.OR = [
        { name: { contains: String(search) } },
        { email: { contains: String(search) } },
        { role: { contains: String(search) } },
        { phone: { contains: String(search) } },
        { alternatePhone: { contains: String(search) } },
      ];
    }

    // Filter by exact role if provided
    if (role) {
      whereClause.role = String(role);
    }

    // Filter by status (active/inactive)
    if (status === 'active') {
      whereClause.isActive = true;
    } else if (status === 'inactive') {
      whereClause.isActive = false;
    }

    const workers = await prisma.worker.findMany({
      where: whereClause,
      include: {
        assignments: {
          where: { unassignedAt: null },
          select: {
            id: true,
            workId: true,
            work: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Format workers to include count and details of active works
    const formattedWorkers = workers.map((worker) => ({
      ...worker,
      activeAssignmentsCount: worker.assignments.length,
      activeWorks: worker.assignments.map((a) => a.work),
    }));

    res.json(formattedWorkers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve workers' });
  }
});

// GET /api/workers/:id - Single worker details with assignment history
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const worker = await prisma.worker.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            work: true,
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
    });

    if (!worker) {
      res.status(404).json({ error: 'Worker not found' });
      return;
    }

    const activeAssignments = worker.assignments.filter((a) => a.unassignedAt === null);
    const historicalAssignments = worker.assignments.filter((a) => a.unassignedAt !== null);

    res.json({
      ...worker,
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

    const newWorker = await prisma.worker.create({
      data: {
        name: data.name,
        phone: data.phone,
        alternatePhone: data.alternatePhone || null,
        email: data.email,
        role: data.role,
        avatarUrl: data.avatarUrl || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    res.status(201).json(newWorker);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create worker' });
  }
});

// PUT /api/workers/:id - Update worker details
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const data = workerSchema.partial().parse(req.body);

    const existing = await prisma.worker.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Worker not found' });
      return;
    }

    const updatedWorker = await prisma.worker.update({
      where: { id },
      data: {
        ...data,
        avatarUrl: data.avatarUrl === '' ? null : data.avatarUrl,
      },
    });

    res.json(updatedWorker);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update worker' });
  }
});

// DELETE /api/workers/:id - Soft-delete/deactivate worker
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.worker.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Worker not found' });
      return;
    }

    // Hard delete worker and cascade delete assignments
    const deletedWorker = await prisma.worker.delete({
      where: { id },
    });

    res.json({ message: 'Worker deleted successfully', worker: deletedWorker });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to deactivate worker' });
  }
});

export default router;
