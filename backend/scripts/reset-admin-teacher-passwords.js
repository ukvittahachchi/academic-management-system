
const path = require('path');
const database = require(path.join(__dirname, '../src/config/mysql'));
const bcrypt = require('bcryptjs');

async function resetPasswords() {
    try {
        console.log('--- Resetting Passwords ---');

        // Use a known salt to ensure consistency if needed, or just let bcrypt generate one
        // Using 10 rounds as per standard
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash('password123', salt);

        console.log(`Generated new hash for 'password123': ${newHash.substring(0, 20)}...`);

        const usersToReset = ['test_teacher', 'test_admin'];

        for (const username of usersToReset) {
            console.log(`\nUpdating user: ${username}`);

            // Update password and unlock account
            const sql = `
                UPDATE users 
                SET password_hash = ?,
                    password_reset_token = NULL,
                    password_reset_expires = NULL,
                    login_attempts = 0,
                    account_locked_until = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE username = ?
            `;

            const [result] = await database.query(sql, [newHash, username]);

            if (result.affectedRows > 0) {
                console.log(`✅ ${username} updated successfully.`);
            } else {
                console.log(`❌ ${username} NOT FOUND.`);
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

resetPasswords();
