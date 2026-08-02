"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Work_js_1 = __importDefault(require("../models/Work.js"));
const Worker_js_1 = __importDefault(require("../models/Worker.js"));
const WorkAssignment_js_1 = __importDefault(require("../models/WorkAssignment.js"));
const auth_js_1 = require("../middleware/auth.js");
const workHelper_js_1 = require("../utils/workHelper.js");
const router = (0, express_1.Router)();
// GET /api/dashboard/stats
router.get('/stats', auth_js_1.authMiddleware, async (req, res) => {
    try {
        // Rollover past active tasks to today
        await (0, workHelper_js_1.autoUpdatePastWorks)();
        // Today's date bounds
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        // 1. Get total works by status using MongoDB $group aggregation
        const worksByStatus = await Work_js_1.default.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        const statusCounts = {
            pending: 0,
            in_progress: 0,
            completed: 0,
        };
        worksByStatus.forEach((group) => {
            const status = group._id;
            if (statusCounts[status] !== undefined) {
                statusCounts[status] = group.count;
            }
        });
        const totalWorks = statusCounts.pending + statusCounts.in_progress + statusCounts.completed;
        // 2. Today's works count
        const todaysWorksCount = await Work_js_1.default.countDocuments({
            dueDate: { $gte: startOfToday, $lte: endOfToday },
        });
        // 3. Total active workers count
        const totalActiveWorkers = await Worker_js_1.default.countDocuments({ isActive: true });
        // 4. Unassigned works due TODAY (status != completed and no active assignments)
        const todayIncompleteWorks = await Work_js_1.default.find({
            status: { $ne: 'completed' },
            dueDate: { $gte: startOfToday, $lte: endOfToday },
        }).lean();
        let unassignedWorks = [];
        if (todayIncompleteWorks.length > 0) {
            const workIds = todayIncompleteWorks.map((w) => w._id);
            const activeAssignments = await WorkAssignment_js_1.default.find({
                workId: { $in: workIds },
                unassignedAt: null,
            }).distinct('workId');
            const assignedWorkIdSet = new Set(activeAssignments.map((id) => id.toString()));
            unassignedWorks = todayIncompleteWorks
                .filter((w) => !assignedWorkIdSet.has(w._id.toString()))
                .map((w) => ({
                id: w._id.toString(),
                title: w.title,
                dueDate: w.dueDate,
                priority: w.priority,
                status: w.status,
            }));
        }
        // 5. Worker workload – only count active assignments for works due TODAY
        const todayAssignments = await WorkAssignment_js_1.default.find({ unassignedAt: null })
            .populate({
            path: 'workId',
            match: { dueDate: { $gte: startOfToday, $lte: endOfToday } },
        })
            .populate('workerId', 'name role avatarUrl isActive')
            .lean();
        // Build workload map: only workers with at least one valid today-assignment
        const workloadByWorker = {};
        for (const a of todayAssignments) {
            // Skip assignments whose populated work didn't match the dueDate filter
            if (!a.workId)
                continue;
            const worker = a.workerId;
            if (!worker || !worker.isActive)
                continue;
            const wId = worker._id.toString();
            if (!workloadByWorker[wId]) {
                workloadByWorker[wId] = {
                    id: wId,
                    name: worker.name,
                    role: worker.role,
                    avatarUrl: worker.avatarUrl,
                    activeAssignmentsCount: 0,
                };
            }
            workloadByWorker[wId].activeAssignmentsCount++;
        }
        const workload = Object.values(workloadByWorker).sort((a, b) => b.activeAssignmentsCount - a.activeAssignmentsCount);
        const assignedWorkersCount = workload.length;
        res.json({
            totalWorks,
            todaysWorksCount,
            statusCounts,
            totalActiveWorkers,
            assignedWorkersCount,
            unassignedCount: unassignedWorks.length,
            unassignedWorks,
            workload,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve dashboard stats' });
    }
});
exports.default = router;
