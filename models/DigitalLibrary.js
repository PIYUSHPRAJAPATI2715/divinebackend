const mongoose = require('mongoose');

const digitalLibrarySchema = new mongoose.Schema({
  itemId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  publisher: { type: String, default: 'Divine Publishers' },
  keyword: { type: String, default: '' },
  category: { 
    type: String, 
    enum: ['Astrology', 'Numerology', 'Tarot', 'Palmistry', 'Vastu', 'Lal Kitab', 'KP Astrology', 'Nadi Astrology', 'Face Reading', 'Gemology', 'Yoga', 'Meditation', 'Ayurveda', 'Sanskrit', 'Philosophy', 'Religion', 'Mythology'], 
    default: 'Astrology' 
  },
  resourceType: {
    type: String,
    enum: ['Digital Book', 'Study Notes', 'Research Papers', 'Journals', 'Audio', 'Video', 'Template', 'Rare Manuscript'],
    default: 'Digital Book'
  },
  language: { type: String, default: 'English' },
  publicationYear: { type: Number, default: 2026 },
  difficultyLevel: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
  tags: [{ type: String }],
  contentUrl: { type: String, required: true }, // URL to PDF, audio or video resource
  pagesCount: { type: Number, default: 120 }
}, { timestamps: true });

module.exports = mongoose.model('DigitalLibrary', digitalLibrarySchema);
