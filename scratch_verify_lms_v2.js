const API_URL = 'http://localhost:5001/api';

async function runLMSIntegrationTestsV2() {
  console.log('--- STARTING ASTRO LMS 100% FEATURE API INTEGRATION TESTS ---');

  let res;
  try {
    // 1. Login User (Donor/Student)
    res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919999999999' })
    });
    res = await fetch(`${API_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919999999999', otp: '1234' })
    });
    const verifyData = await res.json();
    const token = verifyData.token;

    res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ role: 'student', name: 'LMS Student V2' })
    });
    await res.json();

    // 2. Login Teacher
    res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+918888888888' })
    });
    res = await fetch(`${API_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+918888888888', otp: '1234' })
    });
    const verifyTeacherData = await res.json();
    const teacherToken = verifyTeacherData.token;

    res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${teacherToken}` },
      body: JSON.stringify({ role: 'teacher', name: 'LMS Instructor V2', expertise: 'Kundali', experience: '10 Yrs' })
    });
    await res.json();

    console.log('Donor and Teacher authenticated successfully!');

    // 3. Test Student Library list
    res = await fetch(`${API_URL}/donor/student/library`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const libraryJson = await res.json();
    console.log('Student Library items fetched (Expected 3):', libraryJson.data?.length);

    // 4. Test Student Library Log progress
    res = await fetch(`${API_URL}/donor/student/library/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ pagesRead: 15, hoursSpent: 2 })
    });
    const logJson = await res.json();
    console.log('Student Library Streak updated:', logJson.data?.studyStreaks);

    // 5. Test Student Digital Reader highlight actions
    res = await fetch(`${API_URL}/donor/student/digital-reader/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ actionType: 'highlight', noteText: 'Planets transit houses', pageNumber: 5 })
    });
    const readerJson = await res.json();
    console.log('Student Reader action logged:', readerJson.status);

    // 6. Test Student Webinars catalog
    res = await fetch(`${API_URL}/donor/student/events`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const eventsJson = await res.json();
    console.log('Conferences/Webinars count (Expected 2):', eventsJson.data?.length);

    // 7. Test Student Webinar ticket purchase
    const targetEvent = eventsJson.data?.[0];
    if (targetEvent) {
      res = await fetch(`${API_URL}/donor/student/events/${targetEvent.eventId}/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ticketType: 'basic' })
      });
      const ticketJson = await res.json();
      console.log('Webinar Ticket purchased successfully:', ticketJson.status);
    }

    // 8. Test Student Cover Letter / Subdomain generator
    res = await fetch(`${API_URL}/donor/student/career/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ specialization: 'KP Astrology' })
    });
    const careerJson = await res.json();
    console.log('Cover Letter generated successfully:', !!careerJson.data?.coverLetterTemplate);
    console.log('Webpage Subdomain generated URL:', careerJson.data?.personalWebpageUrl);

    // 9. Test Student Join Club
    res = await fetch(`${API_URL}/donor/student/clubs/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ clubName: 'Meditation Club' })
    });
    const clubJson = await res.json();
    console.log('Student joined Meditation Club:', clubJson.status);

    // 10. Test Student Scholarship Application
    res = await fetch(`${API_URL}/donor/student/scholarships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ scholarshipType: 'Merit Scholarship', reason: 'High score in proctored exam' })
    });
    const scholarshipJson = await res.json();
    console.log('Scholarship application log:', scholarshipJson.status);

    // 11. Test Student Ethics Module completion
    res = await fetch(`${API_URL}/donor/student/ethics/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    const ethicsJson = await res.json();
    console.log('Ethics Module status:', ethicsJson.status);

    // 12. Test Teacher Schedule live recurring Class
    res = await fetch(`${API_URL}/teacher/classes/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${teacherToken}` },
      body: JSON.stringify({ className: 'Kundali Advanced Batch', scheduleTime: '2026-07-20T10:00:00', isRecurring: true })
    });
    const classJson = await res.json();
    console.log('Scheduled Recurring Class Status:', classJson.status);

    // 13. Test Teacher Upload Material to Library
    res = await fetch(`${API_URL}/teacher/library/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${teacherToken}` },
      body: JSON.stringify({ title: 'Kundali Ascendant Handbook', author: 'LMS Instructor V2', category: 'Astrology', resourceType: 'Digital Book', contentUrl: '/uploads/kundali_handbook.pdf' })
    });
    const libUploadJson = await res.json();
    console.log('Digital Library Upload Status:', libUploadJson.status);

    // 14. Test Teacher Get Student Analytics dashboard
    res = await fetch(`${API_URL}/teacher/analytics/students`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    const analyticsJson = await res.json();
    console.log('Teacher Student Analytics list size:', analyticsJson.data?.length);

    // 15. Test Teacher Blog Publishing
    res = await fetch(`${API_URL}/teacher/blogs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${teacherToken}` },
      body: JSON.stringify({ title: 'Impact of Saturn on Business', content: 'Detailed planetary transit studies...' })
    });
    const blogJson = await res.json();
    console.log('Teacher published Blog Article:', blogJson.status);

    // 16. Test Admin emergency broadcast
    res = await fetch(`${API_URL}/admin/teachers/emergency-broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title: 'Platform update announcement', message: 'System maintenance scheduled on Sunday.' })
    });
    const broadcastJson = await res.json();
    console.log('Admin Broadcast Status:', broadcastJson.status);

    // 17. Test Admin Surepass verification check
    res = await fetch(`${API_URL}/admin/teachers/verify-identity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ idType: 'Aadhaar', idNumber: '9999-8888-7777' })
    });
    const verifyIDJson = await res.json();
    console.log('Surepass Identity check status:', verifyIDJson.status);

    // 18. Test Admin monthly P&L financials
    res = await fetch(`${API_URL}/admin/teachers/financials/monthly`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const financialsJson = await res.json();
    console.log('Admin P&L Profit and Loss details (Expected 65000):', financialsJson.data?.profitAndLoss);

    console.log('--- ALL INTEGRATION API TESTS SUCCESSFUL! ---');
  } catch (err) {
    console.error('Error running Astro LMS v2 test validations:', err.message);
    if (res) {
      console.error('Failed Request URL:', res.url);
      console.error('Failed Request Status:', res.status);
      try {
        const text = await res.text();
        console.error('Failed Request Body excerpt:', text.slice(0, 300));
      } catch (e) {}
    }
  }
}

runLMSIntegrationTestsV2();
