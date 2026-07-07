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
const workerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    phone: zod_1.z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
    alternatePhone: zod_1.z.string().regex(/^\d{10}$/, 'Alternate phone must be exactly 10 digits').or(zod_1.z.literal('')).optional().nullable(),
    email: zod_1.z.string().email('Invalid email address'),
    role: zod_1.z.string().min(1, 'Role/skill tag is required'),
    avatarUrl: zod_1.z.string().or(zod_1.z.literal('')).optional().nullable(),
    isActive: zod_1.z.boolean().optional(),
});
// GET /api/workers - List all workers
router.get('/', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const { search, role, status } = req.query;
        const whereClause = {};
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
        }
        else if (status === 'inactive') {
            whereClause.isActive = false;
        }
        const workers = await prisma_js_1.default.worker.findMany({
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve workers' });
    }
});
// GET /api/workers/:id - Single worker details with assignment history
router.get('/:id', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const worker = await prisma_js_1.default.worker.findUnique({
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve worker details' });
    }
});
// POST /api/workers - Create new worker
router.post('/', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const data = workerSchema.parse(req.body);
        const newWorker = await prisma_js_1.default.worker.create({
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.errors });
            return;
        }
        console.error(error);
        res.status(500).json({ error: 'Failed to create worker' });
    }
});
// PUT /api/workers/:id - Update worker details
router.put('/:id', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const data = workerSchema.partial().parse(req.body);
        const existing = await prisma_js_1.default.worker.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: 'Worker not found' });
            return;
        }
        const updatedWorker = await prisma_js_1.default.worker.update({
            where: { id },
            data: {
                ...data,
                avatarUrl: data.avatarUrl === '' ? null : data.avatarUrl,
            },
        });
        res.json(updatedWorker);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.errors });
            return;
        }
        console.error(error);
        res.status(500).json({ error: 'Failed to update worker' });
    }
});
// DELETE /api/workers/:id - Soft-delete/deactivate worker
router.delete('/:id', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const existing = await prisma_js_1.default.worker.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: 'Worker not found' });
            return;
        }
        // Hard delete worker and cascade delete assignments
        const deletedWorker = await prisma_js_1.default.worker.delete({
            where: { id },
        });
        res.json({ message: 'Worker deleted successfully', worker: deletedWorker });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to deactivate worker' });
    }
});
exports.default = router;
