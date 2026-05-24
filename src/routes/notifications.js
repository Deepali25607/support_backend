import { Router } from 'express';
import { db, persist } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// SSE: keep a registry of open subscribers per user
const subscribers = new Map(); // userId -> Set<res>

function addSubscriber(userId, res) {
  if (!subscribers.has(userId)) subscribers.set(userId, new Set());
  subscribers.get(userId).add(res);
}

function removeSubscriber(userId, res) {
  const set = subscribers.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) subscribers.delete(userId);
}

export function broadcastNotification(notification) {
  const set = subscribers.get(notification.userId);
  if (!set) return;
  const payload = `data: ${JSON.stringify(notification)}\n\n`;
  for (const res of set) {
    try { res.write(payload); } catch { /* connection gone */ }
  }
}

router.get('/', requireAuth, (req, res) => {
  const mine = db.data.notifications
    .filter((n) => n.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 50);
  const unread = mine.filter((n) => !n.read).length;
  res.json({ data: mine, unread });
});

router.get('/stream', requireAuth, (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
  res.write(`: connected ${new Date().toISOString()}\n\n`);

  addSubscriber(req.user.id, res);

  const ping = setInterval(() => {
    try { res.write(`: ping ${Date.now()}\n\n`); } catch { /* dead */ }
  }, 25000);

  req.on('close', () => {
    clearInterval(ping);
    removeSubscriber(req.user.id, res);
  });
});

router.post('/:id/read', requireAuth, async (req, res) => {
  const n = db.data.notifications.find((x) => x.id === req.params.id && x.userId === req.user.id);
  if (!n) return res.status(404).json({ error: 'Notification not found' });
  n.read = true;
  await persist();
  res.json({ data: n });
});

router.post('/read-all', requireAuth, async (req, res) => {
  let count = 0;
  for (const n of db.data.notifications) {
    if (n.userId === req.user.id && !n.read) { n.read = true; count++; }
  }
  if (count) await persist();
  res.json({ ok: true, marked: count });
});

export default router;
