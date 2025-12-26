const express = require('express');
const router = express.Router();

// @route   GET /api/auth/status
// @desc    Check authentication status
// @access  Public
router.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth system is ready',
    features: {
      login: 'Username/password based',
      roles: ['student', 'teacher', 'admin'],
      passwordPolicy: 'Simple passwords for kids',
      noEmailRequired: true
    }
  });
});

// @route   POST /api/auth/login
// @desc    User login (placeholder)
// @access  Public
router.post('/login', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Login endpoint ready - implementation coming soon',
    note: 'Will accept username and password, return JWT token'
  });
});

// @route   POST /api/auth/register
// @desc    Register new user (admin only)
// @access  Public (will be protected later)
router.post('/register', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Registration endpoint ready - admin creates users',
    note: 'Students will be created by admin/teacher'
  });
});

module.exports = router;