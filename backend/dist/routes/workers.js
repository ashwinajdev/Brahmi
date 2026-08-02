"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const Worker_js_1 = __importDefault(require("../models/Worker.js"));
const WorkAssignment_js_1 = __importDefault(require("../models/WorkAssignment.js"));
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
const workerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    phone: zod_1.z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
    alternatePhone: zod_1.z
        .string()
        .regex(/^\d{10}$/, 'Alternate phone must be exactly 10 digits')
        .or(zod_1.z.literal(''))
        .optional()
        .nullable(),
    email: zod_1.z.string().email('Invalid email address'),
    role: zod_1.z.string().min(1, 'Role/skill tag is required'),
    avatarUrl: zod_1.z.string().or(zod_1.z.literal('')).optional().nullable(),
    isActive: zod_1.z.boolean().optional(),
});
// Helper: serialize a worker document to match old Prisma response shape
function serializeWorker(worker) {
    const obj = worker.toObject ? worker.toObject() : { ...worker };
    return {
        ...obj,
        id: obj._id.toString(),
        _id: undefined,
    };
}
// GET /api/workers - List all workers
router.get('/', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const { search, role, status } = req.query;
        const filter = {};
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
        }
        else if (status === 'inactive') {
            filter.isActive = false;
        }
        const workers = await Worker_js_1.default.find(filter).sort({ name: 1 });
        if (workers.length === 0) {
            res.json([]);
            return;
        }
        const workerIds = workers.map((w) => w._id);
        // Fetch all active assignments for these workers in one query
        const activeAssignments = await WorkAssignment_js_1.default.find({
            workerId: { $in: workerIds },
            unassignedAt: null,
        })
            .populate('workId', 'id title status')
            .lean();
        // Group assignments by workerId string
        const assignmentsByWorker = {};
        for (const a of activeAssignments) {
            const wId = a.workerId.toString();
            if (!assignmentsByWorker[wId])
                assignmentsByWorker[wId] = [];
            assignmentsByWorker[wId].push(a);
        }
        const formattedWorkers = workers.map((worker) => {
            const obj = worker.toObject();
            const assignments = assignmentsByWorker[obj._id.toString()] || [];
            return {
                ...obj,
                id: obj._id.toString(),
                _id: undefined,
                activeAssignmentsCount: assignments.length,
                activeWorks: assignments.map((a) => {
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve workers' });
    }
});
// GET /api/workers/:id - Single worker with assignment history
router.get('/:id', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const worker = await Worker_js_1.default.findById(id);
        if (!worker) {
            res.status(404).json({ error: 'Worker not found' });
            return;
        }
        const assignments = await WorkAssignment_js_1.default.find({ workerId: id })
            .populate('workId')
            .sort({ assignedAt: -1 })
            .lean();
        const mapped = assignments.map((a) => ({
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
        const obj = worker.toObject();
        res.json({
            ...obj,
            id: obj._id.toString(),
            _id: undefined,
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
        const worker = new Worker_js_1.default({
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
// PUT /api/workers/:id - Update worker
router.put('/:id', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const data = workerSchema.partial().parse(req.body);
        const existing = await Worker_js_1.default.findById(id);
        if (!existing) {
            res.status(404).json({ error: 'Worker not found' });
            return;
        }
        const updateData = { ...data };
        if (updateData.avatarUrl === '')
            updateData.avatarUrl = null;
        const updated = await Worker_js_1.default.findByIdAndUpdate(id, updateData, { new: true });
        const obj = updated.toObject();
        res.json({ ...obj, id: obj._id.toString(), _id: undefined });
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
// DELETE /api/workers/:id - Hard delete worker + cascade delete assignments
router.delete('/:id', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await Worker_js_1.default.findById(id);
        if (!existing) {
            res.status(404).json({ error: 'Worker not found' });
            return;
        }
        // Cascade: delete all assignments for this worker first
        await WorkAssignment_js_1.default.deleteMany({ workerId: id });
        await Worker_js_1.default.findByIdAndDelete(id);
        const obj = existing.toObject();
        res.json({
            message: 'Worker deleted successfully',
            worker: { ...obj, id: obj._id.toString(), _id: undefined },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to deactivate worker' });
    }
});
exports.default = router;
