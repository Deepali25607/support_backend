import { Router } from 'express';
import { db, insert, persist, emitAdminNotification } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const STATUSES = ['New Request', 'Under Review', 'Requirement Discussion', 'Proposal Shared', 'Negotiation', 'Approved', 'Development Started', 'Testing Phase', 'Deployment Completed', 'Closed'];

const router = Router();

router.post('/', async (req, res) => {
  const { company, contact, email, title, problem } = req.body || {};
  if (!company || !contact || !email || !title || !problem) {
    return res.status(400).json({ error: 'company, contact, email, title and problem are required' });
  }
  const request = insert('customRequests', { ...req.body, status: 'New Request' });
  await persist();
  await emitAdminNotification({
    kind: 'custom-request',
    title: `Custom build request: ${request.title}`,
    body: `${request.company} · ${request.contact} · ${request.budget || 'budget TBD'}`,
    link: '/admin/custom-requests',
  });
  console.log('[custom-request] new', request.id, request.company, request.title);
  res.status(201).json({ data: request });
});

router.get('/', requireAdmin, (_req, res) => {
  res.json({ data: [...db.data.customRequests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const cr = db.data.customRequests.find((c) => c.id === req.params.id);
  if (!cr) return res.status(404).json({ error: 'Request not found' });
  if (req.body.status && STATUSES.includes(req.body.status)) cr.status = req.body.status;
  if (typeof req.body.notes === 'string') cr.notes = req.body.notes;
  await persist();
  res.json({ data: cr });
});

router.get('/statuses/list', requireAdmin, (_req, res) => res.json({ data: STATUSES }));

export default router;
