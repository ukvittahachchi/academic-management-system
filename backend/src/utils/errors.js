// Custom Error Classes
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message || 'Validation failed', 400);
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500);
  }
}

// Error Response Formatter
const errorResponse = (error, req, res) => {
  // Default error
  const statusCode = error.statusCode || 500;
  const status = error.status || 'error';
  const message = error.message || 'Something went wrong';
  
  const response = {
    success: false,
    status,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      error: error.stack,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    })
  };

  // Add validation errors if present
  if (error.errors && Array.isArray(error.errors)) {
    response.validationErrors = error.errors;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  errorResponse
};