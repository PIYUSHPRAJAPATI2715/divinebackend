const express = require('express');
const router = express.Router();
const Content = require('../../models/Content');
const SupportSetting = require('../../models/SupportSetting');
const SupportTicket = require('../../models/SupportTicket');

// Default initial pages to seed
const defaultPages = [
  {
    key: 'privacy',
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    category: 'legal',
    metaDescription: 'Official Privacy Policy of Divine Nakshatra Foundation.',
    content: `
<h2>Privacy Policy - Divine Nakshatra</h2>
<p>Last updated: January 2026</p>
<p>At Divine Nakshatra Foundation, we respect your privacy and are committed to safeguarding all personal, financial, and transactional data provided by our donors, NGO partners, corporate affiliates, and beneficiaries.</p>
<h3>1. Information Collection</h3>
<p>We collect essential donor details (Name, Contact Number, Email Address, PAN for Section 80G tax receipts) solely to process voluntary contributions and issue legal tax exemption documentation.</p>
<h3>2. Data Security & Storage</h3>
<p>All sensitive payment credentials are encrypted using industry-standard PCI-DSS compliant secure gateways. We never store donor credit/debit card numbers or net banking passwords on our servers.</p>
<h3>3. Disclosure to Third Parties</h3>
<p>We do not sell, trade, or rent personal identification information to any outside commercial parties. Data is shared exclusively with verified regulatory bodies as mandated by Indian statutory laws.</p>
<h3>4. Contact Our Data Protection Officer</h3>
<p>For any inquiries regarding data protection or rights, email us at <a href="mailto:privacy@divinenakshatra.org">privacy@divinenakshatra.org</a>.</p>
`
  },
  {
    key: 'terms',
    slug: 'terms-and-conditions',
    title: 'Terms & Conditions',
    category: 'legal',
    metaDescription: 'User terms of service and donation platform guidelines.',
    content: `
<h2>Terms of Service - Divine Nakshatra Platform</h2>
<p>Last updated: January 2026</p>
<p>Welcome to Divine Nakshatra. By accessing or using our mobile application and web portal, you agree to comply with and be bound by the following terms.</p>
<h3>1. Eligibility & Registrations</h3>
<p>Users must be at least 18 years of age. NGO and Corporate entities must provide valid Indian statutory registration certifications (12A, 80G, CSR-1, PAN) to initiate campaigns or disburse institutional funds.</p>
<h3>2. Voluntary Donations & Daan</h3>
<p>All donations made on this platform are voluntary gifts intended for social welfare, gaushala sustenance, medical emergency relief, or spiritual education.</p>
<h3>3. Campaign Verification & Compliance</h3>
<p>The platform conducts multi-tier KYC verification on all fundraiser campaigns. Any detected fraudulent submission will result in immediate suspension, legal reporting, and return of donor funds where applicable.</p>
`
  },
  {
    key: 'about',
    slug: 'about-us',
    title: 'About Divine Nakshatra',
    category: 'static_page',
    metaDescription: 'Our vision, mission, and sacred dedication to uplifting lives across India.',
    content: `
<h2>About Divine Nakshatra Foundation</h2>
<p>Divine Nakshatra is a technology-enabled philanthropic platform bridging generous donors, corporate CSR entities, and verified grassroots NGOs across India.</p>
<h3>Our Vision</h3>
<p>To cultivate an ecosystem of pure transparency, spiritual devotion, and direct social impact where every rupee donated reaches genuine beneficiaries.</p>
<h3>Our Core Pillars</h3>
<ul>
  <li><strong>Complete Transparency:</strong> Dynamic tracking of every donation, verified utilization bills, and direct 80G receipts.</li>
  <li><strong>Compassionate Seva:</strong> Dedicated focus on Anna Daan, Gau Seva, rural child education, and emergency healthcare.</li>
  <li><strong>Community Empowerment:</strong> Enabling grassroots social workers with modern digital crowdfunding infrastructure.</li>
</ul>
`
  },
  {
    key: 'refund',
    slug: 'refund-policy',
    title: 'Refund & Cancellation Policy',
    category: 'legal',
    metaDescription: 'Official donation refund and dispute resolution policy.',
    content: `
<h2>Donation Refund & Cancellation Policy</h2>
<p>Divine Nakshatra follows a transparent and fair donation refund process.</p>
<h3>1. Accidental or Duplicate Donations</h3>
<p>If a donor experiences an accidental duplicate debit or enters an erroneous contribution amount, a written refund request must be submitted within 7 calendar days of the transaction to <a href="mailto:support@divinenakshatra.org">support@divinenakshatra.org</a> along with payment proof.</p>
<h3>2. Disbursed Funds</h3>
<p>Once funds have been disbursed to the beneficiary hospital, school, or NGO partner, refunds cannot be processed due to statutory and regulatory constraints.</p>
<h3>3. Processing Timeline</h3>
<p>Approved refunds are credited to the original payment source within 5-7 business banking days.</p>
`
  }
];

const defaultFaqs = [
  {
    id: 'FAQ-01',
    question: 'How do I receive my 80G tax exemption receipt?',
    answer: 'Your official 80G tax exemption receipt is instantly generated and emailed upon successful donation. You can also download it anytime from the Daan Receipts section in your profile.',
    category: 'Tax & Receipts',
    order: 1,
    isActive: true
  },
  {
    id: 'FAQ-02',
    question: 'How are NGOs and campaigns verified?',
    answer: 'Every NGO partner undergoes strict compliance review including 12A, 80G, Darpan registration, and physical verification before campaigns are approved by administrators.',
    category: 'Verification & Safety',
    order: 2,
    isActive: true
  },
  {
    id: 'FAQ-03',
    question: 'Can corporate entities make CSR contributions?',
    answer: 'Yes, registered companies can make direct CSR contributions with full MCA compliance documentation and impact utilization reports.',
    category: 'Corporate & CSR',
    order: 3,
    isActive: true
  },
  {
    id: 'FAQ-04',
    question: 'How can I track the impact of my donation?',
    answer: 'Campaign creators publish regular photo, video, and invoice updates directly in the Campaign Updates tab. Donors receive automatic push and email notifications whenever an update is posted.',
    category: 'General',
    order: 4,
    isActive: true
  }
];

// Helper to ensure initial content and support settings exist
const ensureInitialContent = async () => {
  for (const page of defaultPages) {
    const exists = await Content.findOne({ key: page.key });
    if (!exists) {
      await Content.create(page);
    }
  }

  const supportExists = await SupportSetting.findOne({ key: 'global_support_settings' });
  if (!supportExists) {
    await SupportSetting.create({
      key: 'global_support_settings',
      helplinePhone: '+91 9876543210',
      supportEmail: 'support@divinenakshatra.org',
      whatsappNumber: '+91 9876543210',
      operatingHours: 'Monday to Saturday, 9:00 AM - 7:00 PM IST',
      officeAddress: 'Divine Nakshatra Foundation, 108 Sacred Way, Spiritual Complex, New Delhi - 110001, India',
      escalationNote: 'For urgent medical or emergency donor assistance, helpline ticketing is monitored 24/7.',
      faqs: defaultFaqs
    });
  }
};

// 1. Get all static content pages
router.get('/pages', async (req, res) => {
  try {
    await ensureInitialContent();
    const pages = await Content.find().sort({ createdAt: 1 });
    res.json({ status: true, data: pages, pages });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 2. Get single page by key or slug
router.get('/pages/:key', async (req, res) => {
  try {
    await ensureInitialContent();
    const key = req.params.key.toLowerCase().replace(/-/g, '_');
    const slug = req.params.key.toLowerCase().replace(/_/g, '-');
    const page = await Content.findOne({
      $or: [{ key }, { slug }, { _id: req.params.key.length === 24 ? req.params.key : null }]
    });
    if (!page) {
      return res.status(404).json({ status: false, message: 'Content page not found' });
    }
    res.json({ status: true, data: page, page });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 3. Update or create static content page
router.put('/pages/:key', async (req, res) => {
  try {
    const key = req.params.key.toLowerCase().replace(/-/g, '_');
    const { title, content, metaDescription, category = 'static_page', isActive = true } = req.body;

    if (!title || !content) {
      return res.status(400).json({ status: false, message: 'Title and Content are required.' });
    }

    let page = await Content.findOne({
      $or: [{ key }, { slug: key.replace(/_/g, '-') }]
    });

    if (page) {
      page.title = title;
      page.content = content;
      if (metaDescription !== undefined) page.metaDescription = metaDescription;
      if (category !== undefined) page.category = category;
      page.isActive = Boolean(isActive);
      page.lastUpdatedBy = req.user?.name || 'Admin';
      await page.save();
    } else {
      page = new Content({
        key,
        slug: key.replace(/_/g, '-'),
        title,
        content,
        metaDescription: metaDescription || '',
        category,
        isActive: Boolean(isActive),
        lastUpdatedBy: req.user?.name || 'Admin'
      });
      await page.save();
    }

    res.json({
      status: true,
      message: `${page.title} updated successfully`,
      data: page,
      page
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 4. Get Support Desk Configuration & FAQs
router.get('/support-settings', async (req, res) => {
  try {
    await ensureInitialContent();
    let settings = await SupportSetting.findOne({ key: 'global_support_settings' });
    if (!settings) {
      settings = await SupportSetting.create({
        key: 'global_support_settings',
        faqs: defaultFaqs
      });
    }
    res.json({ status: true, data: settings, settings });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 5. Update Support Desk Configuration & FAQs
router.put('/support-settings', async (req, res) => {
  try {
    let settings = await SupportSetting.findOne({ key: 'global_support_settings' });
    if (!settings) {
      settings = new SupportSetting({ key: 'global_support_settings' });
    }

    const {
      helplinePhone,
      supportEmail,
      whatsappNumber,
      operatingHours,
      officeAddress,
      escalationNote,
      faqs
    } = req.body;

    if (helplinePhone !== undefined) settings.helplinePhone = helplinePhone;
    if (supportEmail !== undefined) settings.supportEmail = supportEmail;
    if (whatsappNumber !== undefined) settings.whatsappNumber = whatsappNumber;
    if (operatingHours !== undefined) settings.operatingHours = operatingHours;
    if (officeAddress !== undefined) settings.officeAddress = officeAddress;
    if (escalationNote !== undefined) settings.escalationNote = escalationNote;
    if (Array.isArray(faqs)) settings.faqs = faqs;

    await settings.save();
    res.json({
      status: true,
      message: 'Help & Support settings saved successfully',
      data: settings,
      settings
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 6. Manage Support Tickets
router.get('/tickets', async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status && status !== 'All') filter.status = status;
    if (search) {
      filter.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } }
      ];
    }
    const tickets = await SupportTicket.find(filter).sort({ createdAt: -1 });
    res.json({ status: true, count: tickets.length, data: tickets, tickets });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 7. Reply or Update Ticket Status
router.post('/tickets/:id/reply', async (req, res) => {
  try {
    const { reply, status = 'Resolved' } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ status: false, message: 'Ticket not found' });
    }
    if (reply) {
      ticket.reply = reply;
      ticket.repliedAt = new Date();
    }
    ticket.status = status;
    await ticket.save();
    res.json({ status: true, message: 'Ticket response saved successfully', data: ticket });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
