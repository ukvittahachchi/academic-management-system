const jwtService = require('../utils/jwt');
const { AppError, AuthenticationError, AuthorizationError } = require('../utils/errors');
const User = require('../models/User.model');

// ======================
// ENHANCED AUTHENTICATION MIDDLEWARE
// ======================
const authenticate = async (req, res, next) => {
  try {
    // Get token from header or cookie
    const token = jwtService.getTokenFromHeader(req) || req.cookies?.accessToken;

    if (!token) {
      throw new AuthenticationError('No authentication token provided');
    }

    // Verify token
    const { valid, decoded, error } = jwtService.verifyAccessToken(token);

    if (!valid) {
      // Try to refresh token if expired
      if (error?.type === 'TokenExpiredError' && req.cookies?.refreshToken) {
        return await handleTokenRefresh(req, res, next);
      }
      throw new AuthenticationError(error?.message || 'Invalid token');
    }

    // Verify user still exists and is active
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new AuthenticationError('User account no longer exists');
    }

    if (!user.is_active) {
      throw new AuthenticationError('Your account has been deactivated');
    }

    // Attach enhanced user data to request
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      schoolId: decoded.schoolId,
      classGrade: decoded.classGrade,
      subject: decoded.subject,
      fullName: user.full_name,
      permissions: getUserPermissions(decoded.role)
    };

    next();
  } catch (error) {
    next(error);
  }
};

// ======================
// TOKEN REFRESH HANDLER
// ======================
const handleTokenRefresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      throw new AuthenticationError('Session expired. Please login again.');
    }

    const { valid, decoded } = jwtService.verifyRefreshToken(refreshToken);
    
    if (!valid) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // Get user and generate new tokens
    const user = await User.findById(decoded.userId);
    if (!user || !user.is_active) {
      throw new AuthenticationError('User not found or inactive');
    }

    const tokens = jwtService.createTokenResponse(user);
    
    // Set new tokens in cookies
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    
    // Attach user to request
    req.user = {
      userId: user.user_id,
      username: user.username,
      role: user.role,
      schoolId: user.school_id,
      classGrade: user.class_grade,
      subject: user.subject,
      fullName: user.full_name,
      permissions: getUserPermissions(user.role)
    };

    // Add refreshed flag to response
    res.locals.tokenRefreshed = true;
    
    next();
  } catch (error) {
    next(error);
  }
};

// ======================
// ROLE PERMISSIONS
// ======================
const getUserPermissions = (role) => {
  const permissions = {
    student: [
      'view_modules',
      'access_learning_materials',
      'submit_assignments',
      'view_grades',
      'view_own_progress'
    ],
    teacher: [
      'view_modules',
      'view_student_progress',
      'view_class_analytics',
      'export_reports',
      'manage_assignments'
    ],
    admin: [
      'manage_users',
      'manage_modules',
      'manage_system',
      'view_all_reports',
      'configure_settings',
      'access_all_features'
    ]
  };
  
  return permissions[role] || [];
};

// ======================
// ROLE-BASED AUTHORIZATION
// ======================
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      if (!allowedRoles.includes(req.user.role)) {
        const requiredRoles = allowedRoles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ');
        throw new AuthorizationError(
          `Access denied. This area is for ${requiredRoles} only.`
        );
      }

      // Check if user has required permissions for the route
      if (req.routePermissions) {
        const hasPermission = req.routePermissions.some(perm => 
          req.user.permissions.includes(perm)
        );
        
        if (!hasPermission) {
          throw new AuthorizationError('You do not have permission to perform this action');
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// ======================
// ROLE-SPECIFIC MIDDLEWARE
// ======================
const studentOnly = (req, res, next) => {
  req.routePermissions = ['view_own_progress', 'submit_assignments'];
  authorize('student')(req, res, next);
};

const teacherOnly = (req, res, next) => {
  req.routePermissions = ['view_student_progress', 'export_reports'];
  authorize('teacher')(req, res, next);
};

const adminOnly = (req, res, next) => {
  req.routePermissions = ['manage_users', 'manage_system'];
  authorize('admin')(req, res, next);
};

// ======================
// PERMISSION CHECK MIDDLEWARE
// ======================
const requirePermission = (...permissions) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const hasPermission = permissions.some(perm => 
        req.user.permissions.includes(perm)
      );

      if (!hasPermission) {
        throw new AuthorizationError(
          `You need ${permissions.join(' or ')} permission to access this resource`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// ======================
// COOKIE HELPER FUNCTIONS
// ======================
const setAuthCookies = (res, accessToken, refreshToken) => {
  // Access token cookie (short-lived)
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });

  // Refresh token cookie (long-lived, more secure)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/api/auth/refresh'
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
};

// ======================
// SCHOOL ACCESS CHECK
// ======================
const checkSchoolAccess = (schoolIdParam = 'schoolId') => {
  return (req, res, next) => {
    try {
      const userSchoolId = req.user?.schoolId;
      const requestedSchoolId = req.params[schoolIdParam] || req.body.schoolId;

      if (!userSchoolId) {
        throw new AuthenticationError('User school information missing');
      }

      // Admin can access all schools
      if (req.user.role === 'admin') {
        return next();
      }

      // Others can only access their own school
      if (requestedSchoolId && requestedSchoolId != userSchoolId) {
        throw new AuthorizationError('Access to this school is restricted');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// ======================
// OPTIONAL AUTHENTICATION MIDDLEWARE
// ======================
const tryAuthenticate = async (req, res, next) => {
  try {
    // Get token from header or cookie
    const token = jwtService.getTokenFromHeader(req) || req.cookies?.accessToken;

    if (!token) {
      return next();
    }

    // Verify token
    const { valid, decoded } = jwtService.verifyAccessToken(token);

    if (!valid) {
      return next();
    }

    // Verify user still exists and is active
    const user = await User.findById(decoded.userId);
    if (!user || !user.is_active) {
      return next();
    }

    // Attach user data to request
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      schoolId: decoded.schoolId,
      classGrade: decoded.classGrade,
      subject: decoded.subject,
      fullName: user.full_name,
      permissions: getUserPermissions(decoded.role)
    };

    next();
  } catch (error) {
    // On any error, just proceed as unauthenticated
    next();
  }
};

module.exports = {
  authenticate,
  tryAuthenticate,
  authorize,
  studentOnly,
  teacherOnly,
  adminOnly,
  requirePermission,
  setAuthCookies,
  clearAuthCookies,
  checkSchoolAccess
};