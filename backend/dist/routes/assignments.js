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
const assignmentSchema = zod_1.z.object({
    workId: zod_1.z.string().uuid('Invalid Work ID'),
    workerId: zod_1.z.string().uuid('Invalid Worker ID'),
    shift: zod_1.z.string().min(1).optional(),
    amount: zod_1.z.number().nonnegative().optional(),
});
const syncAssignmentItemSchema = zod_1.z.object({
    workerId: zod_1.z.string().uuid('Invalid Worker ID'),
    shift: zod_1.z.string().min(1, 'Shift is required'),
    amount: zod_1.z.number().nonnegative().optional(),
});
const batchSyncSchema = zod_1.z.object({
    workId: zod_1.z.string().uuid('Invalid Work ID'),
    assignments: zod_1.z.array(syncAssignmentItemSchema),
});
// POST /api/assignments - Assign worker to work
router.post('/', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const { workId, workerId, shift, amount } = assignmentSchema.parse(req.body);
        const resolvedShift = shift || 'Tiffin';
        // Verify work and worker exist
        const work = await prisma_js_1.default.work.findUnique({ where: { id: workId } });
        if (!work) {
            res.status(404).json({ error: 'Work item not found' });
            return;
        }
        const worker = await prisma_js_1.default.worker.findUnique({ where: { id: workerId } });
        if (!worker) {
            res.status(404).json({ error: 'Worker not found' });
            return;
        }
        // Check if there is already an active assignment
        const active = await prisma_js_1.default.workAssignment.findFirst({
            where: { workId, workerId, shift: resolvedShift, unassignedAt: null },
        });
        if (active) {
            res.status(400).json({ error: 'Worker is already actively assigned to this shift' });
            return;
        }
        // Create a new active assignment
        const newAssignment = await prisma_js_1.default.workAssignment.create({
            data: {
                workId,
                workerId,
                assignedAt: new Date(),
                unassignedAt: null,
                shift: resolvedShift,
                amount: amount !== undefined ? amount : 500.0,
            },
            include: {
                worker: true,
            },
        });
        res.status(201).json(newAssignment);
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
// DELETE /api/assignments - Unassign worker from work (soft delete/archive assignment)
router.delete('/', auth_js_1.authMiddleware, async (req, res) => {
    try {
        // Read from body or query
        const { workId, workerId } = assignmentSchema.parse(req.body);
        const active = await prisma_js_1.default.workAssignment.findFirst({
            where: { workId, workerId, unassignedAt: null },
        });
        if (!active) {
            res.status(404).json({ error: 'No active assignment found for this worker and work' });
            return;
        }
        // Soft delete: update unassignedAt to now
        const updated = await prisma_js_1.default.workAssignment.update({
            where: { id: active.id },
            data: {
                unassignedAt: new Date(),
            },
        });
        res.json({ message: 'Worker unassigned successfully', assignment: updated });
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
        // Verify work exists
        const work = await prisma_js_1.default.work.findUnique({ where: { id: workId } });
        if (!work) {
            res.status(404).json({ error: 'Work item not found' });
            return;
        }
        // Get all current active assignments for this work
        const activeAssignments = await prisma_js_1.default.workAssignment.findMany({
            where: { workId, unassignedAt: null },
        });
        // Group active assignments by workerId
        const activeByWorker = {};
        for (const a of activeAssignments) {
            if (!activeByWorker[a.workerId]) {
                activeByWorker[a.workerId] = [];
            }
            activeByWorker[a.workerId].push(a);
        }
        // Group new assignments by workerId
        const newByWorker = {};
        for (const a of assignments) {
            if (!newByWorker[a.workerId]) {
                newByWorker[a.workerId] = [];
            }
            newByWorker[a.workerId].push(a);
        }
        const toRemove = [];
        const toAdd = [];
        const now = new Date();
        // 1. Check all currently active workers for removals or edits
        for (const workerId of Object.keys(activeByWorker)) {
            const activeList = activeByWorker[workerId];
            const newList = newByWorker[workerId];
            if (!newList) {
                // Worker was removed entirely: soft-delete all their active assignments
                toRemove.push(...activeList);
            }
            else {
                // Worker is in both: check if their assignment details (shifts/amounts) changed
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
                    // If edited, we end all their current active assignments
                    toRemove.push(...activeList);
                    // And start new ones with the updated details
                    toAdd.push(...newList);
                }
            }
        }
        // 2. Check for workers that are newly assigned (present only in newList)
        for (const workerId of Object.keys(newByWorker)) {
            if (!activeByWorker[workerId]) {
                toAdd.push(...newByWorker[workerId]);
            }
        }
        // Perform operations in transaction
        await prisma_js_1.default.$transaction([
            // Add new/updated assignments
            ...toAdd.map((item) => prisma_js_1.default.workAssignment.create({
                data: {
                    workId,
                    workerId: item.workerId,
                    assignedAt: now,
                    unassignedAt: null,
                    shift: item.shift,
                    amount: item.amount !== undefined ? item.amount : 500.0,
                },
            })),
            // Soft-delete removed/edited assignments by updating unassignedAt
            ...toRemove.map((active) => prisma_js_1.default.workAssignment.update({
                where: { id: active.id },
                data: { unassignedAt: now },
            })),
        ]);
        // Fetch updated list of active assignments
        const updatedAssignments = await prisma_js_1.default.workAssignment.findMany({
            where: { workId, unassignedAt: null },
            include: {
                worker: {
                    select: {
                        id: true,
                        name: true,
                        avatarUrl: true,
                        role: true,
                    },
                },
            },
        });
        // Return active assignments with worker detail mapped inline
        const activeWorkers = updatedAssignments.map((a) => ({
            ...a.worker,
            assignmentId: a.id,
            shift: a.shift,
            amount: a.amount,
        }));
        res.json({
            message: 'Worker assignments synchronized successfully',
            activeWorkers,
            addedCount: toAdd.length,
            removedCount: toRemove.length,
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
const updateAssignmentSchema = zod_1.z.object({
    assignedAt: zod_1.z.string().transform((str) => new Date(str)).optional(),
    unassignedAt: zod_1.z.string().transform((str) => new Date(str)).nullable().optional(),
    amount: zod_1.z.number().nullable().optional(),
    workTitle: zod_1.z.string().min(1).optional(),
    shift: zod_1.z.string().min(1).optional(),
});
// PUT /api/assignments/:id - Update assignment details
router.put('/:id', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const data = updateAssignmentSchema.parse(req.body);
        const assignment = await prisma_js_1.default.workAssignment.findUnique({
            where: { id },
            include: { work: true }
        });
        if (!assignment) {
            res.status(404).json({ error: 'Assignment not found' });
            return;
        }
        const updateData = {};
        if (data.assignedAt !== undefined) {
            updateData.assignedAt = data.assignedAt;
        }
        if (data.unassignedAt !== undefined) {
            updateData.unassignedAt = data.unassignedAt;
        }
        if (data.amount !== undefined) {
            updateData.amount = data.amount;
        }
        if (data.shift !== undefined) {
            updateData.shift = data.shift;
        }
        // Update assignment
        const updatedAssignment = await prisma_js_1.default.workAssignment.update({
            where: { id },
            data: updateData,
            include: { work: true }
        });
        // Update associated work title if workTitle is provided
        if (data.workTitle !== undefined) {
            await prisma_js_1.default.work.update({
                where: { id: assignment.workId },
                data: { title: data.workTitle }
            });
        }
        res.json({
            message: 'Assignment updated successfully',
            assignment: {
                ...updatedAssignment,
                work: {
                    ...updatedAssignment.work,
                    title: data.workTitle || updatedAssignment.work.title
                }
            }
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
        const id = req.params.id;
        const assignment = await prisma_js_1.default.workAssignment.findUnique({
            where: { id },
        });
        if (!assignment) {
            res.status(404).json({ error: 'Assignment not found' });
            return;
        }
        await prisma_js_1.default.workAssignment.delete({
            where: { id },
        });
        res.json({ message: 'Assignment deleted successfully' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete assignment' });
    }
});
exports.default = router;
