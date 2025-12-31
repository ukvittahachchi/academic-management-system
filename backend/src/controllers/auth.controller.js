const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const { setAuthCookies, clearAuthCookies } = require('../middlewares/auth.middleware');

class AuthController {
  // ======================
  // GET AUTH SYSTEM STATUS
  // ======================
  getStatus = asyncHandler(async (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Authentication system is operational',
      timestamp: new Date().toISOString()
    });
  });

  // ======================
  // USER LOGIN (WITH COOKIES)
  // ======================
  login = asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    const result = await authService.login(username, password, ipAddress, userAgent);

    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        user: result.user
      }
    });
  });

  // ======================
  // USER LOGOUT (WITH COOKIES)
  // ======================
  logout = asyncHandler(async (req, res) => {
    const userId = req.user?.userId;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    await authService.logout(userId, ipAddress, userAgent);

    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  });

  // ======================
  // REFRESH TOKEN (COOKIE-BASED)
  // ======================
  refreshToken = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided'
      });
    }

    const result = await authService.refreshToken(refreshToken);

    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.status(200).json({
      success: true,
      message: result.message
    });
  });

  // ======================
  // GET CURRENT USER
  // ======================
  getCurrentUser = asyncHandler(async (req, res) => {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const result = await authService.getCurrentUser(userId);

    res.status(200).json({
      success: true,
      data: result.user
    });
  });

  // ======================
  // CHANGE PASSWORD
  // ======================
  changePassword = asyncHandler(async (req, res) => {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const result = await authService.changePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: result.message
    });
  });

  // ======================
  // CHECK AUTH STATUS
  // ======================
  checkAuth = asyncHandler(async (req, res) => {
    if (req.user) {
      res.status(200).json({
        success: true,
        authenticated: true,
        user: {
          userId: req.user.userId,
          username: req.user.username,
          role: req.user.role,
          fullName: req.user.fullName,
          schoolId: req.user.schoolId,
          classGrade: req.user.classGrade,
          subject: req.user.subject,
          permissions: req.user.permissions
        }
      });
    } else {
      const refreshToken = req.cookies?.refreshToken;
      
      if (refreshToken) {
        return this.refreshToken(req, res);
      }
      
      res.status(200).json({
        success: true,
        authenticated: false,
        message: 'Not authenticated'
      });
    }
  });

  // ======================
  // GET ROLE INFO
  // ======================
  getRoleInfo = asyncHandler(async (req, res) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const rolePermissions = {
      student: {
        name: 'Student',
        description: 'Access learning materials and submit assignments',
        icon: '👨‍🎓',
        features: [
          'View ICT modules',
          'Access learning materials',
          'Submit MCQ assignments',
          'View grades and progress',
          'Track learning history'
        ]
      },
      teacher: {
        name: 'Teacher',
        description: 'Monitor student progress and manage class',
        icon: '👩‍🏫',
        features: [
          'View student progress',
          'Monitor class performance',
          'Export reports to Excel',
          'View assignment results',
          'Identify learning gaps'
        ]
      },
      admin: {
        name: 'Administrator',
        description: 'Manage system and users',
        icon: '👨‍💼',
        features: [
          'Manage user accounts',
          'Create and organize modules',
          'Upload learning materials',
          'Configure system settings',
          'View all reports and analytics'
        ]
      }
    };

    res.status(200).json({
      success: true,
      data: {
        role: req.user.role,
        roleInfo: rolePermissions[req.user.role] || {},
        permissions: req.user.permissions
      }
    });
  });
}

module.exports = new AuthController();