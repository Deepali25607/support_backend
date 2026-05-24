import { Router } from 'express';
import { z } from 'zod';
import { db, insert, find, persist, emitAdminNotification } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const ticketSchema = z.object({
  subject: z.string().min(3),
  body: z.string().min(5),
  category: z.enum(['technical', 'billing', 'feature-request', 'setup', 'bug']).default('technical'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
});

router.get('/', requireAuth, (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const tickets = db.data.tickets
    .filter((t) => isAdmin || t.userId === req.user.id)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json({ data: tickets });
});

router.post('/', requireAuth, async (req, res) => {
  const parsed = ticketSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
  const ticket = insert('tickets', {
    ...parsed.data,
    userId: req.user.id,
    status: 'open',
    replies: [],
    updatedAt: new Date().toISOString(),
  });
  await persist();
  await emitAdminNotification({
    kind: 'ticket',
    title: `New ticket: ${ticket.subject}`,
    body: `${req.user.name} · ${ticket.category} · ${ticket.priority} priority`,
    link: '/admin/tickets',
  });
  res.status(201).json({ data: ticket });
});

router.post('/:id/reply', requireAuth, async (req, res) => {
  const ticket = find('tickets', (t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && ticket.userId !== req.user.id) return res.status(403).json({ error: 'Not your ticket' });
  const body = String(req.body?.body || '').trim();
  if (!body) return res.status(400).json({ error: 'Reply body required' });
  ticket.replies.push({ author: isAdmin ? 'admin' : 'customer', body, at: new Date().toISOString() });
  ticket.updatedAt = new Date().toISOString();
  await persist();
  res.json({ data: ticket });
});

router.patch('/:id', requireAuth, async (req, res) => {
  const ticket = find('tickets', (t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && ticket.userId !== req.user.id) return res.status(403).json({ error: 'Not your ticket' });
  if (req.body.status && ['open', 'pending', 'resolved', 'closed'].includes(req.body.status)) {
    ticket.status = req.body.status;
  }
  if (isAdmin && req.body.priority && ['low', 'normal', 'high', 'urgent'].includes(req.body.priority)) {
    ticket.priority = req.body.priority;
  }
  ticket.updatedAt = new Date().toISOString();
  await persist();
  res.json({ data: ticket });
});

export default router;
