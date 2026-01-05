const db = require('../config/mysql');

async function checkContent() {
    try {
        console.log('Checking learning_parts table...');
        const rows = await db.execute('SELECT part_id, title, part_type FROM learning_parts LIMIT 10');
        console.log('Found parts:', rows);

        const specific = await db.execute('SELECT * FROM learning_parts WHERE part_id = 11');
        console.log('Part 11:', specific);

        await db.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkContent();
