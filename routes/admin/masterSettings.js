const express = require('express');
const router = express.Router();
const MasterSettings = require('../../models/MasterSettings');

const DEFAULT_CSR_FOCUS_AREAS = [
  'Education', 'Healthcare', 'Women Empowerment', 'Child Welfare', 'Senior Citizen Welfare',
  'Rural Development', 'Skill Development', 'Livelihood Development', 'Environmental Sustainability',
  'Sanitation & Clean Water', 'Disaster Management', 'Animal Welfare', 'Sports', 'Art & Culture',
  'Slum Area Development', 'Differently-Abled Persons', 'Research & Development', 'Armed Forces Veterans',
  'Farmers', 'Students', 'Hunger & Poverty', 'Others'
];

const DEFAULT_FUNDING_PREFERENCES = [
  'One-Time Funding', 'Multi-Year Funding', 'Project-Based Funding', 'Programme-Based Funding', 'Infrastructure Support'
];

const DEFAULT_NON_PROFIT_TYPES = [
  'Yes - As a Trust', 'Yes - As a Society', 'Yes - As a Section 25 or Section 8 Company', 'No'
];

const DEFAULT_CORPORATE_TYPES = [
  'Yes - As a Proprietorship', 'Yes - As a LLP', 'Yes - As a Private Limited Company', 'Yes - As a Limited Company', 'No'
];

// Helper to get or initialize settings
const getOrInitSettings = async () => {
  let settings = await MasterSettings.findOne();
  if (!settings) {
    settings = new MasterSettings({
      csrFocusAreas: DEFAULT_CSR_FOCUS_AREAS,
      fundingPreferences: DEFAULT_FUNDING_PREFERENCES,
      nonProfitTypes: DEFAULT_NON_PROFIT_TYPES,
      corporateCompanyTypes: DEFAULT_CORPORATE_TYPES
    });
    await settings.save();
  }
  return settings;
};

// 1. Get Master Settings (Public & Admin)
router.get('/', async (req, res) => {
  try {
    const settings = await getOrInitSettings();
    res.json({ status: true, data: settings });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 2. Update Master Settings
router.put('/', async (req, res) => {
  try {
    const settings = await getOrInitSettings();
    const { csrFocusAreas, fundingPreferences, nonProfitTypes, corporateCompanyTypes } = req.body;

    if (csrFocusAreas !== undefined && Array.isArray(csrFocusAreas)) {
      settings.csrFocusAreas = csrFocusAreas.map(s => s.trim()).filter(Boolean);
    }
    if (fundingPreferences !== undefined && Array.isArray(fundingPreferences)) {
      settings.fundingPreferences = fundingPreferences.map(s => s.trim()).filter(Boolean);
    }
    if (nonProfitTypes !== undefined && Array.isArray(nonProfitTypes)) {
      settings.nonProfitTypes = nonProfitTypes.map(s => s.trim()).filter(Boolean);
    }
    if (corporateCompanyTypes !== undefined && Array.isArray(corporateCompanyTypes)) {
      settings.corporateCompanyTypes = corporateCompanyTypes.map(s => s.trim()).filter(Boolean);
    }

    await settings.save();
    res.json({ status: true, message: 'Master settings updated successfully', data: settings });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 3. Add a single CSR Focus Area
router.post('/csr-focus-areas', async (req, res) => {
  try {
    const { area } = req.body;
    if (!area || typeof area !== 'string' || !area.trim()) {
      return res.status(400).json({ status: false, message: 'CSR Focus Area name is required' });
    }

    const settings = await getOrInitSettings();
    const cleanArea = area.trim();

    if (settings.csrFocusAreas.includes(cleanArea)) {
      return res.status(400).json({ status: false, message: 'CSR Focus Area already exists' });
    }

    settings.csrFocusAreas.push(cleanArea);
    await settings.save();

    res.status(201).json({ status: true, message: 'CSR Focus Area added successfully', data: settings });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 4. Delete a single CSR Focus Area by name
router.delete('/csr-focus-areas/:name', async (req, res) => {
  try {
    const areaName = decodeURIComponent(req.params.name).trim();
    const settings = await getOrInitSettings();

    settings.csrFocusAreas = settings.csrFocusAreas.filter(a => a.toLowerCase() !== areaName.toLowerCase());
    await settings.save();

    res.json({ status: true, message: `CSR Focus Area '${areaName}' deleted successfully`, data: settings });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
