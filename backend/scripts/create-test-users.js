// Script to create test users for authentication tests

require('dotenv').config();
const User = require('../src/models/User.model');

// You may need to set this to your actual school_id if required by your schema
const SCHOOL_ID = 1;

async function createTestUsers() {
  try {
    const users = [
      {
        school_id: SCHOOL_ID,
        username: 'test_student',
        full_name: 'Test Student',
        role: 'student',
        class_grade: '10A',
        plain_password: 'password123',
      },
      {
        school_id: SCHOOL_ID,
        username: 'test_teacher',
        full_name: 'Test Teacher',
        role: 'teacher',
        subject: 'Mathematics',
        plain_password: 'password123',
      },
      {
        school_id: SCHOOL_ID,
        username: 'test_admin',
        full_name: 'Test Admin',
        role: 'admin',
        plain_password: 'password123',
      },
    ];

    for (const user of users) {
      try {
        // Check if user already exists
        const existing = await User.findByUsername(user.username);
        if (existing) {
          console.log(`User already exists: ${user.username}`);
          // Reset password to 'password123'
          await User.updatePassword(existing.user_id, 'password123');
          console.log(`Password reset for user: ${user.username}`);
        } else {
          console.log(`No existing user found for: ${user.username}, creating...`);
          await User.create(user);
          console.log(`Created user: ${user.username}`);
        }
      } catch (err) {
        console.error(`Error creating user ${user.username}:`, err.message || err);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error('Error creating test users:', err);
    process.exit(1);
  }
}

createTestUsers();
