"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_js_1 = __importDefault(require("../db/prisma.js"));
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
const workSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required'),
    description: zod_1.z.string().min(1, 'Description is required'),
    category: zod_1.z.string().min(1, 'Category is required'),
    priority: zod_1.z.enum(['low', 'medium', 'high']),
    status: zod_1.z.enum(['pending', 'in_progress', 'completed']),
    dueDate: zod_1.z.string().transform((str) => new Date(str)),
    location: zod_1.z.string().or(zod_1.z.literal('')).optional(),
});
// GET /api/works - List all work tasks
router.get('/', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const { search, priority, status, category } = req.query;
        const whereClause = {};
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
        const works = await prisma_js_1.default.work.findMany({
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
            assignedWorkers: work.assignments.map((a) => a.worker),
        }));
        res.json(formattedWorks);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve works' });
    }
});
// GET /api/works/:id - Single work details
router.get('/:id', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const work = await prisma_js_1.default.work.findUnique({
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
            .map((a) => a.worker);
        // Full assignment timeline history
        const assignmentHistory = work.assignments.map((a) => ({
            id: a.id,
            workerId: a.workerId,
            workerName: a.worker.name,
            workerAvatarUrl: a.worker.avatarUrl,
            assignedAt: a.assignedAt,
            unassignedAt: a.unassignedAt,
        }));
        res.json({
            ...work,
            activeWorkers,
            assignmentHistory,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve work item details' });
    }
});
// POST /api/works - Create work item
router.post('/', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const data = workSchema.parse(req.body);
        const newWork = await prisma_js_1.default.work.create({
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.errors });
            return;
        }
        console.error(error);
        res.status(500).json({ error: 'Failed to create work item' });
    }
});
// PUT /api/works/:id - Update work item details
router.put('/:id', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const data = workSchema.partial().parse(req.body);
        const existing = await prisma_js_1.default.work.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: 'Work item not found' });
            return;
        }
        const updatedWork = await prisma_js_1.default.work.update({
            where: { id },
            data: {
                ...data,
                location: data.location === '' ? null : data.location,
            },
        });
        res.json(updatedWork);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.errors });
            return;
        }
        console.error(error);
        res.status(500).json({ error: 'Failed to update work item' });
    }
});
// DELETE /api/works/:id - Delete work item
router.delete('/:id', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const existing = await prisma_js_1.default.work.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: 'Work item not found' });
            return;
        }
        await prisma_js_1.default.work.delete({ where: { id } });
        res.json({ message: 'Work item deleted successfully' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete work item' });
    }
});
exports.default = router;
