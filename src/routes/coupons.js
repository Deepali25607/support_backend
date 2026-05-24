import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { db, persist } from '../db.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

const schema = z.object({
  code: z.string().min(3).max(24).regex(/^[A-Z0-9_-]+$/i, 'A-Z, 0-9, _ or - only'),
  label: z.string().min(2),
  type: z.enum(['percent', 'flat']),
  amount: z.number().positive(),
  maxUses: z.number().int().positive().optional().default(1000),
  expiresAt: z.string().optional(),
  active: z.boolean().optional().default(true),
});

function publicShape(c) {
  return { code: c.code, label: c.label, type: c.type, amount: c.amount };
}

function findByCode(code) {
  if (!code) return null;
  return db.data.coupons.find((c) => c.code.toUpperCase() === code.toUpperCase()) || null;
}

function validityCheck(c) {
  if (!c) return { ok: false, reason: 'Coupon not found' };
  if (!c.active) return { ok: false, reason: 'Coupon is inactive' };
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return { ok: false, reason: 'Coupon expired' };
  if (c.maxUses && c.uses >= c.maxUses) return { ok: false, reason: 'Coupon usage limit reached' };
  return { ok: true };
}

router.post('/validate', requireAuth, (req, res) => {
  const code = String(req.body?.code || '').trim();
  const price = Number(req.body?.price || 0);
  const c = findByCode(code);
  const check = validityCheck(c);
  if (!check.ok) return res.status(400).json({ error: check.reason });
  const discount = c.type === 'percent' ? Math.round(price * c.amount / 100) : Math.min(c.amount, price);
  res.json({ data: { ...publicShape(c), discount, finalPrice: Math.max(0, price - discount) } });
});

router.get('/', requireAdmin, (_req, res) => {
  res.json({ data: [...db.data.coupons].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

router.post('/', requireAdmin, async (req, res) => {
  const body = { ...req.body, code: String(req.body.code || '').toUpperCase().trim() };
  const parsed = schema.safeParse(body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  if (findByCode(parsed.data.code)) return res.status(409).json({ error: 'A coupon with that code already exists' });
  const coupon = { id: randomUUID(), ...parsed.data, uses: 0, createdAt: new Date().toISOString() };
  db.data.coupons.push(coupon);
  await persist();
  res.status(201).json({ data: coupon });
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const c = db.data.coupons.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: 'Coupon not found' });
  const allowed = ['label', 'type', 'amount', 'maxUses', 'expiresAt', 'active'];
  for (const key of allowed) if (req.body[key] !== undefined) c[key] = req.body[key];
  await persist();
  res.json({ data: c });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const idx = db.data.coupons.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Coupon not found' });
  db.data.coupons.splice(idx, 1);
  await persist();
  res.json({ ok: true });
});

export { findByCode, validityCheck };
export default router;
