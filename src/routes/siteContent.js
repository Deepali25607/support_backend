import { Router } from 'express';
import { db, persist } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// Public: returns key -> value map for the front-end
router.get('/', (_req, res) => {
  const map = {};
  for (const item of db.data.siteContent) {
    map[item.key] = item.value;
  }
  res.json({ data: map });
});

// Admin: full list with metadata
router.get('/admin', requireAdmin, (_req, res) => {
  res.json({ data: [...db.data.siteContent].sort((a, b) => a.key.localeCompare(b.key)) });
});

// Admin: update a single key's value
router.put('/:key', requireAdmin, async (req, res) => {
  const item = db.data.siteContent.find((c) => c.key === req.params.key);
  if (!item) return res.status(404).json({ error: 'Site content key not found' });
  if (req.body?.value === undefined) return res.status(400).json({ error: 'value required' });
  item.value = req.body.value;
  item.updatedAt = new Date().toISOString();
  await persist();
  res.json({ data: item });
});

export default router;
