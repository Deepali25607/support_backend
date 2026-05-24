import { Router } from 'express';
import { db, persist } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

const ALLOWED_FIELDS = [
  'brandName', 'brandTagline',
  'bg0', 'bg1', 'bg2',
  'accentCyan', 'accentBlue', 'accentViolet', 'accentMagenta', 'accentGreen', 'accentAmber',
  'text0', 'text1', 'text2',
  'gradPrimaryFrom', 'gradPrimaryTo',
  'showScanLines', 'showGridOverlay', 'showOrbs', 'showGlow',
  'fontDisplay', 'fontMono',
];

const DEFAULTS = {
  brandName: 'NEXUS',
  brandTagline: '/ software.lab',
  bg0: '#04070f',
  bg1: '#080d1a',
  bg2: '#0d142a',
  accentCyan: '#00f0ff',
  accentBlue: '#3a8dff',
  accentViolet: '#b537ff',
  accentMagenta: '#ff2bd1',
  accentGreen: '#39ff14',
  accentAmber: '#ffb627',
  text0: '#eaf2ff',
  text1: '#b6c4dd',
  text2: '#6b7a9b',
  gradPrimaryFrom: '#00f0ff',
  gradPrimaryTo: '#b537ff',
  showScanLines: true,
  showGridOverlay: true,
  showOrbs: true,
  showGlow: true,
  fontDisplay: 'Space Grotesk',
  fontMono: 'JetBrains Mono',
};

const HEX = /^#[0-9a-fA-F]{6}$/;

function activeTheme() {
  return db.data.themes.find((t) => t.active) || db.data.themes[0];
}

// Public — used by the frontend ThemeContext
router.get('/', (_req, res) => {
  const t = activeTheme();
  if (!t) return res.json({ data: { ...DEFAULTS } });
  res.json({ data: t });
});

// Admin — full doc with metadata
router.get('/admin', requireAdmin, (_req, res) => {
  const t = activeTheme();
  res.json({ data: t, defaults: DEFAULTS });
});

// Admin — update fields
router.put('/', requireAdmin, async (req, res) => {
  const t = activeTheme();
  if (!t) return res.status(404).json({ error: 'No active theme' });
  const patch = req.body || {};
  for (const key of ALLOWED_FIELDS) {
    if (!(key in patch)) continue;
    const val = patch[key];
    if (key.startsWith('show')) {
      t[key] = !!val;
    } else if (['bg0', 'bg1', 'bg2', 'accentCyan', 'accentBlue', 'accentViolet', 'accentMagenta', 'accentGreen', 'accentAmber', 'text0', 'text1', 'text2', 'gradPrimaryFrom', 'gradPrimaryTo'].includes(key)) {
      if (typeof val === 'string' && HEX.test(val)) t[key] = val.toLowerCase();
    } else if (typeof val === 'string') {
      t[key] = val.slice(0, 80);
    }
  }
  t.updatedAt = new Date().toISOString();
  await persist();
  res.json({ data: t });
});

// Admin — reset to defaults
router.post('/reset', requireAdmin, async (_req, res) => {
  const t = activeTheme();
  if (!t) return res.status(404).json({ error: 'No active theme' });
  Object.assign(t, DEFAULTS);
  t.updatedAt = new Date().toISOString();
  await persist();
  res.json({ data: t });
});

export default router;
