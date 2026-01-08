const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let authToken = '';

async function testTeacherDashboard() {
    console.log('👨‍🏫 Testing Teacher Dashboard System...\n');

    try {
        // 1. Login as teacher
        console.log('1. Logging in as teacher...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'test_teacher',
            password: 'password123'
        });

        const cookies = loginRes.headers['set-cookie'];
        if (cookies) {
            const accessTokenCookie = cookies.find(c => c.startsWith('accessToken='));
            if (accessTokenCookie) {
                authToken = accessTokenCookie.split(';')[0].split('=')[1];
            }
        }
        // authToken = loginRes.data.data.token;
        console.log('✅ Login successful\n');

        const headers = { Authorization: `Bearer ${authToken}` };

        // 2. Get teacher dashboard
        console.log('2. Getting teacher dashboard...');
        const dashboardRes = await axios.get(`${BASE_URL}/teacher/dashboard`, { headers });
        const overview = dashboardRes.data.data.overview;

        console.log('✅ Teacher dashboard loaded:', {
            classes: overview.total_classes,
            students: overview.total_students,
            avgScore: overview.overall_avg_score
        });

        if (typeof overview.overall_avg_score !== 'number') {
            throw new Error(`overall_avg_score should be a number, got ${typeof overview.overall_avg_score}`);
        }
        if (typeof overview.avg_completion_rate !== 'number') {
            throw new Error(`avg_completion_rate should be a number, got ${typeof overview.avg_completion_rate}`);
        }
        console.log('✅ Field types verified: Numbers');

        // 3. Get teacher's classes
        console.log('\n3. Getting teacher classes...');
        const classesRes = await axios.get(`${BASE_URL}/teacher/classes`, { headers });
        console.log(`✅ Teacher classes: ${classesRes.data.data.length}`);

        // 4. Get class students
        console.log('\n4. Getting class students...');
        const studentsRes = await axios.get(`${BASE_URL}/teacher/students`, { headers });
        console.log(`✅ Class students: ${studentsRes.data.data.students.length}`);

        // 5. Get class performance
        console.log('\n5. Getting class performance...');
        const performanceRes = await axios.get(`${BASE_URL}/teacher/performance`, { headers });
        console.log(`✅ Class performance records: ${performanceRes.data.data.length}`);

        // 6. Get performance distribution
        console.log('\n6. Getting performance distribution...');
        const distributionRes = await axios.get(`${BASE_URL}/teacher/performance/distribution`, { headers });
        console.log(`✅ Performance distribution: ${distributionRes.data.data.length} ranges`);

        // 7. Get activity trends
        console.log('\n7. Getting activity trends...');
        const trendsRes = await axios.get(`${BASE_URL}/teacher/activity/trends?days=7`, { headers });
        console.log(`✅ Activity trends: ${trendsRes.data.data.length} days`);

        // 8. Get top performers
        console.log('\n8. Getting top performers...');
        const topRes = await axios.get(`${BASE_URL}/teacher/top-performers?limit=5`, { headers });
        console.log(`✅ Top performers: ${topRes.data.data.length}`);

        // 9. Get students needing attention
        console.log('\n9. Getting students needing attention...');
        const attentionRes = await axios.get(`${BASE_URL}/teacher/attention-needed?limit=5`, { headers });
        console.log(`✅ Students needing attention: ${attentionRes.data.data.length}`);

        // 10. Get filters
        console.log('\n10. Getting dashboard filters...');
        const filtersRes = await axios.get(`${BASE_URL}/teacher/filters`, { headers });
        console.log('✅ Filters loaded');

        console.log('\n🎉 All teacher dashboard tests passed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testTeacherDashboard();