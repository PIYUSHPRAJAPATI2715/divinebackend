const https = require('https');

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const dataStr = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'divinebackend-v5gl.onrender.com',
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    if (dataStr) {
      options.headers['Content-Length'] = Buffer.byteLength(dataStr);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: data ? JSON.parse(data) : {}
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: null,
            rawText: data
          });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

function post(path, body, headers = {}) {
  return request('POST', path, body, headers);
}

function get(path, headers = {}) {
  return request('GET', path, null, headers);
}

function put(path, body, headers = {}) {
  return request('PUT', path, body, headers);
}

async function verify() {
  try {
    console.log('1. Initiating Teacher Login...');
    const loginRes = await post('/api/auth/login', { phone: '+91 9812345678' });
    console.log('Login OTP Status:', loginRes.statusCode, loginRes.body.message);

    console.log('2. Verifying OTP Code...');
    const verifyRes = await post('/api/auth/verify-otp', { phone: '+91 9812345678', otp: '1234' });
    console.log('Verify OTP Status:', verifyRes.statusCode);
    
    if (verifyRes.statusCode !== 200 || !verifyRes.body.token) {
      console.error('Failed to verify OTP or get token.');
      return;
    }

    const token = verifyRes.body.token;
    const authHeaders = { 'Authorization': `Bearer ${token}` };

    console.log('3. Fetching Teacher Profile...');
    const profileRes = await get('/api/teacher/profile', authHeaders);
    console.log('Profile Status (GET):', profileRes.statusCode);
    console.log('Teacher Name:', profileRes.body.name);

    console.log('3b. Testing Profile Update (PUT)...');
    const profilePutRes = await put('/api/teacher/profile', {}, authHeaders);
    console.log('Profile PUT Status:', profilePutRes.statusCode);
    if (profilePutRes.body) {
      console.log('Profile PUT Body:', JSON.stringify(profilePutRes.body));
    } else {
      console.log('Profile PUT RawText:', profilePutRes.rawText);
    }

    console.log('4. Fetching Enrolled Students...');
    const studentsRes = await get('/api/teacher/students', authHeaders);
    console.log('Students Status:', studentsRes.statusCode);
    if (studentsRes.body) {
      console.log('Students Count:', Array.isArray(studentsRes.body) ? studentsRes.body.length : 'N/A');
    } else {
      console.log('Students RawText:', studentsRes.rawText);
    }

    console.log('5. Fetching Courses...');
    const coursesRes = await get('/api/teacher/courses', authHeaders);
    console.log('Courses Status:', coursesRes.statusCode);
    if (coursesRes.body) {
      console.log('Courses Count:', Array.isArray(coursesRes.body) ? coursesRes.body.length : 'N/A');
    } else {
      console.log('Courses RawText:', coursesRes.rawText);
    }

    console.log('\n--- 6. Initiating NGO Login (+91 8888833333) ---');
    const ngoLoginRes = await post('/api/auth/login', { phone: '+91 8888833333' });
    console.log('NGO Login Status:', ngoLoginRes.statusCode, ngoLoginRes.body.message);

    const ngoVerifyRes = await post('/api/auth/verify-otp', { phone: '+91 8888833333', otp: '1234' });
    console.log('NGO Verify OTP Status:', ngoVerifyRes.statusCode);

    if (ngoVerifyRes.statusCode === 200 && ngoVerifyRes.body.token) {
      const ngoHeaders = { 'Authorization': `Bearer ${ngoVerifyRes.body.token}` };

      console.log('7. Fetching NGO Profile...');
      const ngoProfileRes = await get('/api/ngo/profile', ngoHeaders);
      console.log('NGO Profile Status:', ngoProfileRes.statusCode, ngoProfileRes.body.name);

      console.log('8. Testing NGO Profile Update (PUT)...');
      const ngoProfilePutRes = await put('/api/ngo/profile', {}, ngoHeaders);
      console.log('NGO Profile PUT Status:', ngoProfilePutRes.statusCode);
      
      console.log('9. Fetching NGO Campaigns...');
      const ngoCampaignsRes = await get('/api/ngo/campaigns', ngoHeaders);
      console.log('NGO Campaigns Status:', ngoCampaignsRes.statusCode);

      console.log('9b. Testing NGO Gallery Upload (POST)...');
      const galleryRes = await post('/api/ngo/gallery', {
        title: 'Mock Welfare Camp',
        description: 'Welfare camp mock upload',
        imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c'
      }, ngoHeaders);
      console.log('NGO Gallery POST Status:', galleryRes.statusCode);
      if (galleryRes.body) {
        console.log('NGO Gallery Body:', JSON.stringify(galleryRes.body));
      }
    }

    console.log('Verification Complete!');
  } catch (err) {
    console.error('Verification failed with error:', err);
  }
}

verify();
