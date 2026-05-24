import { Router } from 'express';
import { z } from 'zod';
import { db, persist } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { randomUUID } from 'node:crypto';

const router = Router();

const postSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers and dashes only'),
  excerpt: z.string().optional().default(''),
  body: z.string().min(10),
  category: z.string().min(2),
  tags: z.array(z.string()).optional().default([]),
  cover: z.string().optional().default('#00f0ff'),
  readingTime: z.number().int().positive().optional(),
  published: z.boolean().optional().default(false),
});

function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

router.get('/', (req, res) => {
  const isAdmin = req.user?.role === 'admin';
  const list = db.data.posts
    .filter((p) => isAdmin || p.published)
    .sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt));
  res.json({ data: list });
});

router.get('/:slug', (req, res) => {
  const post = db.data.posts.find((p) => p.slug === req.params.slug);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (!post.published && req.user?.role !== 'admin') return res.status(404).json({ error: 'Post not found' });
  res.json({ data: post });
});

router.post('/', requireAdmin, async (req, res) => {
  const body = { ...req.body };
  if (!body.slug && body.title) body.slug = slugify(body.title);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  if (db.data.posts.find((p) => p.slug === parsed.data.slug)) {
    return res.status(409).json({ error: 'A post with that slug already exists' });
  }
  const readingTime = parsed.data.readingTime || Math.max(1, Math.round(parsed.data.body.split(/\s+/).length / 220));
  const now = new Date().toISOString();
  const post = {
    id: randomUUID(),
    ...parsed.data,
    readingTime,
    authorId: req.user.id,
    authorName: req.user.name,
    publishedAt: parsed.data.published ? now : null,
    createdAt: now,
    updatedAt: now,
  };
  db.data.posts.push(post);
  await persist();
  res.status(201).json({ data: post });
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const post = db.data.posts.find((p) => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const allowed = ['title', 'slug', 'excerpt', 'body', 'category', 'tags', 'cover', 'readingTime', 'published'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) post[key] = req.body[key];
  }
  if (req.body.published === true && !post.publishedAt) post.publishedAt = new Date().toISOString();
  if (post.body) post.readingTime = post.readingTime || Math.max(1, Math.round(post.body.split(/\s+/).length / 220));
  post.updatedAt = new Date().toISOString();
  await persist();
  res.json({ data: post });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const idx = db.data.posts.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Post not found' });
  db.data.posts.splice(idx, 1);
  await persist();
  res.json({ ok: true });
});

export default router;
