const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let authToken = '';

async function testContentViewers() {
    console.log('🔍 Testing Content Viewers System...\n');

    try {
        // 1. Login
        console.log('1. Logging in...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'test_student',
            password: 'password123'
        });

        authToken = loginRes.data.data.token;
        console.log('✅ Login successful\n');

        const headers = { Authorization: `Bearer ${authToken}` };

        // 2. Get content details
        console.log('2. Getting content details (partId = 1)...');
        const contentRes = await axios.get(`${BASE_URL}/content/1`, { headers });
        console.log('✅ Content details:', {
            title: contentRes.data.data.content.title,
            type: contentRes.data.data.content.part_type,
            downloadable: contentRes.data.data.content.is_downloadable
        });

        // 3. Get download URL
        console.log('\n3. Getting download URL...');
        const downloadRes = await axios.get(`${BASE_URL}/content/1/download-url`, { headers });
        console.log('✅ Download URL obtained:', {
            file_name: downloadRes.data.data.file_name,
            expires_in: downloadRes.data.data.expires_in
        });

        // 4. Get all downloadable content
        console.log('\n4. Getting all downloadable content...');
        const downloadsRes = await axios.get(`${BASE_URL}/content/downloads/list`, { headers });
        console.log(`✅ Found ${downloadsRes.data.data.length} downloadable items`);

        // 5. Mark content as completed
        console.log('\n5. Marking content as completed...');
        await axios.post(`${BASE_URL}/content/1/complete`, {}, { headers });
        console.log('✅ Content marked as completed');

        // 6. Update access time
        console.log('\n6. Updating access time...');
        await axios.post(`${BASE_URL}/content/1/access-time`,
            { timeSpent: 300 },
            { headers }
        );
        console.log('✅ Access time updated (300 seconds)');

        console.log('\n🎉 All content viewer tests passed!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testContentViewers();