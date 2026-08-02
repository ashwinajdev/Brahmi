import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db/mongoose.js';
import authRoutes from './routes/auth.js';
import workerRoutes from './routes/workers.js';
import workRoutes from './routes/works.js';
import assignmentRoutes from './routes/assignments.js';
import dashboardRoutes from './routes/dashboard.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for local PWA dev
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/works', workRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

function startKeepAlive() {
  // ── Keep-Alive: prevent Render free-tier spin-down ──────────────────────
  // Only activates when RENDER_BACKEND_URL is set (i.e. in production).
  // Pings /health every 10 minutes so the dyno never goes idle.
  const KEEP_ALIVE_URL = process.env.RENDER_BACKEND_URL
    ? `${process.env.RENDER_BACKEND_URL}/health`
    : null;

  function isKeepAliveActive(): boolean {
    const now = new Date();
    // Convert to UTC milliseconds, then add IST offset (5.5 hours)
    const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istDate = new Date(utcMs + (3600000 * 5.5));

    const hours = istDate.getHours();
    const minutes = istDate.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    const startLimit = 6 * 60 + 30; // 6:30 AM
    const endLimit = 23 * 60 + 59;  // 11:59 PM

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
        } else {
          console.warn(`[keep-alive] ✗ unexpected status ${res.status}`);
        }
      } catch (err: any) {
        console.warn(`[keep-alive] ✗ ping failed: ${err?.message ?? err}`);
      }
    }, INTERVAL_MS);
  }
  // ────────────────────────────────────────────────────────────────────────
}

// Connect to MongoDB, then start server
connectDB()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Brahmi API Server is running on port ${PORT}`);
      startKeepAlive();
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error('');
        console.error('❌ ERROR: Port', PORT, 'is already in use.');
        console.error('');
        console.error('   Another backend instance (or another process) is already listening on :' + PORT + '.');
        console.error('');
        console.error('   → To fix on Windows, run:');
        console.error('     netstat -ano | findstr :' + PORT);
        console.error('     taskkill /PID <process-id> /F');
        console.error('');
        console.error('   → Or just close the other terminal running the backend.');
        process.exit(1);
      }
      console.error('Server error:', err);
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });
