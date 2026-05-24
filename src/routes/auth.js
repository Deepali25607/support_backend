import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db, insert, find, persist } from '../db.js';
import { signToken, setAuthCookie, clearAuthCookie, requireAuth, publicUser } from '../middleware/auth.js';

const router = Router();

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  company: z.string().optional().default(''),
});
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  const { name, email, password, company } = parsed.data;
  const existing = find('users', (u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'An account with that email already exists' });
  const user = insert('users', {
    email: email.toLowerCase(),
    name,
    company,
    role: 'customer',
    password: bcrypt.hashSync(password, 10),
  });
  await persist();
  const token = signToken(user);
  setAuthCookie(res, token);
  res.status(201).json({ user: publicUser(user), token });
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
  const { email, password } = parsed.data;
  const user = find('users', (u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ user: publicUser(user), token });
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.patch('/me', requireAuth, async (req, res) => {
  const updates = {};
  if (typeof req.body.name === 'string' && req.body.name.length >= 2) updates.name = req.body.name;
  if (typeof req.body.company === 'string') updates.company = req.body.company;
  if (typeof req.body.phone === 'string') updates.phone = req.body.phone;
  Object.assign(req.user, updates);
  await persist();
  res.json({ user: publicUser(req.user) });
});

export default router;
