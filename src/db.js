import { JSONFilePreset } from 'lowdb/node';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbFile = path.join(__dirname, '..', 'data.json');

const defaultData = {
  users: [],
  leads: [],
  demos: [],
  customRequests: [],
  tickets: [],
  subscriptions: [],
  posts: [],
  notifications: [],
  newsletter: [],
  caseStudies: [],
  coupons: [],
  siteContent: [],
  docs: [],
  themes: [],
  products: [],
};

export const db = await JSONFilePreset(dbFile, defaultData);

// Backfill any missing collections (so older DBs gain new tables)
for (const key of Object.keys(defaultData)) {
  if (!Array.isArray(db.data[key])) db.data[key] = [];
}

if (db.data.users.length === 0) {
  const adminPwd = bcrypt.hashSync('admin123', 10);
  const customerPwd = bcrypt.hashSync('demo1234', 10);
  db.data.users.push(
    {
      id: randomUUID(),
      email: 'admin@nexuslab.io',
      name: 'Nexus Admin',
      company: 'NEXUS Lab',
      role: 'admin',
      password: adminPwd,
      createdAt: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      email: 'demo@customer.io',
      name: 'Demo Customer',
      company: 'Acme Inc',
      role: 'customer',
      password: customerPwd,
      createdAt: new Date().toISOString(),
    }
  );
  const customerId = db.data.users[1].id;
  db.data.subscriptions.push(
    {
      id: randomUUID(),
      userId: customerId,
      productId: 'crm',
      productName: 'Orbit CRM',
      plan: 'Team',
      price: 2499,
      period: 'user/mo',
      status: 'active',
      startedAt: new Date().toISOString(),
      renewsAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
    },
    {
      id: randomUUID(),
      userId: customerId,
      productId: 'ecommerce',
      productName: 'Pulse Commerce',
      plan: 'Launch',
      price: 3499,
      period: 'mo',
      status: 'trialing',
      startedAt: new Date().toISOString(),
      renewsAt: new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
    }
  );
  db.data.tickets.push({
    id: randomUUID(),
    userId: customerId,
    subject: 'Custom field on contact form',
    category: 'feature-request',
    priority: 'normal',
    status: 'open',
    body: 'We need to capture GST number on the lead form. Possible to add?',
    replies: [
      { author: 'admin', body: 'Hi! Yes — we can add that. Spinning up a small change today.', at: new Date().toISOString() },
    ],
    createdAt: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await db.write();
}

// Seed blog posts independently (so existing DBs from earlier phases gain them too)
if (db.data.posts.length === 0) {
  const adminUser = db.data.users.find((u) => u.role === 'admin');
  const author = adminUser ? { id: adminUser.id, name: adminUser.name } : { id: 'system', name: 'NEXUS Editorial' };
  const now = Date.now();
  const posts = [
    {
      slug: 'why-erp-future-is-modular',
      title: 'Why the future of ERP is modular, AI-native and beautifully boring',
      excerpt: 'For decades, ERPs were monolithic, expensive and ugly. The next decade looks very different — and a lot more useful.',
      category: 'ERP Solutions',
      tags: ['ERP', 'Architecture', 'AI'],
      cover: '#00f0ff',
      readingTime: 6,
      published: true,
      publishedAt: new Date(now - 6 * 86400 * 1000).toISOString(),
      body: `Modern operators don't want a single, sprawling system that does everything badly. They want a clean control plane composed of best-in-class modules — wired together by APIs and a shared data model.\n\nThree shifts are converging:\n\n1. Modular architecture\n2. AI-native workflows that anticipate the next action\n3. Beautiful, boring interfaces that don't require a 40-page manual\n\nAt NEXUS we've rebuilt every product around these three principles. The result: customers ship 4x faster, support tickets drop 60%, and operators actually enjoy using the software.`,
    },
    {
      slug: 'school-erp-ai-grading-insights',
      title: 'How AI grading insights cut teacher workload by 30% at Sunrise International',
      excerpt: 'A two-month case study on NovaScholar ERP\'s AI-powered grading and feedback engine.',
      category: 'School software',
      tags: ['Case Study', 'Education', 'AI'],
      cover: '#b537ff',
      readingTime: 8,
      published: true,
      publishedAt: new Date(now - 12 * 86400 * 1000).toISOString(),
      body: `When Sunrise International rolled out NovaScholar across 4 campuses, the immediate goal was simple — give teachers their time back. Within two months, the school reported a 30% reduction in grading time and a measurable improvement in feedback quality.\n\nWhat changed?\n\n— Auto-grading for objective sections, with confidence scores teachers can override\n— Pattern detection across submissions to flag common misconceptions\n— Personalised feedback drafts that teachers edit instead of write from scratch\n\nThe AI doesn't replace teachers — it gives them a head start. And the time saved goes back into the classroom.`,
    },
    {
      slug: 'apartment-management-modern',
      title: 'Apartment management software in 2026: from paperwork to platform',
      excerpt: 'Why residential communities are finally moving off WhatsApp groups and shared Excel sheets.',
      category: 'Apartment management',
      tags: ['Apartment', 'PropTech', 'Habitat ERP'],
      cover: '#39ff14',
      readingTime: 5,
      published: true,
      publishedAt: new Date(now - 20 * 86400 * 1000).toISOString(),
      body: `For most housing societies in India, "management software" still means a WhatsApp group, an Excel sheet, and a register at the gate. That changes in 2026.\n\nWith Habitat ERP, residents get a single mobile app for everything — maintenance bills, visitor passes, amenity booking, complaints, polls. Secretaries get a dashboard that actually reflects reality.\n\nThe shift is generational. The next decade of community living will be platform-first.`,
    },
    {
      slug: 'saas-pricing-india',
      title: 'Pricing SaaS for the Indian market: what we learned from 120 customers',
      excerpt: 'A candid look at trial conversion, plan structure, and price elasticity across our product suite.',
      category: 'SaaS business',
      tags: ['Pricing', 'SaaS', 'GTM'],
      cover: '#ffb627',
      readingTime: 7,
      published: true,
      publishedAt: new Date(now - 30 * 86400 * 1000).toISOString(),
      body: `Pricing is a product feature. We learned that the hard way.\n\nAcross 120+ enterprise customers, three patterns emerged:\n\n1. A 14-day trial converts 2.5x better than a 7-day trial — long enough for a champion to actually deploy something useful.\n2. Three tiers convert better than four. Adding a fourth tier confuses buyers.\n3. Annual plans should save customers 20%, not 10% — anything less feels like an admin hassle, not a deal.\n\nWe applied each lesson to our own pricing pages. Conversion lifted 38% in the next quarter.`,
    },
  ];
  for (const p of posts) {
    db.data.posts.push({
      id: randomUUID(),
      ...p,
      authorId: author.id,
      authorName: author.name,
      createdAt: new Date(p.publishedAt || now).toISOString(),
      updatedAt: new Date(p.publishedAt || now).toISOString(),
    });
  }
  await db.write();
}

// Seed case studies independently (so existing DBs also gain them)
if (db.data.caseStudies.length === 0) {
  const now = Date.now();
  const seeds = [
    {
      slug: 'sunrise-international',
      client: 'Sunrise International School',
      industry: 'K-12 Education',
      logo: 'SI',
      product: 'NovaScholar ERP',
      productId: 'school-erp',
      accent: '#00f0ff',
      summary: 'Replaced 5 disconnected tools with a single ERP across 4 campuses — admissions, fees and report cards now run end-to-end inside NovaScholar.',
      challenge: 'Sunrise International ran on a patchwork of legacy software — separate systems for admissions, attendance, fees, exams and parent communication. Data was duplicated three times over, fee collection took weeks, and parents complained about silence between report cards.',
      solution: 'Over a 14-week engagement we migrated 4 campuses (2,800 students) onto NovaScholar ERP with a phased cutover. We integrated biometric attendance, automated fee reminders over WhatsApp, and shipped the parent app on day one.',
      outcomes: [
        '30% reduction in teacher grading time after AI insights launched',
        '92% on-time fee collection within 2 months (up from 58%)',
        'Single source of truth across 4 campuses',
        'Parent app rated 4.8/5 in first quarter',
      ],
      tech: ['React', 'Node.js', 'PostgreSQL', 'Redis', 'AWS'],
      stats: [
        { label: 'Students migrated', value: '2,800' },
        { label: 'Campuses', value: '4' },
        { label: 'Time saved per teacher / week', value: '6 hrs' },
        { label: 'Engagement length', value: '14 wks' },
      ],
      gallery: ['#00f0ff', '#3a8dff', '#b537ff'],
      published: true,
      publishedAt: new Date(now - 8 * 86400 * 1000).toISOString(),
    },
    {
      slug: 'skyline-towers',
      client: 'Skyline Towers Residency',
      industry: 'Residential Community',
      logo: 'ST',
      product: 'Habitat ERP',
      productId: 'apartment-erp',
      accent: '#b537ff',
      summary: '6 towers, 1,400 flats, one beautiful app — Skyline cut complaints by 60% and digitised maintenance, visitor pass and amenity booking.',
      challenge: 'Skyline Towers was running its community on WhatsApp groups and a shared spreadsheet. Maintenance bills got lost, visitor entries created bottlenecks at the gate, and amenity bookings devolved into arguments.',
      solution: 'We rolled out Habitat ERP across all 6 towers over 4 weeks. Residents got a unified mobile app for maintenance, visitor pre-approval (QR-based), amenity booking and complaints. The committee got a dashboard that finally reflected reality.',
      outcomes: [
        '60% drop in monthly complaints within one quarter',
        '100% online maintenance payment by month 2',
        'Gate entry time cut from 90s to 15s per visitor',
        'Resident satisfaction score: 4.7/5',
      ],
      tech: ['React Native', 'Node.js', 'MongoDB', 'Razorpay'],
      stats: [
        { label: 'Flats onboarded', value: '1,400' },
        { label: 'Towers', value: '6' },
        { label: 'Complaint drop', value: '60%' },
        { label: 'Go-live', value: '4 wks' },
      ],
      gallery: ['#b537ff', '#ff2bd1', '#3a8dff'],
      published: true,
      publishedAt: new Date(now - 16 * 86400 * 1000).toISOString(),
    },
    {
      slug: 'lumen-retail',
      client: 'Lumen Retail',
      industry: 'D2C Commerce',
      logo: 'LR',
      product: 'Pulse Commerce',
      productId: 'ecommerce',
      accent: '#39ff14',
      summary: 'Lumen launched its D2C storefront in 18 days and lifted AOV 22% with built-in AI recommendations.',
      challenge: 'Lumen had a successful retail brand but a clunky D2C website built on a generic SaaS platform. Conversion was poor, average order value was low, and merchandising required tickets to a third-party vendor.',
      solution: 'We migrated Lumen onto Pulse Commerce with full design parity in 18 days. AI recommendations, abandoned-cart automations and multi-channel inventory sync went live on day one.',
      outcomes: [
        '22% lift in average order value after 30 days',
        '38% lift in checkout conversion',
        'In-house merchandising via the drag-and-drop builder',
        '4x faster page loads vs. previous platform',
      ],
      tech: ['Next.js', 'Node.js', 'PostgreSQL', 'Stripe'],
      stats: [
        { label: 'Time to launch', value: '18 days' },
        { label: 'AOV lift', value: '+22%' },
        { label: 'Checkout lift', value: '+38%' },
        { label: 'SKUs migrated', value: '2,400' },
      ],
      gallery: ['#39ff14', '#00f0ff', '#ffb627'],
      published: true,
      publishedAt: new Date(now - 24 * 86400 * 1000).toISOString(),
    },
    {
      slug: 'medfirst-hospital',
      client: 'MedFirst Hospital',
      industry: 'Healthcare',
      logo: 'MF',
      product: 'CareGrid HMS',
      productId: 'hospital',
      accent: '#ff2bd1',
      summary: 'Unified OPD, IPD, lab and pharmacy in one command center — AI triage flagged 12 critical cases in the first month.',
      challenge: 'MedFirst ran on three separate systems for OPD, IPD and lab — and a paper pharmacy register. Patient handoffs lost data, insurance claims took weeks, and clinicians had no single view of a patient\'s journey.',
      solution: 'A 20-week phased rollout of CareGrid HMS replaced all three legacy systems. EHR, e-prescriptions, claims workflow and AI triage went live in waves to avoid clinical disruption.',
      outcomes: [
        '12 critical cases flagged by AI triage in month 1',
        'Claims turnaround dropped from 21 to 6 days',
        'Single EHR across all departments',
        'Zero unplanned clinical downtime during rollout',
      ],
      tech: ['React', 'Node.js', 'PostgreSQL', 'FHIR'],
      stats: [
        { label: 'Beds', value: '180' },
        { label: 'Doctors onboarded', value: '64' },
        { label: 'Claims turnaround', value: '6 days' },
        { label: 'Rollout', value: '20 wks' },
      ],
      gallery: ['#ff2bd1', '#b537ff', '#00f0ff'],
      published: true,
      publishedAt: new Date(now - 35 * 86400 * 1000).toISOString(),
    },
  ];
  for (const s of seeds) {
    db.data.caseStudies.push({
      id: randomUUID(),
      ...s,
      createdAt: new Date(s.publishedAt).toISOString(),
      updatedAt: new Date(s.publishedAt).toISOString(),
    });
  }
  await db.write();
}

// Seed docs / knowledge base independently
if (db.data.docs.length === 0) {
  const now = Date.now();
  const seeds = [
    // Platform — getting started
    { product: 'platform', productLabel: 'Platform', section: 'Getting Started', slug: 'welcome-to-nexus', title: 'Welcome to NEXUS', accent: '#00f0ff', readingTime: 3, body: 'NEXUS is a suite of business software products built on a shared platform. This guide gives you a 5-minute orientation.\n\nThree things to know:\n\n1. Every product shares one identity — sign in once, use anything.\n2. Subscriptions, billing and support all live in the customer portal.\n3. Custom builds run on the same engine, so anything you see in a flagship product can be tailored for you.' },
    { product: 'platform', productLabel: 'Platform', section: 'Getting Started', slug: 'creating-your-account', title: 'Creating your account', accent: '#00f0ff', readingTime: 2, body: 'You can sign up from any product page or by clicking Sign In → Create one.\n\nWhat we ask for:\n\n— Full name and work email (used to sign in)\n— Company name (used on invoices)\n— A password of at least 8 characters\n\nAfter signup you land in the customer portal. From there you can start a 14-day free trial on any product without entering payment details.' },
    { product: 'platform', productLabel: 'Platform', section: 'Billing', slug: 'how-billing-works', title: 'How billing works', accent: '#00f0ff', readingTime: 4, body: 'Every plan begins as a 14-day trial. At the end of the trial, you choose to upgrade or walk away with your data exported.\n\nOnce upgraded, you are billed at the start of each cycle (monthly or yearly). Yearly plans save 20%.\n\nInvoices land in your portal as soon as they are issued. Pause or cancel any time from the Subscriptions page — there is never a long-term lock-in.' },
    { product: 'platform', productLabel: 'Platform', section: 'Billing', slug: 'applying-coupon-codes', title: 'Applying coupon codes', accent: '#00f0ff', readingTime: 2, body: 'When upgrading a trialing subscription, the upgrade modal includes a coupon field.\n\nValid coupons either reduce the price by a percentage (e.g. LAUNCH20 = 20% off) or by a flat amount (e.g. FLAT1000 = ₹1,000 off). The discount preview updates live before you confirm.\n\nExpired or fully-redeemed coupons are rejected with a friendly error message.' },
    { product: 'platform', productLabel: 'Platform', section: 'Support', slug: 'raising-support-tickets', title: 'Raising support tickets', accent: '#00f0ff', readingTime: 2, body: 'Open the Support Tickets page from your portal and click New Ticket.\n\nFor faster resolution:\n\n— Pick the right category (technical / billing / feature request / setup / bug)\n— Set priority honestly (urgent = production is down, normal = needs response within a day)\n— Describe what you did, what you expected, and what actually happened\n\nOur support team responds within 24 hours and updates the ticket directly in the portal.' },

    // NovaScholar ERP
    { product: 'school-erp', productLabel: 'NovaScholar ERP', section: 'Quick Start', slug: 'novascholar-quick-start', title: 'NovaScholar quick start', accent: '#00f0ff', readingTime: 5, body: 'Get a campus up and running in under a day.\n\nStep 1: Create your school in the admin dashboard.\nStep 2: Bulk-import students and teachers from CSV.\nStep 3: Set up your academic year, classes and sections.\nStep 4: Connect biometric / RFID devices (optional).\nStep 5: Invite parents — they receive a one-tap link to the mobile app.\n\nThat is it. You can layer on fees, exams and report cards as you go.' },
    { product: 'school-erp', productLabel: 'NovaScholar ERP', section: 'Modules', slug: 'fee-management', title: 'Fee management', accent: '#00f0ff', readingTime: 4, body: 'Configure fee heads (tuition, transport, library) and assign them to classes. NovaScholar generates monthly or term-based invoices automatically.\n\nReminders go out over email and WhatsApp at intervals you control. Parents pay online via UPI, card or net-banking. Reconciliation happens in real time on your dashboard.' },
    { product: 'school-erp', productLabel: 'NovaScholar ERP', section: 'AI Insights', slug: 'ai-grading-insights', title: 'AI grading insights', accent: '#00f0ff', readingTime: 4, body: 'Teachers upload answer sheets or enter scores directly. NovaScholar AI flags submissions that look outlier-like, suggests common misconceptions to address, and drafts personalised feedback for each student.\n\nTeachers always retain the final say — every AI suggestion is reviewable and editable before it reaches the parent app.' },

    // Habitat ERP
    { product: 'apartment-erp', productLabel: 'Habitat ERP', section: 'Quick Start', slug: 'habitat-quick-start', title: 'Habitat quick start', accent: '#b537ff', readingTime: 4, body: 'Onboard a residential community in under a week.\n\nImport towers, flats and resident contacts from a spreadsheet. Habitat sends each resident a one-tap mobile invite. The committee gets a dashboard with maintenance, complaints, visitors and amenities, all in one place.' },
    { product: 'apartment-erp', productLabel: 'Habitat ERP', section: 'Modules', slug: 'visitor-management', title: 'Visitor management', accent: '#b537ff', readingTime: 3, body: 'Residents pre-approve visitors from the mobile app. Each visitor receives a QR pass over WhatsApp. The gate scans the QR on arrival and the resident is auto-notified.\n\nFor delivery partners and cabs, the system auto-issues short-lived passes without resident approval, with audit logs available to the committee.' },

    // Pulse Commerce
    { product: 'ecommerce', productLabel: 'Pulse Commerce', section: 'Quick Start', slug: 'pulse-quick-start', title: 'Pulse Commerce quick start', accent: '#39ff14', readingTime: 5, body: 'Launch a D2C storefront in a weekend.\n\n1. Pick a starter theme — every theme is mobile-first and Lighthouse-100.\n2. Import your catalog from CSV, Shopify or Magento.\n3. Connect a payment gateway and a shipping partner.\n4. Set up tax rules and you are live.' },
    { product: 'ecommerce', productLabel: 'Pulse Commerce', section: 'Marketing', slug: 'ai-product-recommendations', title: 'AI product recommendations', accent: '#39ff14', readingTime: 3, body: 'Pulse ships with a recommendations engine out of the box. It learns from browsing and purchase history to surface "people also bought" and personalised "for you" rails.\n\nMost stores see a 15–25% lift in average order value within 30 days of enabling it.' },

    // Orbit CRM
    { product: 'crm', productLabel: 'Orbit CRM', section: 'Quick Start', slug: 'orbit-quick-start', title: 'Orbit CRM quick start', accent: '#ff2bd1', readingTime: 4, body: 'Import contacts, set up your pipeline stages, and connect your email. Orbit auto-captures every interaction in a unified timeline.\n\nFor each deal, Orbit suggests next-best-actions based on similar closed deals — what to send, when to follow up, and which deals are slipping.' },
    { product: 'crm', productLabel: 'Orbit CRM', section: 'Automation', slug: 'whatsapp-email-automation', title: 'WhatsApp, Email & SMS automation', accent: '#ff2bd1', readingTime: 3, body: 'Build journeys visually. Triggers can be lead-source, stage change, scheduled time or behavioural. Actions can send a templated message, create a task, or update a CRM field.\n\nEach message is delivered through your chosen provider and full logs are retained for compliance.' },
  ];
  for (const d of seeds) {
    db.data.docs.push({
      id: randomUUID(),
      ...d,
      published: true,
      publishedAt: new Date(now - Math.floor(Math.random() * 30) * 86400 * 1000).toISOString(),
      updatedAt: new Date(now - Math.floor(Math.random() * 14) * 86400 * 1000).toISOString(),
      createdAt: new Date(now - Math.floor(Math.random() * 60) * 86400 * 1000).toISOString(),
    });
  }
  await db.write();
}

// Seed coupons independently
if (db.data.coupons.length === 0) {
  const now = Date.now();
  const seeds = [
    { code: 'LAUNCH20', label: 'Launch Special', type: 'percent', amount: 20, maxUses: 200, uses: 12, expiresAt: new Date(now + 30 * 86400 * 1000).toISOString(), active: true },
    { code: 'NEXUS15', label: 'New Customer 15%', type: 'percent', amount: 15, maxUses: 500, uses: 47, expiresAt: new Date(now + 60 * 86400 * 1000).toISOString(), active: true },
    { code: 'FLAT1000', label: '₹1,000 off any plan', type: 'flat', amount: 1000, maxUses: 100, uses: 9, expiresAt: new Date(now + 14 * 86400 * 1000).toISOString(), active: true },
    { code: 'EXPIRED5', label: 'Expired promo (test)', type: 'percent', amount: 5, maxUses: 50, uses: 50, expiresAt: new Date(now - 7 * 86400 * 1000).toISOString(), active: false },
  ];
  for (const c of seeds) {
    db.data.coupons.push({ id: randomUUID(), ...c, createdAt: new Date().toISOString() });
  }
  await db.write();
}

// Seed site content (key/value) independently
if (db.data.siteContent.length === 0) {
  const seed = [
    { key: 'hero.eyebrow', label: 'Hero Eyebrow', kind: 'text', value: '// Software Engineered for Tomorrow' },
    { key: 'hero.title.lead', label: 'Hero Title Lead', kind: 'text', value: 'Future-ready' },
    { key: 'hero.title.tail', label: 'Hero Title Tail', kind: 'text', value: 'software products that scale your business.' },
    { key: 'hero.subtitle', label: 'Hero Subtitle', kind: 'textarea', value: 'We design, build and operate next-generation ERPs, SaaS platforms and bespoke applications for schools, hospitals, retailers, communities and enterprises.' },
    { key: 'hero.pills', label: 'Hero Pills', kind: 'list', value: ['ERP', 'SaaS', 'E-commerce', 'CRM', 'POS', 'Custom Builds'] },
    { key: 'clients.logos', label: 'Client Logos (marquee)', kind: 'list', value: ['EDUNEXT', 'SKYLINE', 'LUMEN', 'MEDFIRST', 'ORION', 'NEBULA', 'HELIX', 'VECTOR'] },
    {
      key: 'testimonials', label: 'Customer Testimonials', kind: 'collection',
      value: [
        { name: 'Aarti Mehta', role: 'Principal, Sunrise International School', accent: '#00f0ff', quote: 'NovaScholar transformed how we run admissions and fees. What used to take weeks is now automated end-to-end. The dashboard feels like science fiction.' },
        { name: 'Rajeev Kapoor', role: 'Secretary, Skyline Towers', accent: '#b537ff', quote: 'Habitat ERP gave our residents a beautiful app for everything — payments, visitors, amenities. Complaints dropped by 60% in the first quarter.' },
        { name: 'Priya Shah', role: 'CEO, Lumen Retail', accent: '#39ff14', quote: 'Pulse Commerce launched our D2C brand in 18 days. The AI recommendations alone lifted AOV by 22%. Best investment we made this year.' },
        { name: 'Dr. Imran Khan', role: 'Director, MedFirst Hospital', accent: '#ff2bd1', quote: 'CareGrid unified our OPD, lab and pharmacy in one place. The AI triage flags critical cases before clinicians even open a chart.' },
      ],
    },
    {
      key: 'faqs', label: 'Frequently Asked Questions', kind: 'collection',
      value: [
        { q: 'Do you provide hosted (SaaS) deployments?', a: 'Yes. Every product ships as a managed SaaS by default — we handle servers, backups, scaling and uptime. We also offer on-premise and private-cloud deployments for enterprise customers under separate contracts.' },
        { q: 'Can I get a customized version of a product?', a: 'Absolutely. Most modules can be configured from the admin panel. For deeper changes — custom modules, branding, integrations — our engineering team builds against a fixed-scope statement of work.' },
        { q: 'What about data security and compliance?', a: 'All products use TLS in transit and AES-256 at rest. Role-based access, audit logs, MFA, and regular pen-tests are standard. We can sign DPAs and support SOC2 / ISO27001 controls for enterprise plans.' },
        { q: 'How does the free trial work?', a: 'Most products include a 14-day full-feature trial — no credit card required. After trial you can choose a subscription, request a custom quote, or simply walk away with your data exported.' },
        { q: 'Do you offer training and onboarding?', a: 'Yes — every plan includes structured onboarding, training sessions, and a dedicated customer success manager on Growth and above plans.' },
      ],
    },
  ];
  for (const item of seed) {
    db.data.siteContent.push({
      id: randomUUID(),
      ...item,
      updatedAt: new Date().toISOString(),
    });
  }
  await db.write();
}

// Backfill: ensure new siteContent keys exist on existing DBs (e.g. support contact).
{
  const required = [
    { key: 'support.email', label: 'Support Email', kind: 'text', value: 'hello@nexuslab.io' },
    { key: 'support.phone', label: 'Support Phone', kind: 'text', value: '+91 90000 00000' },
    { key: 'support.locations', label: 'Office Locations', kind: 'list', value: ['Bengaluru', 'Singapore', 'Dubai'] },
    { key: 'support.hours', label: 'Support Hours', kind: 'textarea', value: 'Monday – Friday · 9:00 AM – 9:00 PM IST\nSaturday · 10:00 AM – 4:00 PM IST' },
    { key: 'support.statusLine', label: 'Status Line', kind: 'text', value: 'All systems operational' },
    { key: 'support.uptime', label: 'Uptime Caption', kind: 'text', value: '99.98% uptime · last 30 days' },
    { key: 'support.billingEmail', label: 'Billing Email', kind: 'text', value: 'billing@nexuslab.io' },
    { key: 'support.billingPhone', label: 'Billing Phone', kind: 'text', value: '+91 90000 00000' },
  ];
  let added = false;
  for (const item of required) {
    if (!db.data.siteContent.some((c) => c.key === item.key)) {
      db.data.siteContent.push({ id: randomUUID(), ...item, updatedAt: new Date().toISOString() });
      added = true;
    }
  }
  if (added) await db.write();
}

// Seed the active theme independently
if (db.data.themes.length === 0) {
  db.data.themes.push({
    id: randomUUID(),
    active: true,
    brandName: 'NEXUS',
    brandTagline: '/ software.lab',
    bg0: '#04070f',
    bg1: '#080d1a',
    bg2: '#0d142a',
    accentCyan: '#00f0ff',
    accentBlue: '#3a8dff',
    accentViolet: '#b537ff',
    accentMagenta: '#ff2bd1',
    accentGreen: '#39ff14',
    accentAmber: '#ffb627',
    text0: '#eaf2ff',
    text1: '#b6c4dd',
    text2: '#6b7a9b',
    gradPrimaryFrom: '#00f0ff',
    gradPrimaryTo: '#b537ff',
    showScanLines: true,
    showGridOverlay: true,
    showOrbs: true,
    showGlow: true,
    fontDisplay: 'Space Grotesk',
    fontMono: 'JetBrains Mono',
    updatedAt: new Date().toISOString(),
  });
  await db.write();
}

// Seed product catalog independently (so existing DBs also gain it)
if (db.data.products.length === 0) {
  const now = Date.now();
  const seeds = [
    {
      id: 'school-erp', name: 'NovaScholar ERP', tagline: 'AI-powered School Management ERP',
      category: 'ERP Solutions', accent: '#00f0ff', glyph: '01', order: 1, published: true,
      description: 'A complete academic operating system — admissions, attendance, fee management, transport, examinations, parent communication, and AI-driven analytics for every school.',
      highlights: [
        'Real-time attendance via biometric & RFID',
        'Online admissions with intelligent shortlisting',
        'Automated fee collection with reminders',
        'Parent & teacher mobile apps',
        'AI grading insights and report cards',
      ],
      tech: ['React', 'Node.js', 'PostgreSQL', 'Redis', 'AWS'],
      plans: [
        { name: 'Starter', price: 4999, period: 'mo', users: 'Up to 500 students' },
        { name: 'Growth', price: 9999, period: 'mo', users: 'Up to 2,000 students', featured: true },
        { name: 'Enterprise', price: 'Custom', period: '', users: 'Unlimited' },
      ],
      demoUrl: '',
    },
    {
      id: 'apartment-erp', name: 'Habitat ERP', tagline: 'Smart Apartment & Community Management',
      category: 'ERP Solutions', accent: '#b537ff', glyph: '02', order: 2, published: true,
      description: 'Run an entire residential community from one futuristic dashboard — society billing, visitor management, complaints, amenities booking, security gate pass, and resident communication.',
      highlights: [
        'Maintenance billing & online payments',
        'Visitor pre-approval and QR gate pass',
        'Amenities booking with smart scheduling',
        'Complaints & helpdesk workflow',
        'Society announcements & polls',
      ],
      tech: ['React Native', 'Node.js', 'MongoDB', 'Razorpay'],
      plans: [
        { name: 'Basic', price: 2499, period: 'mo', users: 'Up to 100 flats' },
        { name: 'Pro', price: 5999, period: 'mo', users: 'Up to 500 flats', featured: true },
        { name: 'Enterprise', price: 'Custom', period: '', users: 'Unlimited towers' },
      ],
      demoUrl: '',
    },
    {
      id: 'ecommerce', name: 'Pulse Commerce', tagline: 'Next-Gen E-commerce Platform',
      category: 'E-commerce Solutions', accent: '#39ff14', glyph: '03', order: 3, published: true,
      description: 'Launch a blazing-fast storefront in days. Pulse Commerce blends a headless backend with AI-powered merchandising, omnichannel inventory, and built-in marketing automation.',
      highlights: [
        'Drag-and-drop storefront builder',
        'AI product recommendations',
        'Multi-channel inventory sync',
        'Built-in marketing automation',
        'Integrated payments & shipping',
      ],
      tech: ['Next.js', 'Node.js', 'PostgreSQL', 'Stripe'],
      plans: [
        { name: 'Launch', price: 3499, period: 'mo', users: 'Up to 1,000 SKUs' },
        { name: 'Scale', price: 8999, period: 'mo', users: 'Up to 10,000 SKUs', featured: true },
        { name: 'Enterprise', price: 'Custom', period: '', users: 'Unlimited' },
      ],
      demoUrl: '',
    },
    {
      id: 'crm', name: 'Orbit CRM', tagline: 'Customer Relationship Intelligence',
      category: 'CRM Software', accent: '#ff2bd1', glyph: '04', order: 4, published: true,
      description: 'A futuristic CRM with a single, unified customer timeline. Capture leads, automate follow-ups, score opportunities with AI, and close more deals — beautifully.',
      highlights: [
        'Unified customer 360° timeline',
        'AI lead scoring & pipeline forecasting',
        'WhatsApp, Email & SMS automation',
        'Quote, invoice and contract workflow',
        'Mobile field-sales companion',
      ],
      tech: ['React', 'Node.js', 'PostgreSQL', 'OpenAI'],
      plans: [
        { name: 'Solo', price: 999, period: 'user/mo', users: '1 seat' },
        { name: 'Team', price: 2499, period: 'user/mo', users: '5+ seats', featured: true },
        { name: 'Enterprise', price: 'Custom', period: '', users: 'Unlimited' },
      ],
      demoUrl: '',
    },
    {
      id: 'inventory', name: 'Vector Inventory', tagline: 'Inventory & Warehouse Intelligence',
      category: 'ERP Solutions', accent: '#3a8dff', glyph: '05', order: 5, published: true,
      description: 'Track every SKU in real time across warehouses, stores and channels. Forecast demand with ML, automate purchase orders, and never run out of stock again.',
      highlights: [
        'Multi-warehouse tracking',
        'Barcode & QR scanning',
        'Auto-reorder with ML demand forecasts',
        'Supplier and PO management',
        'Real-time stock dashboards',
      ],
      tech: ['React', 'Node.js', 'TimescaleDB', 'TensorFlow'],
      plans: [
        { name: 'Starter', price: 1999, period: 'mo', users: '1 warehouse' },
        { name: 'Growth', price: 4999, period: 'mo', users: '5 warehouses', featured: true },
        { name: 'Enterprise', price: 'Custom', period: '', users: 'Unlimited' },
      ],
      demoUrl: '',
    },
    {
      id: 'billing-pos', name: 'Flux POS', tagline: 'Billing & Point-of-Sale Suite',
      category: 'POS & Billing Systems', accent: '#ffb627', glyph: '06', order: 6, published: true,
      description: 'Lightning-fast billing for retail, F&B and services. Offline-first POS, GST-ready invoicing, loyalty programs, and a beautiful tablet interface your cashiers will love.',
      highlights: [
        'Offline-first POS with auto-sync',
        'GST & e-invoice compliance',
        'Loyalty, gift cards & coupons',
        'Kitchen display & order management',
        'Multi-store and franchise mode',
      ],
      tech: ['React', 'Electron', 'SQLite', 'Node.js'],
      plans: [
        { name: 'Single Store', price: 1499, period: 'mo', users: '1 outlet' },
        { name: 'Chain', price: 3999, period: 'mo', users: '5 outlets', featured: true },
        { name: 'Franchise', price: 'Custom', period: '', users: 'Unlimited' },
      ],
      demoUrl: '',
    },
    {
      id: 'hospital', name: 'CareGrid HMS', tagline: 'Hospital Management Suite',
      category: 'ERP Solutions', accent: '#00f0ff', glyph: '07', order: 7, published: true,
      description: 'A connected hospital management system — OPD, IPD, pharmacy, labs, billing, insurance, and AI-assisted diagnostics, all in one futuristic command center.',
      highlights: [
        'OPD / IPD / Pharmacy / Lab modules',
        'Insurance & TPA workflow',
        'Electronic Health Records (EHR)',
        'Telemedicine & video consultations',
        'AI triage & diagnostic assistance',
      ],
      tech: ['React', 'Node.js', 'PostgreSQL', 'FHIR'],
      plans: [
        { name: 'Clinic', price: 5999, period: 'mo', users: 'Up to 10 doctors' },
        { name: 'Hospital', price: 14999, period: 'mo', users: 'Up to 100 beds', featured: true },
        { name: 'Enterprise', price: 'Custom', period: '', users: 'Multi-hospital' },
      ],
      demoUrl: '',
    },
    {
      id: 'custom', name: 'Custom Software', tagline: 'Bespoke Software Engineering',
      category: 'Custom Software Solutions', accent: '#b537ff', glyph: '08', order: 8, published: true,
      description: 'Have a unique idea? Our engineering pod will design and build a tailor-made web, mobile, or SaaS product — from discovery to deployment.',
      highlights: [
        'Discovery workshops & wireframes',
        'Modern stack — React, Node, Python, Go',
        'Cloud-native on AWS / Azure / GCP',
        'AI / ML integrations',
        'Long-term maintenance & support',
      ],
      tech: ['React', 'Node.js', 'Python', 'AWS', 'Kubernetes'],
      plans: [
        { name: 'MVP', price: 'On request', period: '', users: '6–10 weeks' },
        { name: 'Product', price: 'On request', period: '', users: '12–20 weeks', featured: true },
        { name: 'Enterprise', price: 'On request', period: '', users: 'Long engagement' },
      ],
      demoUrl: '',
    },
  ];
  for (const p of seeds) {
    db.data.products.push({
      ...p,
      uuid: randomUUID(),
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    });
  }
  await db.write();
}

export function insert(table, payload) {
  const record = { id: randomUUID(), createdAt: new Date().toISOString(), ...payload };
  db.data[table].push(record);
  return record;
}

export async function persist() {
  await db.write();
}

export function find(table, predicate) {
  return db.data[table].find(predicate);
}

export function filter(table, predicate) {
  return db.data[table].filter(predicate);
}

export async function emitAdminNotification({ kind, title, body, link }) {
  const admins = db.data.users.filter((u) => u.role === 'admin');
  const created = [];
  for (const a of admins) {
    const note = {
      id: randomUUID(),
      userId: a.id,
      kind,
      title,
      body: body || '',
      link: link || null,
      read: false,
      createdAt: new Date().toISOString(),
    };
    db.data.notifications.push(note);
    created.push(note);
  }
  await db.write();
  try {
    const { broadcastNotification } = await import('./routes/notifications.js');
    for (const note of created) broadcastNotification(note);
  } catch { /* SSE module not yet loaded — fine */ }
}
