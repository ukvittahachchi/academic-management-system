const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'academic_system',
    port: process.env.DB_PORT || 3306
};

async function checkStudent() {
    console.log('Using config:', { ...config, password: '***' });
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('Connected to DB');

        const [rows] = await connection.execute('SELECT username, password_hash FROM users WHERE username = ?', ['test_student']);

        if (rows.length > 0) {
            console.log('User found:', rows[0].username);
            console.log('Hash:', rows[0].password_hash);

            const match = await bcrypt.compare('password123', rows[0].password_hash);
            console.log('Password "password123" matches:', match);
        } else {
            console.log('User test_student not found');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (connection) await connection.end();
    }
}

checkStudent();
