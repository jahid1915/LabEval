require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const connectDB = require('./config/db');
const { syncTeacherDutyStatuses } = require('./utils/dutyStatusCron');

// ── Environment Validation ────────────────────────────────────────────────────
const REQUIRED_ENV = ['JWT_SECRET'];
const missingEnv = REQUIRED_ENV.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnv.join(', ')}`);
  if (process.env.NODE_ENV === 'production') process.exit(1);
}

// ── Database Connection ───────────────────────────────────────────────────────
connectDB().then(() => {
  syncTeacherDutyStatuses();
  setInterval(syncTeacherDutyStatuses, 60 * 60 * 1000);
});

const app = express();

// ── Request ID Middleware ─────────────────────────────────────────────────────
app.use((req, res, next) => {
  req.requestId = uuidv4().slice(0, 8);
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// ── Security Headers (Helmet) ─────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false  // Handled by frontend
}));

// ── Compression ───────────────────────────────────────────────────────────────
app.use(compression({
  filter: (req, res) => {
    // Don't compress already-binary responses (e.g., XLSX downloads)
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  threshold: 1024  // Only compress responses > 1KB
}));

// ── Body Parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/$/, '');
    const isAllowed = allowedOrigins.some(a => a.replace(/\/$/, '') === cleanOrigin);
    if (isAllowed) return callback(null, true);
    // Permissive in dev
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    return callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true
}));

// ── Structured Logging ────────────────────────────────────────────────────────
morgan.token('reqid', (req) => req.requestId);
const logFormat = process.env.NODE_ENV === 'production'
  ? ':reqid :method :url :status :response-time ms - :res[content-length]'
  : 'dev';
app.use(morgan(logFormat));

// ── Rate Limiters ─────────────────────────────────────────────────────────────
// Shared key generator to handle IPv4/IPv6 safely
// express-rate-limit v7+ uses its own IP detection by default

// Auth endpoints: 20 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many requests from this IP, please try again later.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false
});

// Import endpoints: 10 per hour (uploads are expensive)
const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Import rate limit exceeded. Maximum 10 imports per hour.', code: 'IMPORT_RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false
});

// General API: 200 per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests, please slow down.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false
});

// ── Health Endpoints ──────────────────────────────────────────────────────────
const mongoose = require('mongoose');

app.get('/health', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }[dbState] || 'unknown';
  const healthy = dbState === 1;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    database: dbStatus,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health/ready', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ ready });
});

app.get('/health/live', (req, res) => {
  res.status(200).json({ alive: true });
});

// ── Core Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',             authLimiter,    require('./routes/authRoutes'));
app.use('/api/admin',            generalLimiter, require('./routes/adminRoutes'));
app.use('/api/import',           importLimiter,  require('./routes/importRoutes'));
app.use('/api/faculties',        generalLimiter, require('./routes/facultyRoutes'));
app.use('/api/departments',      generalLimiter, require('./routes/departmentRoutes'));
app.use('/api/academic',         generalLimiter, require('./routes/academicRoutes'));
app.use('/api/courses',          generalLimiter, require('./routes/courseCatalogRoutes'));
app.use('/api/course-offerings', generalLimiter, require('./routes/courseOfferingRoutes'));
app.use('/api/leaves',           generalLimiter, require('./routes/leaveRoutes'));
app.use('/api/announcements',    generalLimiter, require('./routes/announcementRoutes'));
app.use('/api/notifications',    generalLimiter, require('./routes/notificationRoutes'));
app.use('/api/analytics',        generalLimiter, require('./routes/analyticsRoutes'));
app.use('/api/audit-logs',       generalLimiter, require('./routes/auditRoutes'));
app.use('/api/search',           generalLimiter, require('./routes/searchRoutes'));

// ── Role Portals ──────────────────────────────────────────────────────────────
app.use('/api/teacher',          generalLimiter, require('./routes/teacherRoutes'));
app.use('/api/student',          generalLimiter, require('./routes/studentRoutes'));

// ── Root ──────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'LabEval University Platform API',
    version: '2.0',
    health: '/health',
    requestId: req.requestId
  });
});

// ── Centralized Error Handler ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File too large. Maximum size is 10 MB.',
      code: 'FILE_TOO_LARGE',
      requestId: req.requestId
    });
  }
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: 'INVALID_FILE_TYPE',
      requestId: req.requestId
    });
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Never expose stack traces in production
  if (process.env.NODE_ENV === 'production') {
    console.error(`[ERROR] reqId=${req.requestId} ${err.message}`);
  } else {
    console.error(`[ERROR] reqId=${req.requestId}`, err);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    code: err.code || 'SERVER_ERROR',
    requestId: req.requestId,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
});

// ── Server Start ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 LabEval Server v2.0 running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
const gracefulShutdown = async (signal) => {
  console.log(`\n📡 ${signal} received — initiating graceful shutdown...`);
  
  server.close(async (err) => {
    if (err) console.error('HTTP server close error:', err);
    else console.log('✅ HTTP server closed');

    try {
      await mongoose.connection.close(false);
      console.log('✅ MongoDB connection closed');
    } catch (dbErr) {
      console.error('MongoDB close error:', dbErr);
    }

    console.log('👋 Shutdown complete');
    process.exit(err ? 1 : 0);
  });

  // Force exit after 30 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// Uncaught error protection — don't crash the process for recoverable errors
process.on('uncaughtException', (err) => {
  console.error('🔴 Uncaught Exception:', err.message, err.stack);
  // Don't exit for common recoverable errors
});

process.on('unhandledRejection', (reason) => {
  console.error('🔴 Unhandled Rejection:', reason);
});
