
const axios = require('axios');

async function testApiLogin() {
    const url = 'http://localhost:5000/api/auth/login';
    const payload = {
        username: 'test_student',
        password: 'password123'
    };

    console.log(`Sending POST to ${url}`);
    console.log('Payload:', payload);

    try {
        const response = await axios.post(url, payload);
        console.log('✅ Status:', response.status);
        console.log('✅ Data:', response.data);
    } catch (error) {
        if (error.response) {
            console.log('❌ Status:', error.response.status);
            console.log('❌ Data:', error.response.data);
        } else {
            console.log('❌ Error:', error.message);
        }
    }
}

testApiLogin();
