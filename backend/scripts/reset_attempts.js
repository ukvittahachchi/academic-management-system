const db = require('../src/config/mysql');

async function checkAttempts() {
    try {
        await db.connect();

        console.log('Checking attempts for user ID 3 (test_student) and part ID 4 (assignment 4)');

        // Get assignment ID for part 4
        const assignmentRows = await db.execute('SELECT assignment_id, max_attempts FROM assignments WHERE part_id = 4');
        const assignment = assignmentRows[0];

        console.log('Assignment:', assignment);

        if (assignment) {
            console.log('Clearing all data for this assignment and user...');

            // Delete existing submissions first (to avoid unique constraint violation on insert later)
            await db.execute('DELETE FROM submissions WHERE assignment_id = ? AND student_id = 3', [assignment.assignment_id]);
            console.log('Submissions deleted');

            // Delete attempts
            await db.execute('DELETE FROM assignment_attempts WHERE assignment_id = ? AND student_id = 3', [assignment.assignment_id]);
            console.log('Attempts deleted');

            // Delete results
            await db.execute('DELETE FROM assignment_results WHERE assignment_id = ? AND student_id = 3', [assignment.assignment_id]);
            console.log('Results deleted');
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkAttempts();
