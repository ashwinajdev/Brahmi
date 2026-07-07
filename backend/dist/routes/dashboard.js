"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_js_1 = __importDefault(require("../db/prisma.js"));
const auth_js_1 = require("../middleware/auth.js");
const workHelper_js_1 = require("../utils/workHelper.js");
const router = (0, express_1.Router)();
// GET /api/dashboard/stats
router.get('/stats', auth_js_1.authMiddleware, async (req, res) => {
    try {
        // Rollover past active tasks to today
        await (0, workHelper_js_1.autoUpdatePastWorks)();
        const now = new Date();
        // 1. Get total works by status
        const worksByStatus = await prisma_js_1.default.work.groupBy({
            by: ['status'],
            _count: {
                id: true,
            },
        });
        const statusCounts = {
            pending: 0,
            in_progress: 0,
            completed: 0,
        };
        worksByStatus.forEach((group) => {
            const status = group.status;
            if (statusCounts[status] !== undefined) {
                statusCounts[status] = group._count.id;
            }
        });
        const totalWorks = statusCounts.pending + statusCounts.in_progress + statusCounts.completed;
        // 2. Total active workers count
        const totalActiveWorkers = await prisma_js_1.default.worker.count({
            where: { isActive: true },
        });
        // 3. Overdue works count (dueDate < now and status != completed)
        const overdueWorks = await prisma_js_1.default.work.findMany({
            where: {
                dueDate: { lt: now },
                status: { not: 'completed' },
            },
            include: {
                assignments: {
                    where: { unassignedAt: null },
                    include: { worker: true },
                },
            },
        });
        // 4. Unassigned works count (status != completed and no active assignments)
        // To do this, we can query works that have no active assignments.
        const unassignedWorks = await prisma_js_1.default.work.findMany({
            where: {
                status: { not: 'completed' },
                assignments: {
                    none: {
                        unassignedAt: null,
                    },
                },
            },
        });
        // 5. Worker workload (active assignment count per worker)
        const activeWorkersWithWorkload = await prisma_js_1.default.worker.findMany({
            where: { isActive: true },
            include: {
                assignments: {
                    where: { unassignedAt: null },
                },
            },
        });
        const workloadData = activeWorkersWithWorkload.map((w) => ({
            id: w.id,
            name: w.name,
            role: w.role,
            avatarUrl: w.avatarUrl,
            activeAssignmentsCount: w.assignments.length,
        })).sort((a, b) => b.activeAssignmentsCount - a.activeAssignmentsCount);
        res.json({
            totalWorks,
            statusCounts,
            totalActiveWorkers,
            overdueCount: overdueWorks.length,
            unassignedCount: unassignedWorks.length,
            overdueWorks: overdueWorks.map((w) => ({
                id: w.id,
                title: w.title,
                dueDate: w.dueDate,
                priority: w.priority,
                status: w.status,
            })),
            unassignedWorks: unassignedWorks.map((w) => ({
                id: w.id,
                title: w.title,
                dueDate: w.dueDate,
                priority: w.priority,
                status: w.status,
            })),
            workload: workloadData,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve dashboard stats' });
    }
});
exports.default = router;
