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
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
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
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});
// Start Server
app.listen(PORT, () => {
    console.log(`Brahmi API Server is running on port ${PORT}`);
});
