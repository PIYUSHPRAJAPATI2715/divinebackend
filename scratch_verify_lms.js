const API_URL = 'http://localhost:5001/api';

async function runLMSTests() {
  console.log('--- STARTING ASTRO LMS API INTEGRATION TESTS ---');

  let res;
  try {
    // 1. Authenticate / Login User (Donor/Student role)
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
      body: JSON.stringify({ role: 'donor', name: 'LMS Test Student' })
    });
    await res.json();

    // 2. Authenticate / Login Teacher
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
      body: JSON.stringify({ role: 'teacher', name: 'LMS Test Instructor', expertise: 'Astrology Coaching', experience: '8 Years' })
    });
    await res.json();

    console.log('User and Teacher authenticated successfully!');

    // 3. Test Teacher Create Exam Route
    res = await fetch(`${API_URL}/teacher/exams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${teacherToken}` },
      body: JSON.stringify({
        courseId: 'CRS-101',
        title: 'Basic Astrology Midterm',
        duration: 20,
        negativeMarking: true,
        questions: [
          {
            questionText: 'Which planet represents the Soul (Atmakaraka) in Vedic Astrology?',
            options: ['Sun', 'Moon', 'Saturn'],
            correctAnswers: ['Sun'],
            marks: 2
          }
        ]
      })
    });
    const examJson = await res.json();
    console.log('Create Exam Status (Should be true):', examJson.status);
    console.log('Created Exam ID:', examJson.exam?.examId);

    // 4. Test Student Get Exams list & Submit Exam (Proctoring/Auto grading/Certificate)
    res = await fetch(`${API_URL}/donor/student/exams`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const examsJson = await res.json();
    console.log('Get Exams count:', examsJson.data?.length);

    const targetExam = examsJson.data?.[0];
    if (targetExam) {
      res = await fetch(`${API_URL}/donor/student/exams/${targetExam.examId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          answers: { 'Q-1': 'Sun' },
          tabSwitches: 1
        })
      });
      const submitJson = await res.json();
      console.log('Exam Submission Score (Expected 2):', submitJson.data?.score);
      console.log('Exam Passed Status (Expected true):', submitJson.data?.isPassed);
      console.log('Certificate Issued:', !!submitJson.data?.certificate);
    }

    // 5. Test Teacher Leave Request Workflow
    res = await fetch(`${API_URL}/teacher/leaves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${teacherToken}` },
      body: JSON.stringify({
        leaveType: 'Casual',
        startDate: '2026-07-01',
        endDate: '2026-07-03',
        reason: 'Family event attendance'
      })
    });
    const leaveJson = await res.json();
    console.log('Apply Leave Status (Expected true):', leaveJson.status);
    console.log('Leave Request ID:', leaveJson.leave?.leaveId);

    // 6. Test Admin Approve Leave Request & substitute allocation
    res = await fetch(`${API_URL}/admin/teachers/leaves/requests`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const adminLeavesJson = await res.json();
    const targetLeave = adminLeavesJson.data?.[0];
    
    if (targetLeave) {
      res = await fetch(`${API_URL}/admin/teachers/leaves/requests/${targetLeave._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          status: 'Approved',
          substituteTeacherId: 'TCH-007',
          substituteTeacherName: 'Vol Astrologer Shiva'
        })
      });
      const approveJson = await res.json();
      console.log('Admin Leave Approve status:', approveJson.status);
      console.log('Substitute Assigned:', approveJson.data?.substituteAssigned);
    }

    // 7. Test Admin Payout trigger runner
    res = await fetch(`${API_URL}/admin/teachers/payouts/run`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const payoutJson = await res.json();
    console.log('Admin Payout execution status:', payoutJson.status);
    console.log('Total disbursements processed:', payoutJson.data?.length);

    // Fetch actual teacherId
    res = await fetch(`${API_URL}/teacher/profile`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    const teacherProfile = await res.json();
    const actualTeacherId = teacherProfile.teacherId;

    // 8. Test Admin Compliance logging
    res = await fetch(`${API_URL}/admin/teachers/monitoring/compliance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        teacherId: actualTeacherId,
        dressCodePassed: true,
        audioQuality: 'Excellent',
        videoQuality: 'Good',
        observations: 'Broadcasting in Astro studio correctly.'
      })
    });
    const complianceJson = await res.json();
    console.log('Compliance log status:', complianceJson.status);

    // 9. Test Student Internships milestones
    res = await fetch(`${API_URL}/donor/student/internships`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const internshipsJson = await res.json();
    console.log('Internships Milestones count:', internshipsJson.data?.milestones?.length);

  } catch (err) {
    console.error('Error running Astro LMS test validations:', err.message);
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

runLMSTests();
