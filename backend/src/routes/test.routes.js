const express = require('express');
const router = express.Router();
const testController = require('../controllers/test.controller');

// @route   GET /api/test/db
// @desc    Test database connection
// @access  Public
router.get('/db', testController.testDatabase);

// @route   GET /api/test/system
// @desc    Get system information
// @access  Public
router.get('/system', testController.getSystemInfo);

// @route   GET /api/test/students
// @desc    Get sample students
// @access  Public
router.get('/students', async (req, res) => {
  try {
    const database = require('../config/mysql');
    const [students] = await database.query(`
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
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/test/tables
// @desc    List all database tables
// @access  Public
router.get('/tables', async (req, res) => {
  try {
    const database = require('../config/mysql');
    const [tables] = await database.query(`
      SELECT TABLE_NAME, TABLE_ROWS 
      FROM information_schema.tables 
      WHERE table_schema = ?
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME]);
    
    res.json({
      success: true,
      tables: tables
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;