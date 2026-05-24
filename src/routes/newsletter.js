import { Router } from 'express';
import { z } from 'zod';
import { db, insert, persist } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

const subscribeSchema = z.object({
  email: z.string().email(),
  source: z.string().optional().default('footer'),
});

router.post('/subscribe', async (req, res) => {
  const parsed = subscribeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Valid email required' });
  const email = parsed.data.email.toLowerCase();
  const existing = db.data.newsletter.find((n) => n.email === email);
  if (existing) return res.json({ data: existing, alreadySubscribed: true });
  const sub = insert('newsletter', { email, source: parsed.data.source, status: 'active' });
  await persist();
  res.status(201).json({ data: sub });
});

router.get('/', requireAdmin, (_req, res) => {
  res.json({
    data: [...db.data.newsletter].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const idx = db.data.newsletter.findIndex((n) => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Subscriber not found' });
  db.data.newsletter.splice(idx, 1);
  await persist();
  res.json({ ok: true });
});

export default router;
