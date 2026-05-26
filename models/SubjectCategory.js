const mongoose = require('mongoose');

const subjectCategorySchema = new mongoose.Schema({
  categoryId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  coursesCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('SubjectCategory', subjectCategorySchema);
