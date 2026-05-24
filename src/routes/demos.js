import { Router } from 'express';
import { db, insert, persist, emitAdminNotification } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/', async (req, res) => {
  const { name, email, company, product, date, time } = req.body || {};
  if (!name || !email || !company || !date || !time) {
    return res.status(400).json({ error: 'name, email, company, date and time are required' });
  }
  const demo = insert('demos', { ...req.body, status: 'scheduled' });
  await persist();
  await emitAdminNotification({
    kind: 'demo',
    title: `Demo booked by ${demo.name}`,
    body: `${demo.company} · ${product || 'general'} · ${date} ${time}`,
    link: '/admin/demos',
  });
  console.log('[demo] booked', demo.id, demo.email, `${date} ${time}`, product);
  res.status(201).json({ data: demo, meetingLink: `https://meet.nexuslab.io/${demo.id.slice(0, 8)}` });
});

router.get('/', requireAdmin, (_req, res) => {
  res.json({ data: [...db.data.demos].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const demo = db.data.demos.find((d) => d.id === req.params.id);
  if (!demo) return res.status(404).json({ error: 'Demo not found' });
  if (req.body.status && ['scheduled', 'completed', 'no-show', 'cancelled'].includes(req.body.status)) {
    demo.status = req.body.status;
  }
  if (typeof req.body.notes === 'string') demo.notes = req.body.notes;
  await persist();
  res.json({ data: demo });
});

export default router;
