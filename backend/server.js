require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { syncTeacherDutyStatuses } = require('./utils/dutyStatusCron');

// Connect Database
connectDB().then(() => {
  // Run initial duty status synchronization
  syncTeacherDutyStatuses();
  // Sync periodically every hour
  setInterval(syncTeacherDutyStatuses, 60 * 60 * 1000);
});

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/$/, '');
    const isAllowed = allowedOrigins.some(allowed => allowed.replace(/\/$/, '') === cleanOrigin);
    if (isAllowed) {
      return callback(null, true);
    }
    return callback(null, true); // Dev-friendly fallback
  },
  credentials: true
}));
app.use(morgan('dev'));

// ── Core & Academic Routes ───────────────────────────────────────────
app.use('/api/auth',             require('./routes/authRoutes'));
app.use('/api/admin',            require('./routes/adminRoutes'));
app.use('/api/faculties',        require('./routes/facultyRoutes'));
app.use('/api/departments',      require('./routes/departmentRoutes'));
app.use('/api/academic',         require('./routes/academicRoutes'));
app.use('/api/courses',          require('./routes/courseCatalogRoutes'));
app.use('/api/course-offerings', require('./routes/courseOfferingRoutes'));
app.use('/api/leaves',           require('./routes/leaveRoutes'));
app.use('/api/announcements',    require('./routes/announcementRoutes'));
app.use('/api/notifications',    require('./routes/notificationRoutes'));
app.use('/api/analytics',        require('./routes/analyticsRoutes'));
app.use('/api/audit-logs',       require('./routes/auditRoutes'));
app.use('/api/search',           require('./routes/searchRoutes'));

// ── Role Portals ─────────────────────────────────────────────────────
app.use('/api/teacher',          require('./routes/teacherRoutes'));
app.use('/api/student',          require('./routes/studentRoutes'));

// Root Route
app.get('/', (req, res) => {
  res.send('LabEval University Platform API is running...');
});

// Error Handler
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 LabEval Server running on port ${PORT}`));
