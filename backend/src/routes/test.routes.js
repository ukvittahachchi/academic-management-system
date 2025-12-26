const express = require('express');
const router = express.Router();
// Import your custom wrapper instance directly
const database = require('../config/mysql'); 

// @route   GET /api/test/db
// @desc    Test database connection
// @access  Public
router.get('/db', async (req, res) => {
  try {
    // 🟢 FIX: No destructuring [ ] because your wrapper already returns the data
    const result = await database.query('SELECT 1 as val');
    
    res.json({
      success: true,
      message: 'MySQL Connected Successfully! 🚀',
      data: result
    });
  } catch (error) {
    console.error('DB Test Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/test/students
// @desc    Get sample students
// @access  Public
router.get('/students', async (req, res) => {
  try {
    // 🟢 FIX: Removed [ ] around 'students'
    const students = await database.query(`
      SELECT user_id, username, full_name, class_grade, roll_number 
      FROM users 
      WHERE role = 'student' 
      LIMIT 5
    `);
    
    res.json({
      success: true,
      count: students.length,
      students: students
    });
  } catch (error) {
    console.error('Students Query Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/test/tables
// @desc    List all database tables
// @access  Public
router.get('/tables', async (req, res) => {
  try {
    // 🟢 FIX: Removed [ ] around 'tables'
    const tables = await database.query(`
      SELECT TABLE_NAME, TABLE_ROWS 
      FROM information_schema.tables 
      WHERE table_schema = ?
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME || 'academic_system']);
    
    res.json({
      success: true,
      tables: tables
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/test/cors
// @desc    Test CORS configuration
// @access  Public
router.get('/cors', (req, res) => {
  res.json({
    success: true,
    message: 'CORS is working correctly!',
    cors: {
      origin: req.headers.origin || 'Not set',
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
    }
  });
});

// @route   POST /api/test/echo
// @desc    Echo back request data
// @access  Public
router.post('/echo', (req, res) => {
  res.json({
    success: true,
    message: 'POST request received',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;