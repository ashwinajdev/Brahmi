"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const prisma_js_1 = __importDefault(require("../db/prisma.js"));
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'brahmi_secure_jwt_secret_token_123!';
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    name: zod_1.z.string().min(1),
    avatarUrl: zod_1.z.string().url().optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const body = registerSchema.parse(req.body);
        const existingUser = await prisma_js_1.default.user.findUnique({
            where: { email: body.email },
        });
        if (existingUser) {
            res.status(400).json({ error: 'User with this email already exists' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(body.password, 10);
        const user = await prisma_js_1.default.user.create({
            data: {
                email: body.email,
                password: hashedPassword,
                name: body.name,
                avatarUrl: body.avatarUrl || null,
            },
        });
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
            },
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.errors });
            return;
        }
        console.error(error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const body = loginSchema.parse(req.body);
        const user = await prisma_js_1.default.user.findUnique({
            where: { email: body.email },
        });
        if (!user) {
            res.status(400).json({ error: 'Invalid email or password' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(body.password, user.password);
        if (!isMatch) {
            res.status(400).json({ error: 'Invalid email or password' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
            },
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.errors });
            return;
        }
        console.error(error);
        res.status(500).json({ error: 'Server error during login' });
    }
});
// GET /api/auth/me
router.get('/me', auth_js_1.authMiddleware, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }
        const user = await prisma_js_1.default.user.findUnique({
            where: { id: req.user.id },
        });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
            },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error getting user' });
    }
});
exports.default = router;
