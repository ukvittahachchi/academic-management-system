const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const mysqlDB = require('./config/mysql');
const mongoDB = require('./config/mongodb');



// ======================
// LOAD ENV VARIABLES
// ======================
dotenv.config();

// ======================
// DATABASE CONNECTIONS
// ======================
const connectMySQL = require('./config/mysql');
const connectMongoDB = require('./config/mongodb');

// ======================
// ROUTES
// ======================
const testRoutes = require('./routes/test.routes');
const authRoutes = require('./routes/auth.routes');

// ======================
// INIT APP
// ======================
const app = express();

// ======================
// SECURITY MIDDLEWARE
// ======================
app.use(helmet());

app.use(
  cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  })
);

// ======================
// RATE LIMITING
// ======================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

// ======================
// BODY PARSING
// ======================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ======================
// LOGGING
// ======================
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ======================
// STATIC FILES
// ======================
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ======================
// REQUEST LOGGER
// ======================
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// ======================
// HEALTH CHECK
// ======================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    message: 'Academic Management System API is running 🚀',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      test: '/api/test',
      auth: '/api/auth',
      students: '/api/students',
      teachers: '/api/teachers',
      admin: '/api/admin',
    },
  });
});

// ======================
// API ROUTES
// ======================
app.use('/api/test', testRoutes);
app.use('/api/auth', authRoutes);

// ======================
// 404 HANDLER (FIXED ✅)
// ======================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
    suggestion: 'Check /api/health for available endpoints',
  });
});

// ======================
// GLOBAL ERROR HANDLER
// ======================
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ======================
// DATABASE INIT
// ======================
const initializeDatabases = async () => {
  try {
    await mysqlDB.connect();   // ✅ correct
    await mongoDB.connect();   // ✅ correct
    console.log('✅ All databases connected successfully!');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};


// ======================
// START SERVER
// ======================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await initializeDatabases();

    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(50));
      console.log('🎓 ACADEMIC MANAGEMENT SYSTEM BACKEND');
      console.log('='.repeat(50));
      console.log(`✅ Server running on: http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`📚 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🎯 Frontend URL: ${process.env.FRONTEND_URL}`);
      console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
      console.log('='.repeat(50) + '\n');
    });
  } catch (error) {
    console.error('🔥 Failed to start server:', error);
    process.exit(1);
  }
};

// ======================
// GRACEFUL SHUTDOWN
// ======================
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// ======================
// RUN SERVER
// ======================
startServer();
