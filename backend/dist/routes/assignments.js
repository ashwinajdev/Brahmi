"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const Work_js_1 = __importDefault(require("../models/Work.js"));
const Worker_js_1 = __importDefault(require("../models/Worker.js"));
const WorkAssignment_js_1 = __importDefault(require("../models/WorkAssignment.js"));
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// Use z.string().min(1) instead of z.string().uuid() since IDs are now MongoDB ObjectIds
const assignmentSchema = zod_1.z.object({
    workId: zod_1.z.string().min(1, 'Invalid Work ID'),
    workerId: zod_1.z.string().min(1, 'Invalid Worker ID'),
    shift: zod_1.z.string().min(1).optional(),
    amount: zod_1.z.number().nonnegative().optional(),
});
const syncAssignmentItemSchema = zod_1.z.object({
    workerId: zod_1.z.string().min(1, 'Invalid Worker ID'),
    shift: zod_1.z.string().min(1, 'Shift is required'),
    amount: zod_1.z.number().nonnegative().optional(),
});
const batchSyncSchema = zod_1.z.object({
    workId: zod_1.z.string().min(1, 'Invalid Work ID'),
    assignments: zod_1.z.array(syncAssignmentItemSchema),
});
const updateAssignmentSchema = zod_1.z.object({
    assignedAt: zod_1.z.string().transform((str) => new Date(str)).optional(),
    unassignedAt: zod_1.z.string().transform((str) => new Date(str)).nullable().optional(),
    amount: zod_1.z.number().nullable().optional(),
    workTitle: zod_1.z.string().min(1).optional(),
    shift: zod_1.z.string().min(1).optional(),
});
// POST /api/assignments - Assign worker to work
router.post('/', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const { workId, workerId, shift, amount } = assignmentSchema.parse(req.body);
        const resolvedShift = shift || 'Tiffin';
        const work = await Work_js_1.default.findById(workId);
        if (!work) {
            res.status(404).json({ error: 'Work item not found' });
            return;
        }
        const worker = await Worker_js_1.default.findById(workerId);
        if (!worker) {
            res.status(404).json({ error: 'Worker not found' });
            return;
        }
        // Check for existing active assignment on this shift
        const active = await WorkAssignment_js_1.default.findOne({
            workId,
            workerId,
            shift: resolvedShift,
            unassignedAt: null,
        });
        if (active) {
            res.status(400).json({ error: 'Worker is already actively assigned to this shift' });
            return;
        }
        const newAssignment = new WorkAssignment_js_1.default({
            workId,
            workerId,
            assignedAt: new Date(),
            unassignedAt: null,
            shift: resolvedShift,
            amount: amount !== undefined ? amount : 500.0,
        });
        await newAssignment.save();
        const populated = await WorkAssignment_js_1.default.findById(newAssignment._id)
            .populate('workerId')
            .lean();
        const workerObj = populated?.workerId;
        res.status(201).json({
            id: populated?._id?.toString(),
            workId: populated?.workId?.toString(),
            workerId: workerObj?._id?.toString(),
            assignedAt: populated?.assignedAt,
            unassignedAt: populated?.unassignedAt,
            shift: populated?.shift,
            amount: populated?.amount,
            worker: workerObj
                ? { ...workerObj, id: workerObj._id.toString(), _id: undefined }
                : null,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.errors });
            return;
        }
        console.error(error);
        res.status(500).json({ error: 'Failed to assign worker' });
    }
});
// DELETE /api/assignments - Unassign worker from work (soft delete)
router.delete('/', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const { workId, workerId } = assignmentSchema.parse(req.body);
        const active = await WorkAssignment_js_1.default.findOne({ workId, workerId, unassignedAt: null });
        if (!active) {
            res.status(404).json({ error: 'No active assignment found for this worker and work' });
            return;
        }
        active.unassignedAt = new Date();
        await active.save();
        const obj = active.toObject();
        res.json({
            message: 'Worker unassigned successfully',
            assignment: { ...obj, id: obj._id.toString(), _id: undefined },
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.errors });
            return;
        }
        console.error(error);
        res.status(500).json({ error: 'Failed to unassign worker' });
    }
});
// POST /api/assignments/sync - Batch assign/unassign workers for a work item
router.post('/sync', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const { workId, assignments } = batchSyncSchema.parse(req.body);
        const work = await Work_js_1.default.findById(workId);
        if (!work) {
            res.status(404).json({ error: 'Work item not found' });
            return;
        }
        // Get all current active assignments for this work
        const activeAssignments = await WorkAssignment_js_1.default.find({ workId, unassignedAt: null }).lean();
        // Group active assignments by workerId
        const activeByWorker = {};
        for (const a of activeAssignments) {
            const wId = a.workerId.toString();
            if (!activeByWorker[wId])
                activeByWorker[wId] = [];
            activeByWorker[wId].push(a);
        }
        // Group new assignments by workerId
        const newByWorker = {};
        for (const a of assignments) {
            if (!newByWorker[a.workerId])
                newByWorker[a.workerId] = [];
            newByWorker[a.workerId].push(a);
        }
        const toRemoveIds = [];
        const toAdd = [];
        const now = new Date();
        // 1. Check all currently active workers for removals or edits
        for (const workerId of Object.keys(activeByWorker)) {
            const activeList = activeByWorker[workerId];
            const newList = newByWorker[workerId];
            if (!newList) {
                // Worker was removed entirely
                toRemoveIds.push(...activeList.map((a) => a._id.toString()));
            }
            else {
                // Check if assignment details changed
                let isEdited = activeList.length !== newList.length;
                if (!isEdited) {
                    for (const newItem of newList) {
                        const activeMatch = activeList.find((a) => a.shift === newItem.shift);
                        if (!activeMatch) {
                            isEdited = true;
                            break;
                        }
                        const activeAmt = activeMatch.amount ?? 500.0;
                        const newAmt = newItem.amount ?? 500.0;
                        if (Math.abs(activeAmt - newAmt) > 0.01) {
                            isEdited = true;
                            break;
                        }
                    }
                }
                if (isEdited) {
                    toRemoveIds.push(...activeList.map((a) => a._id.toString()));
                    toAdd.push(...newList);
                }
            }
        }
        // 2. Newly assigned workers (not in active list)
        for (const workerId of Object.keys(newByWorker)) {
            if (!activeByWorker[workerId]) {
                toAdd.push(...newByWorker[workerId]);
            }
        }
        // Execute all changes concurrently
        await Promise.all([
            // Soft-delete removed assignments
            toRemoveIds.length > 0
                ? WorkAssignment_js_1.default.updateMany({ _id: { $in: toRemoveIds } }, { $set: { unassignedAt: now } })
                : Promise.resolve(),
            // Create new assignments
            ...toAdd.map((item) => new WorkAssignment_js_1.default({
                workId,
                workerId: item.workerId,
                assignedAt: now,
                unassignedAt: null,
                shift: item.shift,
                amount: item.amount !== undefined ? item.amount : 500.0,
            }).save()),
        ]);
        // Fetch updated active assignments with worker details
        const updatedAssignments = await WorkAssignment_js_1.default.find({ workId, unassignedAt: null })
            .populate('workerId', 'id name avatarUrl role')
            .lean();
        const activeWorkers = updatedAssignments.map((a) => ({
            id: a.workerId?._id?.toString(),
            name: a.workerId?.name,
            avatarUrl: a.workerId?.avatarUrl,
            role: a.workerId?.role,
            assignmentId: a._id.toString(),
            shift: a.shift,
            amount: a.amount,
        }));
        res.json({
            message: 'Worker assignments synchronized successfully',
            activeWorkers,
            addedCount: toAdd.length,
            removedCount: toRemoveIds.length,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.errors });
            return;
        }
        console.error(error);
        res.status(500).json({ error: 'Failed to sync assignments' });
    }
});
// PUT /api/assignments/:id - Update assignment details
router.put('/:id', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const data = updateAssignmentSchema.parse(req.body);
        const assignment = await WorkAssignment_js_1.default.findById(id).populate('workId');
        if (!assignment) {
            res.status(404).json({ error: 'Assignment not found' });
            return;
        }
        const updateData = {};
        if (data.assignedAt !== undefined)
            updateData.assignedAt = data.assignedAt;
        if (data.unassignedAt !== undefined)
            updateData.unassignedAt = data.unassignedAt;
        if (data.amount !== undefined)
            updateData.amount = data.amount;
        if (data.shift !== undefined)
            updateData.shift = data.shift;
        const updated = await WorkAssignment_js_1.default.findByIdAndUpdate(id, updateData, { new: true })
            .populate('workId')
            .lean();
        // Update associated work title if provided
        if (data.workTitle !== undefined) {
            await Work_js_1.default.findByIdAndUpdate(assignment.workId, { title: data.workTitle });
        }
        const workObj = updated?.workId;
        res.json({
            message: 'Assignment updated successfully',
            assignment: {
                ...updated,
                id: updated?._id?.toString(),
                _id: undefined,
                work: workObj
                    ? {
                        ...workObj,
                        id: workObj._id?.toString(),
                        _id: undefined,
                        title: data.workTitle || workObj.title,
                    }
                    : null,
            },
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.errors });
            return;
        }
        console.error(error);
        res.status(500).json({ error: 'Failed to update assignment' });
    }
});
// DELETE /api/assignments/:id - Permanently delete an assignment record
router.delete('/:id', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const assignment = await WorkAssignment_js_1.default.findById(id);
        if (!assignment) {
            res.status(404).json({ error: 'Assignment not found' });
            return;
        }
        await WorkAssignment_js_1.default.findByIdAndDelete(id);
        res.json({ message: 'Assignment deleted successfully' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete assignment' });
    }
});
exports.default = router;
