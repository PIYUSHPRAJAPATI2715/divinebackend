const express = require('express');
const router = express.Router();
const EmailTemplate = require('../../models/EmailTemplate');

// Default initial templates to auto-seed if none exist
const defaultTemplates = [
  {
    templateId: 'TMPL-CAMPAIGN-001',
    name: 'Campaign Donation Thank You & 80G Receipt',
    category: 'Campaign',
    subject: 'Thank You for Supporting {{campaign_title}} - Receipt #{{receipt_no}}',
    includeDaanReceipt: true,
    receiptTitle: 'Official Campaign Donation & 80G Receipt',
    receiptNote: 'This donation is eligible for 50% tax exemption under Section 80G of the Income Tax Act. Thank you for empowering real change.',
    taxExemption80G: true,
    isActive: true,
    isDefault: true,
    variables: [
      'donor_name', 'amount', 'currency', 'receipt_no', 'campaign_title',
      'target_name', 'date', 'pan_number', 'tax_benefit_80g', 'platform_name', 'support_email'
    ],
    bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 24px; text-align: center; color: #ffffff;">
    <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Divine Nakshatra Foundation</h1>
    <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Campaign Contribution & Voluntary Daan Acknowledgment</p>
  </div>
  
  <div style="padding: 24px;">
    <p style="font-size: 16px;">Dear <strong>{{donor_name}}</strong>,</p>
    <p style="line-height: 1.6; font-size: 14px; color: #334155;">
      On behalf of the entire community and beneficiaries of <strong>{{campaign_title}}</strong>, we convey our deepest gratitude for your kind and generous contribution of <strong>{{currency}} {{amount}}</strong>.
    </p>
    <p style="line-height: 1.6; font-size: 14px; color: #334155;">
      Your support brings life-saving and life-changing hope directly to the field. Attached below is your official donation receipt for tax exemption and accounting records.
    </p>

    <!-- Receipt Card -->
    <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 18px; margin: 24px 0;">
      <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px; margin-bottom: 12px;">
        <span style="font-size: 13px; color: #64748b; font-weight: 600;">Receipt Number:</span>
        <strong style="font-size: 14px; color: #0f172a;">{{receipt_no}}</strong>
      </div>
      <table style="width: 100%; font-size: 13px; line-height: 2;">
        <tr>
          <td style="color: #64748b;">Contribution Date:</td>
          <td style="text-align: right; font-weight: 600;">{{date}}</td>
        </tr>
        <tr>
          <td style="color: #64748b;">Campaign:</td>
          <td style="text-align: right; font-weight: 600;">{{campaign_title}}</td>
        </tr>
        <tr>
          <td style="color: #64748b;">Donor PAN:</td>
          <td style="text-align: right; font-weight: 600;">{{pan_number}}</td>
        </tr>
        <tr>
          <td style="color: #64748b;">Tax Benefit (80G):</td>
          <td style="text-align: right; font-weight: 600; color: #16a34a;">{{tax_benefit_80g}}</td>
        </tr>
        <tr style="border-top: 1px solid #e2e8f0; font-size: 15px;">
          <td style="font-weight: 700; color: #0f172a; padding-top: 8px;">Total Paid:</td>
          <td style="text-align: right; font-weight: 800; color: #4f46e5; padding-top: 8px;">{{currency}} {{amount}}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #64748b; line-height: 1.5; font-style: italic;">
      Note: This is a system-generated electronic receipt compliant with Section 80G. For queries or duplicate copies, reach us at {{support_email}}.
    </p>
  </div>

  <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
    © 2026 {{platform_name}}. Empowering transparency in giving.
  </div>
</div>`
  },
  {
    templateId: 'TMPL-NGO-001',
    name: 'NGO Direct Support Thank You & Daan Receipt',
    category: 'NGO',
    subject: 'Thank You for Supporting {{ngo_name}} - Official Daan Receipt {{receipt_no}}',
    includeDaanReceipt: true,
    receiptTitle: 'NGO Institutional Daan Receipt',
    receiptNote: 'Voluntary charitable contribution directly disbursed to verified NGO partner operations.',
    taxExemption80G: true,
    isActive: true,
    isDefault: true,
    variables: [
      'donor_name', 'amount', 'currency', 'receipt_no', 'ngo_name',
      'target_name', 'date', 'pan_number', 'tax_benefit_80g', 'platform_name', 'support_email'
    ],
    bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 24px; text-align: center; color: #ffffff;">
    <h1 style="margin: 0; font-size: 24px; font-weight: 700;">{{platform_name}}</h1>
    <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Direct NGO Partner Contribution & Daan Receipt</p>
  </div>
  
  <div style="padding: 24px;">
    <p style="font-size: 16px;">Respected <strong>{{donor_name}}</strong>,</p>
    <p style="line-height: 1.6; font-size: 14px; color: #334155;">
      We humbly thank you for your voluntary contribution of <strong>{{currency}} {{amount}}</strong> directly dedicated to the mission and grassroots programs of <strong>{{ngo_name}}</strong>.
    </p>

    <!-- Receipt Card -->
    <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 18px; margin: 24px 0;">
      <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px; margin-bottom: 12px;">
        <span style="font-size: 13px; color: #64748b; font-weight: 600;">Receipt Number:</span>
        <strong style="font-size: 14px; color: #0f172a;">{{receipt_no}}</strong>
      </div>
      <table style="width: 100%; font-size: 13px; line-height: 2;">
        <tr>
          <td style="color: #64748b;">Contribution Date:</td>
          <td style="text-align: right; font-weight: 600;">{{date}}</td>
        </tr>
        <tr>
          <td style="color: #64748b;">Beneficiary NGO:</td>
          <td style="text-align: right; font-weight: 600;">{{ngo_name}}</td>
        </tr>
        <tr>
          <td style="color: #64748b;">Donor PAN:</td>
          <td style="text-align: right; font-weight: 600;">{{pan_number}}</td>
        </tr>
        <tr>
          <td style="color: #64748b;">80G Tax Exemption Status:</td>
          <td style="text-align: right; font-weight: 600; color: #16a34a;">{{tax_benefit_80g}}</td>
        </tr>
        <tr style="border-top: 1px solid #e2e8f0; font-size: 15px;">
          <td style="font-weight: 700; color: #0f172a; padding-top: 8px;">Amount Received:</td>
          <td style="text-align: right; font-weight: 800; color: #059669; padding-top: 8px;">{{currency}} {{amount}}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
      Your contribution directly aids daily sustenance, healthcare, and educational programs conducted by {{ngo_name}}.
    </p>
  </div>

  <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
    © 2026 {{platform_name}} | Support Desk: {{support_email}}
  </div>
</div>`
  },
  {
    templateId: 'TMPL-DAAN-001',
    name: 'Daan Patra & General Daan Thank You Receipt',
    category: 'Daan',
    subject: 'Divine Blessings: Daan Receipt #{{receipt_no}} for {{currency}} {{amount}}',
    includeDaanReceipt: true,
    receiptTitle: 'Sacred Daan Patra Confirmation Receipt',
    receiptNote: 'Voluntary sacred offering dedicated to Gau Seva, Anna Daan, and temple community outreach.',
    taxExemption80G: true,
    isActive: true,
    isDefault: true,
    variables: [
      'donor_name', 'amount', 'currency', 'receipt_no', 'target_name',
      'date', 'pan_number', 'tax_benefit_80g', 'platform_name', 'support_email'
    ],
    bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #1e293b; background-color: #ffffff; border: 1px solid #fed7aa; border-radius: 8px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #d97706 0%, #ea580c 100%); padding: 24px; text-align: center; color: #ffffff;">
    <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Divine Nakshatra Daan Patra</h1>
    <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.95;">Shubh Daan & Voluntary Offering Receipt</p>
  </div>
  
  <div style="padding: 24px;">
    <p style="font-size: 16px;">Pranaam <strong>{{donor_name}}</strong> Ji,</p>
    <p style="line-height: 1.6; font-size: 14px; color: #334155;">
      May the divine celestial energies bring abundant peace, prosperity, and joy to your family. We gratefully acknowledge your sacred Daan offering of <strong>{{currency}} {{amount}}</strong> towards <strong>{{target_name}}</strong>.
    </p>

    <!-- Sacred Receipt Details -->
    <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 18px; margin: 24px 0;">
      <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #fed7aa; padding-bottom: 10px; margin-bottom: 12px;">
        <span style="font-size: 13px; color: #9a3412; font-weight: 600;">Daan Receipt ID:</span>
        <strong style="font-size: 14px; color: #c2410c;">{{receipt_no}}</strong>
      </div>
      <table style="width: 100%; font-size: 13px; line-height: 2;">
        <tr>
          <td style="color: #7c2d12;">Date of Offering:</td>
          <td style="text-align: right; font-weight: 600;">{{date}}</td>
        </tr>
        <tr>
          <td style="color: #7c2d12;">Sacred Cause / Seva:</td>
          <td style="text-align: right; font-weight: 600;">{{target_name}}</td>
        </tr>
        <tr>
          <td style="color: #7c2d12;">Donor PAN:</td>
          <td style="text-align: right; font-weight: 600;">{{pan_number}}</td>
        </tr>
        <tr style="border-top: 1px solid #fed7aa; font-size: 15px;">
          <td style="font-weight: 700; color: #7c2d12; padding-top: 8px;">Daan Dakshina Amount:</td>
          <td style="text-align: right; font-weight: 800; color: #ea580c; padding-top: 8px;">{{currency}} {{amount}}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #78350f; line-height: 1.5; font-style: italic;">
      "Daan is supreme virtue that purifies the soul and uplifts humanity."
    </p>
  </div>

  <div style="background-color: #ffedd5; padding: 16px; text-align: center; font-size: 12px; color: #9a3412;">
    Divine Nakshatra Foundation | {{support_email}}
  </div>
</div>`
  }
];

// Seed templates helper
const ensureDefaultTemplates = async () => {
  const count = await EmailTemplate.countDocuments();
  if (count === 0) {
    await EmailTemplate.insertMany(defaultTemplates);
    console.log('[EmailTemplates] Default mailer and receipt templates seeded successfully.');
  }
};

// 1. Get all templates (with optional category filter)
router.get('/', async (req, res) => {
  try {
    await ensureDefaultTemplates();
    const { category, search } = req.query;
    const filter = {};
    if (category && category !== 'All') {
      filter.category = category;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { templateId: { $regex: search, $options: 'i' } }
      ];
    }
    const templates = await EmailTemplate.find(filter).sort({ createdAt: -1 });
    res.json({
      status: true,
      count: templates.length,
      data: templates,
      templates
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 2. Get single template by ID
router.get('/:id', async (req, res) => {
  try {
    const template = await EmailTemplate.findOne({
      $or: [{ _id: req.params.id }, { templateId: req.params.id }]
    });
    if (!template) {
      return res.status(404).json({ status: false, message: 'Template not found' });
    }
    res.json({ status: true, data: template, template });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 3. Create new template
router.post('/', async (req, res) => {
  try {
    const {
      name,
      category = 'Daan',
      subject,
      bodyHtml,
      variables,
      includeDaanReceipt = true,
      receiptTitle,
      receiptNote,
      taxExemption80G = true,
      isActive = true
    } = req.body;

    if (!name || !subject || !bodyHtml) {
      return res.status(400).json({ status: false, message: 'Template Name, Subject line, and Body HTML are required.' });
    }

    const templateId = `TMPL-${category.toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const newTemplate = new EmailTemplate({
      templateId,
      name,
      category,
      subject,
      bodyHtml,
      variables: variables || ['donor_name', 'amount', 'currency', 'receipt_no', 'target_name', 'date', 'pan_number', 'tax_benefit_80g'],
      includeDaanReceipt: Boolean(includeDaanReceipt),
      receiptTitle: receiptTitle || 'Official Daan & Donation Receipt',
      receiptNote: receiptNote || 'Thank you for your generous contribution.',
      taxExemption80G: Boolean(taxExemption80G),
      isActive: Boolean(isActive)
    });

    await newTemplate.save();
    res.status(201).json({
      status: true,
      message: 'Email & Receipt template created successfully',
      data: newTemplate,
      template: newTemplate
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 4. Update template
router.put('/:id', async (req, res) => {
  try {
    const template = await EmailTemplate.findOne({
      $or: [{ _id: req.params.id }, { templateId: req.params.id }]
    });
    if (!template) {
      return res.status(404).json({ status: false, message: 'Template not found' });
    }

    const fields = [
      'name', 'category', 'subject', 'bodyHtml', 'variables',
      'includeDaanReceipt', 'receiptTitle', 'receiptNote', 'taxExemption80G', 'isActive', 'isDefault'
    ];
    fields.forEach(f => {
      if (req.body[f] !== undefined) template[f] = req.body[f];
    });

    await template.save();
    res.json({
      status: true,
      message: 'Template updated successfully',
      data: template,
      template
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 5. Delete template
router.delete('/:id', async (req, res) => {
  try {
    const template = await EmailTemplate.findOneAndDelete({
      $or: [{ _id: req.params.id }, { templateId: req.params.id }]
    });
    if (!template) {
      return res.status(404).json({ status: false, message: 'Template not found' });
    }
    res.json({ status: true, message: 'Template deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 6. Preview Template with live sample data substitution
router.post('/preview', (req, res) => {
  try {
    const { subject = '', bodyHtml = '', category = 'Daan', mockData = {} } = req.body;

    const sample = {
      donor_name: mockData.donor_name || 'Rahul Sharma',
      amount: mockData.amount || '5,001',
      currency: mockData.currency || '₹',
      receipt_no: mockData.receipt_no || `RCP-${Date.now().toString().slice(-6)}`,
      target_name: mockData.target_name || (category === 'Campaign' ? 'Rural Girls Education Fund' : (category === 'NGO' ? 'Pratham Education Foundation' : 'Anna Daan & Gau Seva')),
      campaign_title: mockData.campaign_title || 'Rural Girls Education Fund',
      ngo_name: mockData.ngo_name || 'Pratham Education Foundation',
      date: mockData.date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      pan_number: mockData.pan_number || 'ABCDE1234F',
      tax_benefit_80g: mockData.tax_benefit_80g || 'Eligible (50% Deduction under 80G)',
      platform_name: mockData.platform_name || 'Divine Nakshatra Foundation',
      support_email: mockData.support_email || 'support@divinenakshatra.org'
    };

    let renderedSubject = subject;
    let renderedBody = bodyHtml;

    Object.keys(sample).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      renderedSubject = renderedSubject.replace(regex, sample[key]);
      renderedBody = renderedBody.replace(regex, sample[key]);
    });

    res.json({
      status: true,
      renderedSubject,
      renderedBody,
      sampleData: sample
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
