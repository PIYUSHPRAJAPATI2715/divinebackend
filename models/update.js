const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, '../../DivineNakshatra-Backend');

// Copy Model and Route
fs.copyFileSync(path.join(__dirname, 'Course.js'), path.join(backendDir, 'models/Course.js'));
fs.copyFileSync(path.join(__dirname, 'courses.js'), path.join(backendDir, 'routes/courses.js'));

// Update server.js
let serverJs = fs.readFileSync(path.join(backendDir, 'server.js'), 'utf-8');
if (!serverJs.includes('courses')) {
  serverJs = serverJs.replace(
    "const teacherRoutes = require('./routes/teachers');",
    "const teacherRoutes = require('./routes/teachers');\nconst courseRoutes = require('./routes/courses');"
  );
  serverJs = serverJs.replace(
    "app.use('/api/teachers', teacherRoutes);",
    "app.use('/api/teachers', teacherRoutes);\napp.use('/api/courses', courseRoutes);"
  );
  fs.writeFileSync(path.join(backendDir, 'server.js'), serverJs);
}

// Update seed.js
let seedJs = fs.readFileSync(path.join(backendDir, 'seed.js'), 'utf-8');
if (!seedJs.includes('Course')) {
  seedJs = seedJs.replace(
    "const Teacher = require('./models/Teacher');",
    "const Teacher = require('./models/Teacher');\nconst Course = require('./models/Course');"
  );
  
  const mockCourses = `
const mockCourses = [
  { courseId: 'CRS-201', title: 'Vedic Astrology Masterclass', instructor: 'Dr. Ramesh Jyotish', price: '₹4,999', duration: '30 Hrs', status: 'Published' },
  { courseId: 'CRS-202', title: 'Tarot for Beginners', instructor: 'Priya Sharma', price: '₹2,499', duration: '15 Hrs', status: 'Pending' },
  { courseId: 'CRS-203', title: 'Advanced Palmistry', instructor: 'Acharya Amit', price: '₹3,999', duration: '20 Hrs', status: 'Published' },
];
`;
  
  seedJs = seedJs.replace(
    "const mockTeachers =",
    mockCourses + "\nconst mockTeachers ="
  );
  
  seedJs = seedJs.replace(
    "await Teacher.deleteMany({});",
    "await Teacher.deleteMany({});\n  await Course.deleteMany({});"
  );
  
  seedJs = seedJs.replace(
    "await Teacher.insertMany(mockTeachers);",
    "await Teacher.insertMany(mockTeachers);\n  await Course.insertMany(mockCourses);"
  );
  
  fs.writeFileSync(path.join(backendDir, 'seed.js'), seedJs);
}

console.log('Backend updated successfully');
