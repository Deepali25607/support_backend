import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { db, persist } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

const schema = z.object({
  client: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  industry: z.string().min(2),
  logo: z.string().max(4).optional().default(''),
  product: z.string().min(2),
  productId: z.string().optional().default(''),
  accent: z.string().optional().default('#00f0ff'),
  summary: z.string().min(10),
  challenge: z.string().min(10),
  solution: z.string().min(10),
  outcomes: z.array(z.string()).optional().default([]),
  tech: z.array(z.string()).optional().default([]),
  stats: z.array(z.object({ label: z.string(), value: z.string() })).optional().default([]),
  gallery: z.array(z.string()).optional().default([]),
  published: z.boolean().optional().default(false),
});

function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

router.get('/', (req, res) => {
  const isAdmin = req.user?.role === 'admin';
  const list = db.data.caseStudies
    .filter((c) => isAdmin || c.published)
    .sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt));
  res.json({ data: list });
});

router.get('/:slug', (req, res) => {
  const cs = db.data.caseStudies.find((c) => c.slug === req.params.slug);
  if (!cs) return res.status(404).json({ error: 'Case study not found' });
  if (!cs.published && req.user?.role !== 'admin') return res.status(404).json({ error: 'Case study not found' });
  res.json({ data: cs });
});

router.post('/', requireAdmin, async (req, res) => {
  const body = { ...req.body };
  if (!body.slug && body.client) body.slug = slugify(body.client);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  if (db.data.caseStudies.find((c) => c.slug === parsed.data.slug)) {
    return res.status(409).json({ error: 'A case study with that slug already exists' });
  }
  const now = new Date().toISOString();
  const cs = {
    id: randomUUID(),
    ...parsed.data,
    publishedAt: parsed.data.published ? now : null,
    createdAt: now,
    updatedAt: now,
  };
  db.data.caseStudies.push(cs);
  await persist();
  res.status(201).json({ data: cs });
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const cs = db.data.caseStudies.find((c) => c.id === req.params.id);
  if (!cs) return res.status(404).json({ error: 'Case study not found' });
  const allowed = ['client', 'slug', 'industry', 'logo', 'product', 'productId', 'accent', 'summary', 'challenge', 'solution', 'outcomes', 'tech', 'stats', 'gallery', 'published'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) cs[key] = req.body[key];
  }
  if (req.body.published === true && !cs.publishedAt) cs.publishedAt = new Date().toISOString();
  cs.updatedAt = new Date().toISOString();
  await persist();
  res.json({ data: cs });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const idx = db.data.caseStudies.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Case study not found' });
  db.data.caseStudies.splice(idx, 1);
  await persist();
  res.json({ ok: true });
});

export default router;
