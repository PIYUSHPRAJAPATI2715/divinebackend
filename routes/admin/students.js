const router = require('express').Router();
const Student = require('../../models/Student');

// Get all students
router.get('/', async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single student detailed profile (with marks, scholarship details, and assignment logs)
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student profile not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new student
router.post('/', async (req, res) => {
  try {
    const studentId = `STU-${Date.now().toString().slice(-4)}`;
    const newStudent = new Student({ ...req.body, studentId });
    const savedStudent = await newStudent.save();
    res.status(201).json(savedStudent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update student
router.put('/:id', async (req, res) => {
  try {
    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedStudent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete student
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (student) {
      const User = require('../../models/User');
      const { buildPhoneFilter } = require('../../utils/phone');
      const userOr = [];
      if (student.email) userOr.push({ email: student.email.toLowerCase().trim() });
      if (student.phone) userOr.push(buildPhoneFilter(student.phone));
      if (userOr.length > 0) {
        const user = await User.findOne({ $or: userOr });
        if (user) {
          user.isDeleted = true;
          user.status = 'Deleted';
          user.deletedAt = new Date();
          user.fcmToken = null;
          user.deviceToken = null;
          await user.save();
        }
      }
    }
    res.json({ message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
