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
});
const batchSyncSchema = zod_1.z.object({
    workId: zod_1.z.string().uuid('Invalid Work ID'),
    workerIds: zod_1.z.array(zod_1.z.string().uuid('Invalid Worker ID')),
});
// POST /api/assignments - Assign worker to work
router.post('/', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const { workId, workerId } = assignmentSchema.parse(req.body);
        // Verify work and worker exist
        const work = await prisma_js_1.default.work.findUnique({ where: { id: workId } });
        const worker = await prisma_js_1.default.worker.findUnique({ where: { id: workerId } });
        if (!work || !worker) {
            res.status(404).json({ error: 'Work or Worker not found' });
            return;
        }
        // Check if there is already an active assignment
        const active = await prisma_js_1.default.workAssignment.findFirst({
            where: { workId, workerId, unassignedAt: null },
        });
        if (active) {
            res.status(400).json({ error: 'Worker is already actively assigned to this work' });
            return;
        }
        // Create a new active assignment
        const newAssignment = await prisma_js_1.default.workAssignment.create({
            data: {
                workId,
                workerId,
                assignedAt: new Date(),
                unassignedAt: null,
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
        const { workId, workerIds } = batchSyncSchema.parse(req.body);
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
        const activeWorkerIds = activeAssignments.map((a) => a.workerId);
        // 1. Worker IDs to add (in workerIds, but NOT in activeWorkerIds)
        const toAdd = workerIds.filter((id) => !activeWorkerIds.includes(id));
        // 2. Worker IDs to remove (in activeWorkerIds, but NOT in workerIds)
        const toRemove = activeWorkerIds.filter((id) => !workerIds.includes(id));
        const now = new Date();
        // Perform operations in transaction
        await prisma_js_1.default.$transaction([
            // Add new assignments
            ...toAdd.map((workerId) => prisma_js_1.default.workAssignment.create({
                data: {
                    workId,
                    workerId,
                    assignedAt: now,
                    unassignedAt: null,
                },
            })),
            // Soft-delete removed assignments by updating unassignedAt
            ...toRemove.map((workerId) => {
                const assignment = activeAssignments.find((a) => a.workerId === workerId);
                return prisma_js_1.default.workAssignment.update({
                    where: { id: assignment.id },
                    data: { unassignedAt: now },
                });
            }),
        ]);
        // Fetch updated list of active workers
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
        const activeWorkers = updatedAssignments.map((a) => a.worker);
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
exports.default = router;
