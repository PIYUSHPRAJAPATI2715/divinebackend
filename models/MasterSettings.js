const mongoose = require('mongoose');

const masterSettingsSchema = new mongoose.Schema({
  csrFocusAreas: [{ type: String }],
  fundingPreferences: [{ type: String }],
  nonProfitTypes: [{ type: String }],
  corporateCompanyTypes: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('MasterSettings', masterSettingsSchema);
