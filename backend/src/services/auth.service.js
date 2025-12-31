const User = require('../models/User.model');
const jwtService = require('../utils/jwt');
const { AppError, AuthenticationError } = require('../utils/errors');

class AuthService {
  // ======================
  // USER LOGIN
  // ======================
  async login(username, password, ipAddress = null, userAgent = null) {
    try {
      // 1. Validate input
      if (!username || !password) {
        throw new AppError('Username and password are required', 400);
      }

      // 2. Check if account is locked
      const isLocked = await User.isAccountLocked(username);
      if (isLocked) {
        const remainingTime = await User.getLockTimeRemaining(username);
        await User.logAuthActivity(null, 'account_locked', ipAddress, userAgent, {
          username,
          reason: 'Too many failed attempts',
          lockTimeRemaining: remainingTime
        });
        
        throw new AuthenticationError(
          `Account is temporarily locked. Please try again in ${Math.ceil(remainingTime / 60)} minutes.`
        );
      }

      // 3. Find user
      const user = await User.findByUsername(username);
      if (!user) {
        await User.updateLoginAttempts(username, false);
        await User.logAuthActivity(null, 'login_failed', ipAddress, userAgent, {
          username,
          reason: 'User not found'
        });
        
        throw new AuthenticationError('Invalid username or password');
      }

      // 4. Check if user is active
      if (!user.is_active) {
        await User.logAuthActivity(user.user_id, 'login_failed', ipAddress, userAgent, {
          reason: 'Account is inactive'
        });
        
        throw new AuthenticationError('Your account is inactive. Please contact administrator.');
      }

      // 5. Verify password
      const isPasswordValid = await User.verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        await User.updateLoginAttempts(username, false);
        await User.logAuthActivity(user.user_id, 'login_failed', ipAddress, userAgent, {
          reason: 'Invalid password'
        });
        
        throw new AuthenticationError('Invalid username or password');
      }

      // 6. Successful login - update attempts and log
      await User.updateLoginAttempts(username, true);
      await User.logAuthActivity(user.user_id, 'login', ipAddress, userAgent);

      // 7. Remove sensitive data before returning
      const safeUser = { ...user };
      delete safeUser.password_hash;
      delete safeUser.password_reset_token;
      delete safeUser.password_reset_expires;

      // 8. Generate tokens
      const tokens = jwtService.createTokenResponse(safeUser);

      return {
        success: true,
        message: 'Login successful',
        ...tokens
      };

    } catch (error) {
      console.error('Login Service Error:', error);
      
      // Re-throw AppError instances, wrap others
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Login failed. Please try again.', 500);
    }
  }

  // ======================
  // USER LOGOUT
  // ======================
  async logout(userId, ipAddress = null, userAgent = null) {
    try {
      if (userId) {
        await User.logAuthActivity(userId, 'logout', ipAddress, userAgent);
      }
      
      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error) {
      console.error('Logout Service Error:', error);
      // Don't throw error for logout failures
      return {
        success: true,
        message: 'Logout completed'
      };
    }
  }

  // ======================
  // REFRESH TOKEN
  // ======================
  async refreshToken(refreshToken) {
    try {
      if (!refreshToken) {
        throw new AppError('Refresh token is required', 400);
      }

      // Verify refresh token
      const { valid, decoded } = jwtService.verifyRefreshToken(refreshToken);
      if (!valid || !decoded) {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Get user data
      const user = await User.findById(decoded.userId);
      if (!user || !user.is_active) {
        throw new AuthenticationError('User not found or inactive');
      }

      // Generate new tokens
      const tokens = jwtService.createTokenResponse(user);

      return {
        success: true,
        message: 'Token refreshed successfully',
        ...tokens
      };

    } catch (error) {
      console.error('Refresh Token Service Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to refresh token', 500);
    }
  }

  // ======================
  // GET CURRENT USER
  // ======================
  async getCurrentUser(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      if (!user.is_active) {
        throw new AuthenticationError('Your account is inactive');
      }

      // Remove sensitive data
      const safeUser = { ...user };
      delete safeUser.password_hash;
      delete safeUser.password_reset_token;
      delete safeUser.password_reset_expires;

      return {
        success: true,
        user: safeUser
      };

    } catch (error) {
      console.error('Get Current User Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get user data', 500);
    }
  }

  // ======================
  // CHANGE PASSWORD
  // ======================
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Validate passwords
      if (!currentPassword || !newPassword) {
        throw new AppError('Current and new passwords are required', 400);
      }

      if (newPassword.length < 6) {
        throw new AppError('New password must be at least 6 characters', 400);
      }

      // Get user with password
      const sql = `SELECT password_hash FROM users WHERE user_id = ?`;
      const database = require('../config/mysql');
      const [users] = await database.query(sql, [userId]);
      
      if (users.length === 0) {
        throw new AuthenticationError('User not found');
      }

      const user = users[0];

      // Verify current password
      const bcrypt = require('bcryptjs');
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isPasswordValid) {
        throw new AuthenticationError('Current password is incorrect');
      }

      // Update to new password
      await User.updatePassword(userId, newPassword);

      return {
        success: true,
        message: 'Password changed successfully'
      };

    } catch (error) {
      console.error('Change Password Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to change password', 500);
    }
  }

  // ======================
  // VALIDATE TOKEN
  // ======================
  async validateToken(token) {
    try {
      const { valid, decoded, error } = jwtService.verifyAccessToken(token);
      
      if (!valid) {
        return {
          valid: false,
          error: error?.message || 'Invalid token'
        };
      }

      // Check if user still exists and is active
      const user = await User.findById(decoded.userId);
      if (!user || !user.is_active) {
        return {
          valid: false,
          error: 'User not found or inactive'
        };
      }

      return {
        valid: true,
        user: {
          userId: decoded.userId,
          username: decoded.username,
          role: decoded.role,
          schoolId: decoded.schoolId,
          classGrade: decoded.classGrade,
          subject: decoded.subject
        }
      };

    } catch (error) {
      console.error('Validate Token Error:', error);
      return {
        valid: false,
        error: 'Token validation failed'
      };
    }
  }
}

// Create singleton instance
const authService = new AuthService();

module.exports = authService;