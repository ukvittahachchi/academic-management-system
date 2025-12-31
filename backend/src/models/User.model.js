const database = require('../config/mysql');
const bcrypt = require('bcryptjs');
const { AppError } = require('../utils/errors');

class User {
  // ======================
  // CREATE USER
  // ======================
  static async create(userData) {
    const {
      school_id,
      username,
      full_name,
      role,
      class_grade = null,
      roll_number = null,
      subject = null,
      plain_password
    } = userData;

    // Validate required fields
    if (!school_id || !username || !full_name || !role || !plain_password) {
      throw new AppError('Missing required fields', 400);
    }

    // Check if username already exists
    const existingUser = await this.findByUsername(username);
    if (existingUser) {
      throw new AppError('Username already exists', 409);
    }

    // Hash password (simple for kids, but still secure)
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(plain_password, salt);

    const sql = `
      INSERT INTO users (
        school_id, username, full_name, role, 
        class_grade, roll_number, subject, password_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      school_id, username, full_name, role,
      class_grade, roll_number, subject, password_hash
    ];

    try {
      const result = await database.query(sql, params);
      return this.findById(result.insertId);
    } catch (error) {
      console.error('Create User Error:', error);
      throw new AppError('Failed to create user', 500);
    }
  }

  // ======================
  // FIND USER BY ID
  // ======================
  static async findById(userId) {
    try {
      const sql = `
        SELECT 
          user_id, school_id, username, full_name, role,
          class_grade, roll_number, subject, is_active,
          last_login, created_at, updated_at,
          profile_picture_url, date_of_birth, parent_contact
        FROM users 
        WHERE user_id = ?
      `;
      const users = await database.query(sql, [userId]);
      return users && users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Find User By ID Error:', error);
      throw new AppError('Failed to find user', 500);
    }
  }

  // ======================
  // FIND USER BY USERNAME
  // ======================
  static async findByUsername(username) {
    try {
      const sql = `
        SELECT 
          user_id, school_id, username, full_name, role,
          class_grade, roll_number, subject, is_active,
          password_hash, login_attempts, account_locked_until,
          last_login, created_at
        FROM users 
        WHERE username = ?
      `;
      const users = await database.query(sql, [username]);
      return users && users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Find User By Username Error:', error);
      throw new AppError('Failed to find user', 500);
    }
  }

  // ======================
  // VERIFY PASSWORD
  // ======================
  static async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Password Verification Error:', error);
      return false;
    }
  }

  // ======================
  // UPDATE LOGIN ATTEMPTS
  // ======================
  static async updateLoginAttempts(username, success) {
    try {
      if (success) {
        // Reset on successful login
        const sql = `
          UPDATE users 
          SET login_attempts = 0, 
              account_locked_until = NULL,
              last_login = CURRENT_TIMESTAMP
          WHERE username = ?
        `;
        await database.query(sql, [username]);
      } else {
        // Increment on failed login
        const sql = `
          UPDATE users 
          SET login_attempts = login_attempts + 1,
              account_locked_until = CASE 
                WHEN login_attempts >= 4 THEN DATE_ADD(NOW(), INTERVAL 15 MINUTE)
                ELSE account_locked_until
              END
          WHERE username = ?
        `;
        await database.query(sql, [username]);
      }
    } catch (error) {
      console.error('Update Login Attempts Error:', error);
    }
  }

  // ======================
  // CHECK IF ACCOUNT IS LOCKED - FIXED!
  // ======================
  static async isAccountLocked(username) {
    try {
      const sql = `
        SELECT account_locked_until 
        FROM users 
        WHERE username = ? 
          AND account_locked_until > NOW()
      `;
      const result = await database.query(sql, [username]);
      return result && result.length > 0;
    } catch (error) {
      console.error('Check Account Locked Error:', error);
      return false;
    }
  }

  // ======================
  // GET ACCOUNT LOCK TIME REMAINING - FIXED!
  // ======================
  static async getLockTimeRemaining(username) {
    try {
      const sql = `
        SELECT TIMESTAMPDIFF(SECOND, NOW(), account_locked_until) as seconds_remaining
        FROM users 
        WHERE username = ? 
          AND account_locked_until > NOW()
      `;
      const result = await database.query(sql, [username]);
      return result && result.length > 0 ? result[0].seconds_remaining : 0;
    } catch (error) {
      console.error('Get Lock Time Error:', error);
      return 0;
    }
  }

  // ======================
  // UPDATE PASSWORD
  // ======================
  static async updatePassword(userId, newPassword) {
    try {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(newPassword, salt);

      const sql = `
        UPDATE users 
        SET password_hash = ?, 
            password_reset_token = NULL,
            password_reset_expires = NULL,
            login_attempts = 0,
            account_locked_until = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `;

      await database.query(sql, [password_hash, userId]);
      return true;
    } catch (error) {
      console.error('Update Password Error:', error);
      throw new AppError('Failed to update password', 500);
    }
  }

  // ======================
  // GET USER ROLE - FIXED!
  // ======================
  static async getUserRole(userId) {
    try {
      const sql = `SELECT role FROM users WHERE user_id = ?`;
      const result = await database.query(sql, [userId]);
      return result && result.length > 0 ? result[0].role : null;
    } catch (error) {
      console.error('Get User Role Error:', error);
      return null;
    }
  }

  // ======================
  // LOG AUTH ACTIVITY - FIXED! (No JSON in SQL params)
  // ======================
  static async logAuthActivity(userId, activityType, ipAddress = null, userAgent = null, details = null) {
    try {
      const sql = `
        INSERT INTO auth_activity_logs 
        (user_id, activity_type, ip_address, user_agent, details)
        VALUES (?, ?, ?, ?, ?)
      `;

      // Convert details object to string if it exists
      const detailsString = details ? JSON.stringify(details) : null;

      await database.query(sql, [userId, activityType, ipAddress, userAgent, detailsString]);
    } catch (error) {
      console.error('Log Auth Activity Error:', error);
      // Don't throw error for logging failures
    }
  }

  // ======================
  // GET STUDENTS BY CLASS - FIXED!
  // ======================
  static async getStudentsByClass(schoolId, classGrade) {
    try {
      const sql = `
        SELECT 
          user_id, username, full_name, roll_number,
          last_login, created_at
        FROM users 
        WHERE school_id = ? 
          AND role = 'student'
          AND class_grade = ?
          AND is_active = TRUE
        ORDER BY roll_number
      `;
      const students = await database.query(sql, [schoolId, classGrade]);
      return students || [];
    } catch (error) {
      console.error('Get Students By Class Error:', error);
      throw new AppError('Failed to get students', 500);
    }
  }

  // ======================
  // GET TEACHERS BY SUBJECT - FIXED!
  // ======================
  static async getTeachersBySubject(schoolId, subject) {
    try {
      const sql = `
        SELECT 
          user_id, username, full_name, subject,
          last_login, created_at
        FROM users 
        WHERE school_id = ? 
          AND role = 'teacher'
          AND subject = ?
          AND is_active = TRUE
        ORDER BY full_name
      `;
      const teachers = await database.query(sql, [schoolId, subject]);
      return teachers || [];
    } catch (error) {
      console.error('Get Teachers By Subject Error:', error);
      throw new AppError('Failed to get teachers', 500);
    }
  }
}

module.exports = User;