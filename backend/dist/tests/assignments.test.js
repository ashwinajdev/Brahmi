"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_js_1 = __importDefault(require("../db/prisma.js"));
(0, vitest_1.describe)('Assignment History and Soft-Deletion Logic', () => {
    let testWorkId;
    let testWorkerId;
    (0, vitest_1.beforeAll)(async () => {
        // Create temporary work and worker records
        const worker = await prisma_js_1.default.worker.create({
            data: {
                name: 'Test Worker QA',
                email: 'qa.test@brahmi.com',
                phone: '+91 99999 88888',
                role: 'Quality Inspector',
            },
        });
        testWorkerId = worker.id;
        const work = await prisma_js_1.default.work.create({
            data: {
                title: 'Test Work Item QA',
                description: 'Verify assignment history schema parameters',
                category: 'QA Testing',
                priority: 'low',
                status: 'pending',
                dueDate: new Date(),
            },
        });
        testWorkId = work.id;
    });
    (0, vitest_1.afterAll)(async () => {
        // Cleanup test records
        await prisma_js_1.default.workAssignment.deleteMany({
            where: {
                OR: [
                    { workId: testWorkId },
                    { workerId: testWorkerId }
                ],
            },
        });
        await prisma_js_1.default.work.delete({ where: { id: testWorkId } });
        await prisma_js_1.default.worker.delete({ where: { id: testWorkerId } });
    });
    (0, vitest_1.it)('should create an active assignment and unassign it without deleting the record', async () => {
        // 1. Assign worker
        const assignment = await prisma_js_1.default.workAssignment.create({
            data: {
                workId: testWorkId,
                workerId: testWorkerId,
                assignedAt: new Date(),
                unassignedAt: null,
            },
        });
        (0, vitest_1.expect)(assignment.id).toBeDefined();
        (0, vitest_1.expect)(assignment.unassignedAt).toBeNull();
        // Verify it counts as an active assignment
        const active = await prisma_js_1.default.workAssignment.findFirst({
            where: { workId: testWorkId, workerId: testWorkerId, unassignedAt: null },
        });
        (0, vitest_1.expect)(active).not.toBeNull();
        (0, vitest_1.expect)(active.id).toBe(assignment.id);
        // 2. Unassign worker (soft-delete by updating unassignedAt)
        const now = new Date();
        await prisma_js_1.default.workAssignment.update({
            where: { id: assignment.id },
            data: {
                unassignedAt: now,
            },
        });
        // Verify active search returns nothing
        const activeAfter = await prisma_js_1.default.workAssignment.findFirst({
            where: { workId: testWorkId, workerId: testWorkerId, unassignedAt: null },
        });
        (0, vitest_1.expect)(activeAfter).toBeNull();
        // Verify historical record still exists in the database
        const dbRecord = await prisma_js_1.default.workAssignment.findUnique({
            where: { id: assignment.id },
        });
        (0, vitest_1.expect)(dbRecord).not.toBeNull();
        (0, vitest_1.expect)(dbRecord.unassignedAt).not.toBeNull();
        (0, vitest_1.expect)(new Date(dbRecord.unassignedAt).getTime()).toBeGreaterThanOrEqual(now.getTime() - 1000);
    });
});
