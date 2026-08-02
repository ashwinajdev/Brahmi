"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const mongoose_js_1 = require("../db/mongoose.js");
const Worker_js_1 = __importDefault(require("../models/Worker.js"));
const Work_js_1 = __importDefault(require("../models/Work.js"));
const WorkAssignment_js_1 = __importDefault(require("../models/WorkAssignment.js"));
const mongoose_1 = __importDefault(require("mongoose"));
(0, vitest_1.describe)('Assignment History and Soft-Deletion Logic', () => {
    let testWorkId;
    let testWorkerId;
    (0, vitest_1.beforeAll)(async () => {
        await (0, mongoose_js_1.connectDB)();
        // Create temporary work and worker records
        const worker = new Worker_js_1.default({
            name: 'Test Worker QA',
            email: 'qa.test@brahmi.com',
            phone: '9999988888',
            role: 'Quality Inspector',
        });
        await worker.save();
        testWorkerId = worker._id.toString();
        const work = new Work_js_1.default({
            title: 'Test Work Item QA',
            description: 'Verify assignment history schema parameters',
            category: 'QA Testing',
            priority: 'low',
            status: 'pending',
            dueDate: new Date(),
        });
        await work.save();
        testWorkId = work._id.toString();
    });
    (0, vitest_1.afterAll)(async () => {
        // Cleanup test records
        await WorkAssignment_js_1.default.deleteMany({
            $or: [{ workId: testWorkId }, { workerId: testWorkerId }],
        });
        await Work_js_1.default.findByIdAndDelete(testWorkId);
        await Worker_js_1.default.findByIdAndDelete(testWorkerId);
        await mongoose_1.default.disconnect();
    });
    (0, vitest_1.it)('should create an active assignment and unassign it without deleting the record', async () => {
        // 1. Assign worker
        const assignment = new WorkAssignment_js_1.default({
            workId: testWorkId,
            workerId: testWorkerId,
            assignedAt: new Date(),
            unassignedAt: null,
        });
        await assignment.save();
        (0, vitest_1.expect)(assignment._id).toBeDefined();
        (0, vitest_1.expect)(assignment.unassignedAt).toBeNull();
        // Verify it counts as an active assignment
        const active = await WorkAssignment_js_1.default.findOne({
            workId: testWorkId,
            workerId: testWorkerId,
            unassignedAt: null,
        });
        (0, vitest_1.expect)(active).not.toBeNull();
        (0, vitest_1.expect)(active._id.toString()).toBe(assignment._id.toString());
        // 2. Unassign worker (soft-delete by updating unassignedAt)
        const now = new Date();
        await WorkAssignment_js_1.default.findByIdAndUpdate(assignment._id, {
            unassignedAt: now,
        });
        // Verify active search returns nothing
        const activeAfter = await WorkAssignment_js_1.default.findOne({
            workId: testWorkId,
            workerId: testWorkerId,
            unassignedAt: null,
        });
        (0, vitest_1.expect)(activeAfter).toBeNull();
        // Verify historical record still exists in the database
        const dbRecord = await WorkAssignment_js_1.default.findById(assignment._id);
        (0, vitest_1.expect)(dbRecord).not.toBeNull();
        (0, vitest_1.expect)(dbRecord.unassignedAt).not.toBeNull();
        (0, vitest_1.expect)(new Date(dbRecord.unassignedAt).getTime()).toBeGreaterThanOrEqual(now.getTime() - 1000);
    });
});
