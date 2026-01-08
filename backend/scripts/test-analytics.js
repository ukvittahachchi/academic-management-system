const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let authToken = '';

async function testStudentAnalytics() {
    console.log('📊 Testing Student Analytics System...\n');

    try {
        // 1. Login as teacher
        console.log('1. Logging in as teacher...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'test_teacher',
            password: 'password123'
        });

        authToken = loginRes.data.data.token;
        console.log('✅ Login successful\n');

        const headers = { Authorization: `Bearer ${authToken}` };

        // 2. Get comprehensive student analytics
        console.log('2. Getting comprehensive student analytics...');
        const analyticsRes = await axios.get(`${BASE_URL}/analytics/student/3/comprehensive`, { headers });
        console.log('✅ Student analytics loaded');

        // 3. Get student progress
        console.log('\n3. Getting student progress...');
        const progressRes = await axios.get(`${BASE_URL}/analytics/student/3/progress`, { headers });
        console.log(`✅ Student progress: ${progressRes.data.data.length} items`);

        // 4. Get assignment performance
        console.log('\n4. Getting assignment performance...');
        const assignmentRes = await axios.get(`${BASE_URL}/analytics/student/3/assignments`, { headers });
        console.log(`✅ Assignment performance: ${assignmentRes.data.data.length} assignments`);

        // 5. Get time spent analysis
        console.log('\n5. Getting time spent analysis...');
        const timeRes = await axios.get(`${BASE_URL}/analytics/student/3/time-spent`, { headers });
        console.log(`✅ Time spent analysis: ${timeRes.data.data.length} sessions`);

        // 6. Get weak areas
        console.log('\n6. Getting weak areas...');
        const weakRes = await axios.get(`${BASE_URL}/analytics/student/3/weak-areas`, { headers });
        console.log(`✅ Weak areas: ${weakRes.data.data.length}`);

        // 7. Get learning patterns
        console.log('\n7. Getting learning patterns...');
        const patternsRes = await axios.get(`${BASE_URL}/analytics/student/3/learning-patterns`, { headers });
        console.log(`✅ Learning patterns: ${patternsRes.data.data.length}`);

        // 8. Get study habits
        console.log('\n8. Getting study habits...');
        const habitsRes = await axios.get(`${BASE_URL}/analytics/student/3/study-habits`, { headers });
        console.log(`✅ Study habits: ${habitsRes.data.data.length} patterns`);

        // 9. Get performance trends
        console.log('\n9. Getting performance trends...');
        const trendsRes = await axios.get(`${BASE_URL}/analytics/student/3/performance-trends?weeks=8`, { headers });
        console.log(`✅ Performance trends: ${trendsRes.data.data.length} weeks`);

        // 10. Get recommendations
        console.log('\n10. Getting improvement recommendations...');
        const recRes = await axios.get(`${BASE_URL}/analytics/student/3/recommendations`, { headers });
        console.log(`✅ Recommendations: ${recRes.data.data.length}`);

        console.log('\n🎉 All student analytics tests passed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testStudentAnalytics();