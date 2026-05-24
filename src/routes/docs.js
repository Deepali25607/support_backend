import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { db, persist } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

const schema = z.object({
  title: z.string().min(3),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  product: z.string().min(2),
  productLabel: z.string().min(2),
  section: z.string().min(2),
  accent: z.string().optional().default('#00f0ff'),
  body: z.string().min(10),
  readingTime: z.number().int().positive().optional(),
  published: z.boolean().optional().default(false),
});

function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

router.get('/', (req, res) => {
  const isAdmin = req.user?.role === 'admin';
  const list = db.data.docs
    .filter((d) => isAdmin || d.published)
    .sort((a, b) => a.title.localeCompare(b.title));
  res.json({ data: list });
});

router.get('/:slug', (req, res) => {
  const doc = db.data.docs.find((d) => d.slug === req.params.slug);
  if (!doc) return res.status(404).json({ error: 'Article not found' });
  if (!doc.published && req.user?.role !== 'admin') return res.status(404).json({ error: 'Article not found' });
  res.json({ data: doc });
});

router.post('/', requireAdmin, async (req, res) => {
  const body = { ...req.body };
  if (!body.slug && body.title) body.slug = slugify(body.title);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  if (db.data.docs.find((d) => d.slug === parsed.data.slug)) {
    return res.status(409).json({ error: 'An article with that slug already exists' });
  }
  const readingTime = parsed.data.readingTime || Math.max(1, Math.round(parsed.data.body.split(/\s+/).length / 220));
  const now = new Date().toISOString();
  const doc = {
    id: randomUUID(),
    ...parsed.data,
    readingTime,
    publishedAt: parsed.data.published ? now : null,
    createdAt: now,
    updatedAt: now,
  };
  db.data.docs.push(doc);
  await persist();
  res.status(201).json({ data: doc });
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const doc = db.data.docs.find((d) => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Article not found' });
  const allowed = ['title', 'slug', 'product', 'productLabel', 'section', 'accent', 'body', 'readingTime', 'published'];
  for (const key of allowed) if (req.body[key] !== undefined) doc[key] = req.body[key];
  if (req.body.published === true && !doc.publishedAt) doc.publishedAt = new Date().toISOString();
  if (doc.body) doc.readingTime = doc.readingTime || Math.max(1, Math.round(doc.body.split(/\s+/).length / 220));
  doc.updatedAt = new Date().toISOString();
  await persist();
  res.json({ data: doc });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const idx = db.data.docs.findIndex((d) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Article not found' });
  db.data.docs.splice(idx, 1);
  await persist();
  res.json({ ok: true });
});

export default router;
