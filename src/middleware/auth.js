import jwt from 'jsonwebtoken';
import { find } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'nexus-dev-secret-change-me';
const COOKIE = 'nexus_token';

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function setAuthCookie(res, token) {
  // In production (HTTPS on AWS) the cookie must be `secure`, otherwise the
  // browser refuses to send it. Locally (http://localhost) it stays off.
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 7 * 86400 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE);
}

function readToken(req) {
  const cookieToken = req.cookies?.[COOKIE];
  if (cookieToken) return cookieToken;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

export function attachUser(req, _res, next) {
  const token = readToken(req);
  if (!token) return next();
  try {
    const claims = jwt.verify(token, JWT_SECRET);
    const user = find('users', (u) => u.id === claims.sub);
    if (user) req.user = user;
  } catch { /* ignore bad tokens */ }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

export function publicUser(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
}
