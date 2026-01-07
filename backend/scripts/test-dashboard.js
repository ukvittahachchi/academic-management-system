const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let authToken = '';

async function testDashboardSystem() {
    console.log('📊 Testing Dashboard System...\n');

    try {
        // 1. Login
        console.log('1. Logging in as student...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'test_student',
            password: 'password123'
        });

        authToken = loginRes.data.data.token;
        console.log('✅ Login successful\n');

        const headers = { Authorization: `Bearer ${authToken}` };

        // 2. Get complete dashboard data
        console.log('2. Getting complete dashboard data...');
        const dashboardRes = await axios.get(`${BASE_URL}/dashboard`, { headers });
        console.log('✅ Dashboard data loaded:', {
            modules: dashboardRes.data.data.overview.total_modules,
            completion: dashboardRes.data.data.overview.completion_percentage,
            streak: dashboardRes.data.data.overview.activity_streak
        });

        // 3. Get dashboard overview
        console.log('\n3. Getting dashboard overview...');
        const overviewRes = await axios.get(`${BASE_URL}/dashboard/overview`, { headers });
        console.log('✅ Overview loaded');

        // 4. Get upcoming assignments
        console.log('\n4. Getting upcoming assignments...');
        const assignmentsRes = await axios.get(`${BASE_URL}/dashboard/upcoming-assignments?limit=3`, { headers });
        console.log(`✅ Upcoming assignments: ${assignmentsRes.data.data.length}`);

        // 5. Get grades overview
        console.log('\n5. Getting grades overview...');
        const gradesRes = await axios.get(`${BASE_URL}/dashboard/grades`, { headers });
        console.log(`✅ Grades overview: ${gradesRes.data.data.length} modules`);

        // 6. Get performance history
        console.log('\n6. Getting performance history...');
        const historyRes = await axios.get(`${BASE_URL}/dashboard/performance-history?days=7`, { headers });
        console.log(`✅ Performance history: ${historyRes.data.data.length} days`);

        // 7. Get module progress
        console.log('\n7. Getting module progress...');
        const progressRes = await axios.get(`${BASE_URL}/dashboard/module-progress`, { headers });
        console.log(`✅ Module progress: ${progressRes.data.data.length} modules`);

        // 8. Get study time statistics
        console.log('\n8. Getting study time statistics...');
        const studyTimeRes = await axios.get(`${BASE_URL}/dashboard/study-time`, { headers });
        console.log(`✅ Study time stats: ${studyTimeRes.data.data.length} days`);

        // 9. Get activity streak
        console.log('\n9. Getting activity streak...');
        const streakRes = await axios.get(`${BASE_URL}/dashboard/activity-streak`, { headers });
        console.log(`✅ Activity streak: ${streakRes.data.data.current_streak} days`);

        console.log('\n🎉 All dashboard tests passed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testDashboardSystem();