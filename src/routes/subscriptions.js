import { Router } from 'express';
import { db, insert, persist } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { products } from '../data/products.js';
import { findByCode, validityCheck } from './coupons.js';

const router = Router();

function applyCoupon(price, code) {
  if (!code) return { coupon: null, discount: 0, finalPrice: price };
  const c = findByCode(code);
  const check = validityCheck(c);
  if (!check.ok) return { coupon: null, discount: 0, finalPrice: price, error: check.reason };
  const discount = c.type === 'percent' ? Math.round(price * c.amount / 100) : Math.min(c.amount, price);
  return {
    coupon: { code: c.code, label: c.label, type: c.type, amount: c.amount },
    discount,
    finalPrice: Math.max(0, price - discount),
    record: c,
  };
}

router.get('/', requireAuth, (req, res) => {
  const mine = db.data.subscriptions.filter((s) => s.userId === req.user.id);
  res.json({ data: mine });
});

router.get('/:id/invoice', requireAuth, (req, res) => {
  const sub = db.data.subscriptions.find((s) => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  if (sub.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const user = db.data.users.find((u) => u.id === sub.userId);
  const issuedAt = new Date();
  const dueAt = new Date(sub.renewsAt || sub.startedAt);
  const subtotal = Number(sub.price) || 0;
  const discount = Number(sub.discount) || 0;
  const taxable = Math.max(0, subtotal - discount);
  const taxRate = 0.18;
  const tax = Math.round(taxable * taxRate);
  const total = taxable + tax;
  res.json({
    data: {
      number: `INV-${sub.id.slice(0, 8).toUpperCase()}-${issuedAt.getFullYear()}${String(issuedAt.getMonth() + 1).padStart(2, '0')}`,
      issuedAt: issuedAt.toISOString(),
      dueAt: dueAt.toISOString(),
      from: { name: 'NEXUS Software Lab', address: 'Bengaluru · Singapore · Dubai', email: 'billing@nexuslab.io', gstin: '29ABCDE1234F1Z5' },
      to: user ? { name: user.name, company: user.company || '', email: user.email } : null,
      subscription: { id: sub.id, productName: sub.productName, plan: sub.plan, period: sub.period, status: sub.status, startedAt: sub.startedAt, renewsAt: sub.renewsAt },
      lineItems: [
        { description: `${sub.productName} — ${sub.plan} plan`, period: sub.period, amount: subtotal },
      ],
      coupon: sub.coupon || null,
      totals: { subtotal, discount, taxable, taxRate, tax, total },
      currency: 'INR',
    },
  });
});

router.post('/', requireAuth, async (req, res) => {
  const { productId, plan, price, period, couponCode } = req.body || {};
  const product = products.find((p) => p.id === productId);
  if (!product) return res.status(400).json({ error: 'Unknown product' });
  const basePrice = Number(price) || 0;
  const applied = applyCoupon(basePrice, couponCode);
  if (couponCode && applied.error) return res.status(400).json({ error: applied.error });
  const sub = insert('subscriptions', {
    userId: req.user.id,
    productId,
    productName: product.name,
    plan: plan || 'Starter',
    price: basePrice,
    finalPrice: applied.finalPrice,
    discount: applied.discount,
    coupon: applied.coupon,
    period: period || 'mo',
    status: 'trialing',
    startedAt: new Date().toISOString(),
    renewsAt: new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
  });
  if (applied.record) {
    applied.record.uses = (applied.record.uses || 0) + 1;
  }
  await persist();
  res.status(201).json({ data: sub });
});

router.patch('/:id', requireAuth, async (req, res) => {
  const sub = db.data.subscriptions.find((s) => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  if (sub.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  if (req.body.status && ['active', 'trialing', 'paused', 'cancelled'].includes(req.body.status)) {
    sub.status = req.body.status;
  }
  if (req.body.plan) sub.plan = req.body.plan;
  if (req.body.couponCode !== undefined) {
    const applied = applyCoupon(sub.price, req.body.couponCode);
    if (req.body.couponCode && applied.error) return res.status(400).json({ error: applied.error });
    sub.coupon = applied.coupon;
    sub.discount = applied.discount;
    sub.finalPrice = applied.finalPrice;
    if (applied.record) applied.record.uses = (applied.record.uses || 0) + 1;
  }
  await persist();
  res.json({ data: sub });
});

export default router;
