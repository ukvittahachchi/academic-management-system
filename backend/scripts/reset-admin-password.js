
const path = require('path');
const database = require(path.join(__dirname, '../src/config/mysql'));
const bcrypt = require('bcryptjs');

async function resetAdmin() {
    try {
        console.log('--- Resetting Admin Password ---');

        // Use a known salt to ensure consistency
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash('password123', salt);

        console.log(`New Hash: ${newHash}`);

        const username = 'test_admin';
        console.log(`Updating user: ${username}`);

        const sql = `
            UPDATE users 
            SET password_hash = ?,
                login_attempts = 0,
                account_locked_until = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE username = ?
        `;

        const [result] = await database.query(sql, [newHash, username]);

        console.log('Update Result:', result);

        if (result.affectedRows > 0) {
            console.log(`✅ ${username} updated successfully.`);
        } else {
            console.log(`❌ ${username} NOT FOUND.`);
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

resetAdmin();
