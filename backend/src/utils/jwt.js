const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { AppError } = require('./errors');

class JWTService {
  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET || 'academic_system_secret_key_2024';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'refresh_secret_key_2024_change_this';
    this.accessTokenExpiry = process.env.JWT_EXPIRE || '7d';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRE || '30d';
  }

  // ======================
  // GENERATE ACCESS TOKEN
  // ======================
  generateAccessToken(user) {
    try {
      if (!user || !user.user_id || !user.role) {
        throw new AppError('Invalid user data for token generation', 400);
      }

      const payload = {
        userId: user.user_id,
        username: user.username,
        role: user.role,
        schoolId: user.school_id,
        classGrade: user.class_grade || null,
        subject: user.subject || null,
        mustChangePassword: !!user.must_change_password
      };

      return jwt.sign(payload, this.accessTokenSecret, {
        expiresIn: this.accessTokenExpiry,
        issuer: 'academic-system-api',
        audience: 'academic-system-users'
      });
    } catch (error) {
      console.error('Generate Access Token Error:', error);
      throw new AppError('Failed to generate token', 500);
    }
  }

  // ======================
  // GENERATE REFRESH TOKEN
  // ======================
  generateRefreshToken(userId) {
    try {
      const tokenId = crypto.randomBytes(16).toString('hex');
      const payload = {
        tokenId,
        userId,
        type: 'refresh'
      };

      return jwt.sign(payload, this.refreshTokenSecret, {
        expiresIn: this.refreshTokenExpiry
      });
    } catch (error) {
      console.error('Generate Refresh Token Error:', error);
      throw new AppError('Failed to generate refresh token', 500);
    }
  }

  // ======================
  // VERIFY ACCESS TOKEN
  // ======================
  verifyAccessToken(token) {
    try {
      if (!token) {
        throw new AppError('No token provided', 401);
      }

      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'academic-system-api',
        audience: 'academic-system-users'
      });

      return {
        valid: true,
        decoded,
        error: null
      };
    } catch (error) {
      console.error('Verify Token Error:', error.name, error.message);

      let message = 'Invalid token';
      if (error.name === 'TokenExpiredError') {
        message = 'Token has expired';
      } else if (error.name === 'JsonWebTokenError') {
        message = 'Invalid token format';
      }

      return {
        valid: false,
        decoded: null,
        error: { message, type: error.name }
      };
    }
  }

  // ======================
  // VERIFY REFRESH TOKEN
  // ======================
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret);
      return {
        valid: true,
        decoded,
        error: null
      };
    } catch (error) {
      return {
        valid: false,
        decoded: null,
        error: error.message
      };
    }
  }

  // ======================
  // DECODE TOKEN WITHOUT VERIFICATION
  // ======================
  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  // ======================
  // GET TOKEN FROM HEADER
  // ======================
  getTokenFromHeader(req) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
      }

      return authHeader.split(' ')[1];
    } catch (error) {
      return null;
    }
  }

  // ======================
  // CREATE TOKEN RESPONSE
  // ======================
  createTokenResponse(user) {
    try {
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user.user_id);

      const decoded = this.decodeToken(accessToken);
      const expiresIn = decoded?.exp ? decoded.exp * 1000 : null;

      return {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn,
        user: {
          userId: user.user_id,
          username: user.username,
          fullName: user.full_name,
          role: user.role,
          schoolId: user.school_id,
          classGrade: user.class_grade,
          subject: user.subject,
          mustChangePassword: !!user.must_change_password
        }
      };
    } catch (error) {
      console.error('Create Token Response Error:', error);
      throw new AppError('Failed to create token response', 500);
    }
  }
}

// Create singleton instance
const jwtService = new JWTService();

module.exports = jwtService;