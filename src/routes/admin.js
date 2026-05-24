import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin, publicUser } from '../middleware/auth.js';

const router = Router();
router.use(requireAdmin);

router.get('/overview', (_req, res) => {
  const customers = db.data.users.filter((u) => u.role === 'customer');
  const activeSubs = db.data.subscriptions.filter((s) => ['active', 'trialing'].includes(s.status));
  const monthlyRevenue = activeSubs
    .filter((s) => s.status === 'active' && typeof s.price === 'number')
    .reduce((sum, s) => sum + (s.period === 'user/mo' ? s.price : s.price), 0);
  const openTickets = db.data.tickets.filter((t) => ['open', 'pending'].includes(t.status)).length;
  const pendingDemos = db.data.demos.filter((d) => d.status === 'scheduled').length;
  const newLeads = db.data.leads.filter((l) => l.status === 'new').length;
  const pipeline = db.data.customRequests.filter((c) => !['Closed', 'Deployment Completed'].includes(c.status)).length;

  const recentLeads = [...db.data.leads].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const recentDemos = [...db.data.demos].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  res.json({
    data: {
      stats: {
        customers: customers.length,
        activeSubscriptions: activeSubs.length,
        monthlyRevenue,
        openTickets,
        pendingDemos,
        newLeads,
        pipeline,
      },
      recentLeads,
      recentDemos,
    },
  });
});

router.get('/users', (_req, res) => {
  res.json({ data: db.data.users.map(publicUser) });
});

router.get('/subscriptions', (_req, res) => {
  res.json({ data: db.data.subscriptions });
});

router.get('/analytics', (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days || '14', 10), 7), 90);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    return { date: d.toISOString().slice(0, 10), leads: 0, demos: 0, signups: 0, tickets: 0 };
  });
  const indexByDate = new Map(buckets.map((b, i) => [b.date, i]));

  const bumpIfInRange = (iso, key) => {
    const date = (iso || '').slice(0, 10);
    const idx = indexByDate.get(date);
    if (idx !== undefined) buckets[idx][key]++;
  };
  db.data.leads.forEach((l) => bumpIfInRange(l.createdAt, 'leads'));
  db.data.demos.forEach((d) => bumpIfInRange(d.createdAt, 'demos'));
  db.data.users.filter((u) => u.role === 'customer').forEach((u) => bumpIfInRange(u.createdAt, 'signups'));
  db.data.tickets.forEach((t) => bumpIfInRange(t.createdAt, 'tickets'));

  const productSubs = {};
  for (const s of db.data.subscriptions) {
    productSubs[s.productName] = (productSubs[s.productName] || 0) + 1;
  }
  const topProducts = Object.entries(productSubs)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const leadsByType = {};
  for (const l of db.data.leads) {
    const key = l.type || 'general';
    leadsByType[key] = (leadsByType[key] || 0) + 1;
  }
  const leadSources = Object.entries(leadsByType).map(([name, value]) => ({ name, value }));

  const requestsByStatus = {};
  for (const c of db.data.customRequests) {
    requestsByStatus[c.status] = (requestsByStatus[c.status] || 0) + 1;
  }
  const pipeline = Object.entries(requestsByStatus).map(([name, value]) => ({ name, value }));

  const activeSubs = db.data.subscriptions.filter((s) => s.status === 'active' && typeof s.price === 'number');
  const mrr = activeSubs.reduce((sum, s) => sum + s.price, 0);

  res.json({
    data: {
      timeseries: buckets,
      topProducts,
      leadSources,
      pipeline,
      mrr,
      totals: {
        leads: db.data.leads.length,
        demos: db.data.demos.length,
        customers: db.data.users.filter((u) => u.role === 'customer').length,
        tickets: db.data.tickets.length,
        newsletter: db.data.newsletter.length,
        posts: db.data.posts.length,
        caseStudies: db.data.caseStudies.length,
      },
    },
  });
});

export default router;
