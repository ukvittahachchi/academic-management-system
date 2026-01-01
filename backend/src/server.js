const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser'); // Added cookie-parser
const dotenv = require('dotenv'); // Fixed: changed from 'path' to 'dotenv'
const path = require('path');
const moduleRoutes = require('./routes/module.routes');
const navigationRoutes = require('./routes/navigation.routes');

// Load environment variables
require('dotenv').config();

// Import database connections
const database = require('./config/mysql');
const mongoDB = require('./config/mongodb');

// Import routes
const testRoutes = require('./routes/test.routes');
const authRoutes = require('./routes/auth.routes');

// Import error handler
const errorHandler = require('./middlewares/error.middleware');
const logger = require('./utils/logger');

// Initialize Express app
const app = express();

// ======================
// CORS ALLOWED ORIGINS
// ======================
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  // Add your production domains later
  // 'https://your-school-domain.com',
];

// ======================
// SECURITY MIDDLEWARE
// ======================
app.use(helmet()); // Security headers

// ======================
// COOKIE PARSER (Added after helmet)
// ======================
app.use(cookieParser()); // Parse cookies

// ======================
// CORS CONFIGURATION
// ======================
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins for easier testing
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true, // This is important for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'Cookie', // Added to allow cookies in headers if needed
    'Set-Cookie' // Added to allow set-cookie headers
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'Set-Cookie'], // Added Set-Cookie
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// ======================
// RATE LIMITING
// ======================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
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
  app.use(morgan('dev', { stream: logger.stream })); // Log HTTP requests
}

// ======================
// STATIC FILES
// ======================
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ======================
// REQUEST LOGGER (Custom)
// ======================
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log cookies if present (useful for debugging)
  if (req.cookies && Object.keys(req.cookies).length > 0) {
    logger.debug(`Cookies received: ${JSON.stringify(req.cookies)}`);
  }
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// ======================
// HEALTH CHECK ROUTE
// ======================
app.get('/api/health', (req, res) => {
  const origin = req.headers.origin || 'Not specified';
  const isOriginAllowed = allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development';
  
  // Get cookies info
  const cookies = req.cookies || {};
  
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
      admin: '/api/admin'
    },
    database: {
      mysql: 'Connected',
      mongodb: 'Connected'
    },
    cors: {
      origin: origin,
      allowed: isOriginAllowed,
      allowedOrigins: allowedOrigins,
      credentials: true
    },
    cookies: {
      enabled: true,
      count: Object.keys(cookies).length,
      keys: Object.keys(cookies)
    },
    server: {
      port: process.env.PORT || 5000,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }
  });
});

// ======================
// ROOT ROUTE
// ======================
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Academic Management System API',
    documentation: 'Visit /api/health for API information',
    frontend: process.env.FRONTEND_URL || 'http://localhost:3000',
    version: '1.0.0',
    cors: {
      allowedOrigins: allowedOrigins,
      credentials: true
    },
    features: {
      cookies: 'Enabled',
      authentication: 'Available via /api/auth'
    }
  });
});

// ======================
// API ROUTES
// ======================
app.use('/api/test', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/navigation', navigationRoutes);

// ======================
// 404 NOT FOUND HANDLER
// ======================
app.use('*', (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// ======================
// GLOBAL ERROR HANDLER (MUST BE LAST)
// ======================
app.use(errorHandler);

// ======================
// DATABASE CONNECTIONS
// ======================
const initializeDatabases = async () => {
  try {
    await database.connect();
    await mongoDB.connect();
    logger.info('✅ All databases connected successfully!');
  } catch (error) {
    logger.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// ======================
// START SERVER
// ======================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to databases first
    await initializeDatabases();
    
    // Start Express server
    const server = app.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('🎓 ACADEMIC MANAGEMENT SYSTEM BACKEND');
      console.log('='.repeat(60));
      console.log(`✅ Server running on: http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`📚 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🎯 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`🍪 Cookie Parser: Enabled`);
      console.log(`🔐 CORS with Credentials: Enabled`);
      console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
      console.log(`🌐 CORS Origins: ${allowedOrigins.join(', ')}`);
      console.log('='.repeat(60));
      console.log('\n📋 Available Routes:');
      console.log('  GET  /api/health     - Health check');
      console.log('  GET  /api/test/db    - Test database connection');
      console.log('  GET  /api/test/system - Get system information');
      console.log('  GET  /api/test/students - Get sample students');
      console.log('  GET  /api/test/cors   - Test CORS configuration');
      console.log('  POST /api/test/echo   - Echo POST request');
      console.log('  GET  /api/auth/status - Auth system status');
      console.log('  POST /api/auth/login  - User login');
      console.log('  POST /api/auth/register - User registration');
      console.log('='.repeat(60) + '\n');
    });
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
        console.error(`❌ Port ${PORT} is already in use. Please kill the process or use a different port.`);
        process.exit(1);
      } else {
        logger.error('Server error:', error);
        throw error;
      }
    });
    
  } catch (error) {
    logger.error('🔥 Failed to start server:', error);
    console.error('🔥 Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM received. Shutting down gracefully...');
  console.log('\n👋 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('👋 SIGINT received. Shutting down gracefully...');
  console.log('\n👋 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Export app for testing
module.exports = { app, allowedOrigins };

// Start the server only if this file is run directly
if (require.main === module) {
  startServer();
}