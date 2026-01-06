
const path = require('path');
const database = require(path.join(__dirname, '../src/config/mysql'));
const User = require(path.join(__dirname, '../src/models/User.model'));
const authService = require(path.join(__dirname, '../src/services/auth.service'));
const bcrypt = require('bcryptjs');

async function checkLogins() {
    try {
        const users = ['test_student', 'test_teacher', 'test_admin'];

        console.log('--- Checking Logins ---');

        for (const username of users) {
            console.log(`\nTesting: ${username}`);
            const user = await User.findByUsername(username);

            if (!user) {
                console.log(`❌ User ${username} NOT FOUND in DB`);
                continue;
            }

            console.log(`✓ User found (Role: ${user.role})`);

            // Check password 'password123'
            const match = await bcrypt.compare('password123', user.password_hash);
            if (match) {
                console.log(`✅ Login SUCCESS with 'password123' (Direct bcrypt)`);
            } else {
                console.log(`❌ Login FAILED with 'password123' (Direct bcrypt)`);
                // Debug hash
                console.log(`   Hash in DB: ${user.password_hash ? user.password_hash.substring(0, 20) + '...' : 'NULL'}`);
            }

            // Check AuthService.login
            try {
                // Mock request logging parameters
                await authService.login(username, 'password123', '127.0.0.1', 'test-script');
                console.log(`✅ AuthService.login SUCCESS for ${username}`);
            } catch (err) {
                console.log(`❌ AuthService.login FAILED for ${username}`);
                console.log(`   Error: ${err.message}`);
                console.log(`   Stack: ${err.stack.split('\n')[1]}`);
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        try {
            if (database.pool) await database.pool.end();
            else if (database.close) await database.close();
        } catch (e) {
            console.log("Error closing DB:", e.message);
        }
        process.exit(0);
    }
}

checkLogins();
