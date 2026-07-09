"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_js_1 = __importDefault(require("./routes/auth.js"));
const workers_js_1 = __importDefault(require("./routes/workers.js"));
const works_js_1 = __importDefault(require("./routes/works.js"));
const assignments_js_1 = __importDefault(require("./routes/assignments.js"));
const dashboard_js_1 = __importDefault(require("./routes/dashboard.js"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)({
    origin: '*', // Allow all origins for local PWA dev
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ limit: '10mb', extended: true }));
// Log requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});
// API Routes
app.use('/api/auth', auth_js_1.default);
app.use('/api/workers', workers_js_1.default);
app.use('/api/works', works_js_1.default);
app.use('/api/assignments', assignments_js_1.default);
app.use('/api/dashboard', dashboard_js_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});
// Start Server
app.listen(PORT, () => {
    console.log(`Brahmi API Server is running on port ${PORT}`);
    // ── Keep-Alive: prevent Render free-tier spin-down ──────────────────────
    // Only activates when RENDER_BACKEND_URL is set (i.e. in production).
    // Pings /health every 10 minutes so the dyno never goes idle.
    const KEEP_ALIVE_URL = process.env.RENDER_BACKEND_URL
        ? `${process.env.RENDER_BACKEND_URL}/health`
        : null;
    function isKeepAliveActive() {
        const now = new Date();
        // Convert to UTC milliseconds, then add IST offset (5.5 hours)
        const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
        const istDate = new Date(utcMs + (3600000 * 5.5));
        const hours = istDate.getHours();
        const minutes = istDate.getMinutes();
        const timeInMinutes = hours * 60 + minutes;
        const startLimit = 6 * 60 + 30; // 6:30 AM
        const endLimit = 23 * 60 + 59; // 11:59 PM
        return timeInMinutes >= startLimit && timeInMinutes <= endLimit;
    }
    if (KEEP_ALIVE_URL) {
        const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
        console.log(`[keep-alive] Self-ping enabled → ${KEEP_ALIVE_URL} every 10 min (Active: 6:30 AM - 11:59 PM IST)`);
        setInterval(async () => {
            if (!isKeepAliveActive()) {
                console.log(`[keep-alive] Skipping ping: current time is outside the 6:30 AM - 11:59 PM IST window.`);
                return;
            }
            try {
                const res = await fetch(KEEP_ALIVE_URL);
                if (res.ok) {
                    console.log(`[keep-alive] ✓ pinged at ${new Date().toISOString()}`);
                }
                else {
                    console.warn(`[keep-alive] ✗ unexpected status ${res.status}`);
                }
            }
            catch (err) {
                console.warn(`[keep-alive] ✗ ping failed: ${err?.message ?? err}`);
            }
        }, INTERVAL_MS);
    }
    // ────────────────────────────────────────────────────────────────────────
});
