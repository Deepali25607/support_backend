import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { db, persist } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

const slugify = (s) => (s || '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60);

const planSchema = z.object({
  name: z.string().min(1).max(40),
  price: z.union([z.number().min(0), z.string().min(1).max(40)]),
  period: z.string().max(20).default(''),
  users: z.string().max(80).default(''),
  featured: z.boolean().optional(),
});

const productSchema = z.object({
  id: z.string().min(2).max(60).optional(),
  name: z.string().min(2).max(80),
  tagline: z.string().min(2).max(160),
  category: z.string().min(2).max(80),
  description: z.string().min(2).max(2000),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#00f0ff'),
  glyph: z.string().max(8).default('01'),
  order: z.number().int().min(0).max(999).optional(),
  published: z.boolean().default(true),
  demoUrl: z.string().url().or(z.literal('')).default(''),
  highlights: z.array(z.string().min(1).max(200)).max(20).default([]),
  tech: z.array(z.string().min(1).max(40)).max(20).default([]),
  plans: z.array(planSchema).max(8).default([]),
});

const sortProducts = (arr) => [...arr].sort((a, b) => {
  const ao = a.order ?? 999;
  const bo = b.order ?? 999;
  if (ao !== bo) return ao - bo;
  return a.name.localeCompare(b.name);
});

function publicShape(p) {
  // Keep the URL safe for output (already validated on write)
  return p;
}

// Public — only published products
router.get('/', (_req, res) => {
  const published = db.data.products.filter((p) => p.published !== false);
  res.json({ data: sortProducts(published).map(publicShape) });
});

router.get('/:id', (req, res) => {
  const product = db.data.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (product.published === false) return res.status(404).json({ error: 'Product not found' });
  res.json({ data: publicShape(product) });
});

// Admin — full list (incl. unpublished)
router.get('/admin/list', requireAdmin, (_req, res) => {
  res.json({ data: sortProducts(db.data.products) });
});

router.post('/', requireAdmin, async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid product', issues: parsed.error.flatten() });
  let id = parsed.data.id || slugify(parsed.data.name);
  if (!id) id = randomUUID().slice(0, 8);
  if (db.data.products.some((p) => p.id === id)) {
    return res.status(409).json({ error: 'Product id already exists', id });
  }
  const now = new Date().toISOString();
  const record = {
    ...parsed.data,
    id,
    uuid: randomUUID(),
    order: parsed.data.order ?? (db.data.products.length + 1),
    createdAt: now,
    updatedAt: now,
  };
  db.data.products.push(record);
  await persist();
  res.status(201).json({ data: record });
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const product = db.data.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid product', issues: parsed.error.flatten() });
  // Only copy keys actually present in req.body — zod's .partial() applies .default()s
  // for missing fields, which would otherwise wipe existing data.
  const patch = {};
  for (const key of Object.keys(req.body || {})) {
    if (key in parsed.data) patch[key] = parsed.data[key];
  }
  if (patch.id && patch.id !== product.id && db.data.products.some((p) => p.id === patch.id)) {
    return res.status(409).json({ error: 'Product id already exists', id: patch.id });
  }
  Object.assign(product, patch);
  product.updatedAt = new Date().toISOString();
  await persist();
  res.json({ data: product });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const idx = db.data.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  const [removed] = db.data.products.splice(idx, 1);
  await persist();
  res.json({ data: removed });
});

export default router;
