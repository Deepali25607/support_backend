import { Router } from 'express';
import { db, insert, persist, emitAdminNotification } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/', async (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email and message are required' });
  }
  const lead = insert('leads', { ...req.body, status: 'new' });
  await persist();
  await emitAdminNotification({
    kind: 'lead',
    title: `New lead from ${lead.name}`,
    body: `${lead.company || lead.email} · ${lead.type || 'general'}`,
    link: '/admin/leads',
  });
  console.log('[lead] new', lead.id, lead.email, lead.type || 'general');
  res.status(201).json({ data: lead });
});

router.get('/', requireAdmin, (_req, res) => {
  res.json({ data: [...db.data.leads].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const lead = db.data.leads.find((l) => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  if (req.body.status && ['new', 'contacted', 'qualified', 'won', 'lost'].includes(req.body.status)) {
    lead.status = req.body.status;
  }
  if (typeof req.body.notes === 'string') lead.notes = req.body.notes;
  await persist();
  res.json({ data: lead });
});

export default router;
