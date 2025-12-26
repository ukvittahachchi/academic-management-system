const { errorResponse, AppError } = require('../utils/errors');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('🔥 Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err.name === 'JsonWebTokenError') {
    err = new AppError('Invalid token. Please log in again.', 401);
  }

  if (err.name === 'TokenExpiredError') {
    err = new AppError('Your token has expired. Please log in again.', 401);
  }

  if (err.name === 'ValidationError') {
    err = new AppError(err.message, 400);
  }

  if (err.code === 'ER_DUP_ENTRY') {
    err = new AppError('Duplicate entry found. This record already exists.', 409);
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    err = new AppError('Referenced record not found.', 404);
  }

  // Handle database connection errors
  if (err.code === 'ECONNREFUSED') {
    err = new AppError('Database connection failed. Please try again later.', 503);
  }

  // MongoDB errors
  if (err.name === 'MongoError') {
    if (err.code === 11000) {
      err = new AppError('Duplicate key error. This record already exists.', 409);
    } else {
      err = new AppError('Database operation failed.', 500);
    }
  }

  // Send error response
  errorResponse(err, req, res);
};

module.exports = errorHandler;