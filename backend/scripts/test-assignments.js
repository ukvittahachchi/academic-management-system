const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let authToken = '';

async function testAssignmentSystem() {
    console.log('[INFO] Testing Assignment System...\n');

    try {
        // 1. Login
        console.log('[STEP 1] Logging in as student...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'test_student',
            password: 'password123'
        });



        // Extract token from cookies
        const setCookieHeaders = loginRes.headers['set-cookie'];
        if (setCookieHeaders) {
            const accessTokenCookie = setCookieHeaders.find(c => c.startsWith('accessToken='));
            if (accessTokenCookie) {
                authToken = accessTokenCookie.split(';')[0].split('=')[1];
            }
        }

        console.log('[SUCCESS] Login successful. Token: ' + (authToken ? authToken.substring(0, 50) + '...' : 'MISSING'));

        const headers = {
            Authorization: `Bearer ${authToken}`,
            // Also optional: might need to pass the cookie back if the server expects it strictly in cookie
            // but the middleware checks header OR cookie, so header should suffice.
            // However, verifyAccessToken checks token from header OR cookie.
        };

        // 1.5. Get available assignments
        console.log('[STEP 1.5] Getting available assignments...');
        const initialAssignmentsRes = await axios.get(`${BASE_URL}/assignments/student/all`, { headers });
        console.log('[DEBUG] Assignments Response:', JSON.stringify(initialAssignmentsRes.data, null, 2));
        const assignments = initialAssignmentsRes.data.data;

        if (!assignments || assignments.length === 0) {
            throw new Error('No assignments found for this student. Cannot proceed with tests.');
        }

        const targetAssignment = assignments[0];
        const targetPartId = targetAssignment.part_id;
        console.log(`[INFO] Found ${assignments.length} assignments. Using partId=${targetPartId} for testing.`);

        // 2. Get assignment details
        console.log(`[STEP 2] Getting assignment details (partId = ${targetPartId})...`);
        const detailsRes = await axios.get(`${BASE_URL}/assignments/${targetPartId}/details`, { headers });
        console.log('[SUCCESS] Assignment details:', {
            title: detailsRes.data.data.assignment.title,
            canAttempt: detailsRes.data.data.canAttempt.canAttempt,
            attempts: detailsRes.data.data.attempts.length
        });

        // 3. Start attempt
        console.log('\n[STEP 3] Starting new attempt...');
        const startRes = await axios.post(`${BASE_URL}/assignments/${targetPartId}/start`, {}, { headers });
        const attemptId = startRes.data.data.attempt.attempt_id;
        console.log('[SUCCESS] Attempt started:', {
            attemptId,
            totalQuestions: startRes.data.data.total_questions,
            timeLimit: startRes.data.data.time_limit_seconds
        });

        // 4. Simulate answering questions
        console.log('\n[STEP 4] Simulating answers...');
        const questions = startRes.data.data.questions;
        const answers = {};

        // Answer first 5 questions
        for (let i = 0; i < Math.min(5, questions.length); i++) {
            const q = questions[i];
            if (q.question_type === 'single') {
                answers[q.question_id] = 'A'; // Always choose option A
            } else {
                answers[q.question_id] = ['A', 'C']; // Choose A and C for multiple
            }
        }

        // Save progress
        await axios.post(`${BASE_URL}/assignments/attempt/${attemptId}/progress`,
            { answers, timeRemaining: 1000, currentQuestion: 5 },
            { headers }
        );
        console.log('[SUCCESS] Progress saved (answered 5 questions)');

        // 5. Submit assignment
        console.log('\n[STEP 5] Submitting assignment...');
        const submitRes = await axios.post(`${BASE_URL}/assignments/attempt/${attemptId}/submit`,
            { answers },
            { headers }
        );
        console.log('[SUCCESS] Assignment submitted:', {
            score: submitRes.data.data.score,
            percentage: submitRes.data.data.percentage,
            passed: submitRes.data.data.passed
        });

        // 6. Get submission review
        console.log('\n[STEP 6] Getting submission review...');
        const submissionId = submitRes.data.data.submission_id;
        const reviewRes = await axios.get(`${BASE_URL}/assignments/submission/${submissionId}/review`, { headers });
        console.log('[SUCCESS] Review data received');

        // 7. Get assignment history
        console.log('\n[STEP 7] Getting assignment history...');
        const historyRes = await axios.get(`${BASE_URL}/assignments/${startRes.data.data.assignment.assignment_id}/history`, { headers });
        console.log(`[SUCCESS] History received: ${historyRes.data.data.length} submissions`);

        // 8. Get all student assignments
        console.log('\n[STEP 8] Getting all student assignments...');
        const allRes = await axios.get(`${BASE_URL}/assignments/student/all`, { headers });
        console.log(`[SUCCESS] All assignments: ${allRes.data.data.length} total`);

        console.log('\n[DONE] All assignment tests passed successfully!');

    } catch (error) {
        console.error('[ERROR] Test failed:', error.response?.data || error.message);
    }
}

testAssignmentSystem();