const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

// Bilder werden im Arbeitsspeicher gehalten und direkt in die Datenbank
// geschrieben (nicht auf die Server-Festplatte, die bei jedem Deploy
// zurückgesetzt wird) – so gehen hochgeladene Bilder nie verloren.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Umlaute/Akzente entfernen
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'eintrag';
}

// ============================================================
// UNTERNEHMEN
// ============================================================

router.get('/settings/companies', async (req, res) => {
  const { rows: companies } = await pool.query('SELECT * FROM companies ORDER BY sort_order');
  res.render('settings-companies', { companies, error: null, saved: req.query.saved === '1' });
});

router.post('/settings/companies', upload.single('logo'), async (req, res) => {
  const { name, footer_text } = req.body;
  if (!name || !name.trim()) {
    const { rows: companies } = await pool.query('SELECT * FROM companies ORDER BY sort_order');
    return res.status(400).render('settings-companies', { companies, error: 'Bitte einen Namen eingeben.', saved: false });
  }

  let key = slugify(name);
  try {
    const { rows: existing } = await pool.query('SELECT id FROM companies WHERE key = $1', [key]);
    if (existing.length) key = `${key}_${Date.now().toString(36)}`;

    const { rows: maxSort } = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM companies');

    await pool.query(
      `INSERT INTO companies (key, name, footer_text, logo_data, logo_mimetype, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        key, name.trim(), footer_text || null,
        req.file ? req.file.buffer : null,
        req.file ? req.file.mimetype : null,
        maxSort[0].next
      ]
    );
    res.redirect('/settings/companies?saved=1');
  } catch (err) {
    console.error(err);
    const { rows: companies } = await pool.query('SELECT * FROM companies ORDER BY sort_order');
    res.status(500).render('settings-companies', { companies, error: 'Anlegen fehlgeschlagen. Bitte erneut versuchen.', saved: false });
  }
});

router.post('/settings/companies/:id', upload.single('logo'), async (req, res) => {
  const { name, footer_text, active } = req.body;

  if (req.file) {
    await pool.query(
      `UPDATE companies SET name = $1, footer_text = $2, active = $3, logo_data = $4, logo_mimetype = $5 WHERE id = $6`,
      [name, footer_text || null, active === 'on', req.file.buffer, req.file.mimetype, req.params.id]
    );
  } else {
    await pool.query(
      `UPDATE companies SET name = $1, footer_text = $2, active = $3 WHERE id = $4`,
      [name, footer_text || null, active === 'on', req.params.id]
    );
  }
  res.redirect('/settings/companies?saved=1');
});

// Logo-Vorschau (für <img>-Tags in den Einstellungen)
router.get('/settings/companies/:id/logo', async (req, res) => {
  const { rows } = await pool.query('SELECT logo_data, logo_mimetype FROM companies WHERE id = $1', [req.params.id]);
  const row = rows[0];
  if (!row || !row.logo_data) return res.status(404).end();
  res.setHeader('Content-Type', row.logo_mimetype || 'image/png');
  res.send(row.logo_data);
});

// ============================================================
// GUTSCHEINARTEN
// ============================================================

router.get('/settings/voucher-types', async (req, res) => {
  const { rows: voucherTypes } = await pool.query(
    `SELECT vt.*, c.name AS company_name
     FROM voucher_types vt LEFT JOIN companies c ON c.id = vt.company_id
     ORDER BY c.sort_order NULLS LAST, vt.sort_order`
  );
  const { rows: companies } = await pool.query('SELECT * FROM companies WHERE active = true ORDER BY sort_order');
  res.render('settings-voucher-types', { voucherTypes, companies, saved: req.query.saved === '1', error: null });
});

// --- Neue Gutscheinart erstellen ---
router.post('/settings/voucher-types', upload.single('background'), async (req, res) => {
  const { label, company_id, category, default_price, default_leistung, accent_color } = req.body;

  if (!label || !label.trim()) {
    const { rows: voucherTypes } = await pool.query(
      `SELECT vt.*, c.name AS company_name FROM voucher_types vt LEFT JOIN companies c ON c.id = vt.company_id
       ORDER BY c.sort_order NULLS LAST, vt.sort_order`
    );
    const { rows: companies } = await pool.query('SELECT * FROM companies WHERE active = true ORDER BY sort_order');
    return res.status(400).render('settings-voucher-types', {
      voucherTypes, companies, saved: false, error: 'Bitte eine Bezeichnung eingeben.'
    });
  }

  let key = slugify(label);
  const { rows: existing } = await pool.query('SELECT id FROM voucher_types WHERE key = $1', [key]);
  if (existing.length) key = `${key}_${Date.now().toString(36)}`;

  const { rows: maxSort } = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM voucher_types');

  await pool.query(
    `INSERT INTO voucher_types
      (key, label, category, default_price, default_leistung, accent_color, company_id, background_data, background_mimetype, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      key, label.trim(), category === 'wert' ? 'wert' : 'leistung',
      default_price || null, default_leistung || null,
      accent_color || '#0EA5A5',
      company_id || null,
      req.file ? req.file.buffer : null,
      req.file ? req.file.mimetype : null,
      maxSort[0].next
    ]
  );
  res.redirect('/settings/voucher-types?saved=1');
});

// --- Bestehende Gutscheinart bearbeiten ---
router.post('/settings/voucher-types/:id', upload.single('background'), async (req, res) => {
  const { label, default_price, default_leistung, accent_color, company_id, active } = req.body;

  if (req.file) {
    await pool.query(
      `UPDATE voucher_types
       SET label = $1, default_price = $2, default_leistung = $3,
           accent_color = $4, company_id = $5, active = $6,
           background_data = $7, background_mimetype = $8
       WHERE id = $9`,
      [label, default_price || null, default_leistung || null, accent_color, company_id || null,
       active === 'on', req.file.buffer, req.file.mimetype, req.params.id]
    );
  } else {
    await pool.query(
      `UPDATE voucher_types
       SET label = $1, default_price = $2, default_leistung = $3,
           accent_color = $4, company_id = $5, active = $6
       WHERE id = $7`,
      [label, default_price || null, default_leistung || null, accent_color, company_id || null,
       active === 'on', req.params.id]
    );
  }
  res.redirect('/settings/voucher-types?saved=1');
});

// Hintergrundbild-Vorschau (für <img>-Tags in den Einstellungen und, falls
// gesetzt, auch nutzbar als generelle Bildquelle)
router.get('/settings/voucher-types/:id/image', async (req, res) => {
  const { rows } = await pool.query('SELECT background_data, background_mimetype FROM voucher_types WHERE id = $1', [req.params.id]);
  const row = rows[0];
  if (!row || !row.background_data) return res.status(404).end();
  res.setHeader('Content-Type', row.background_mimetype || 'image/jpeg');
  res.send(row.background_data);
});

// ============================================================
// BENUTZER
// ============================================================

router.get('/settings/users', async (req, res) => {
  const { rows: users } = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at');
  res.render('settings-users', { users, error: null });
});

router.post('/settings/users', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4)',
      [name, email, hash, role === 'admin' ? 'admin' : 'user']
    );
    res.redirect('/settings/users');
  } catch (err) {
    const { rows: users } = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at');
    res.render('settings-users', { users, error: 'Anlegen fehlgeschlagen (existiert die E-Mail bereits?)' });
  }
});

// ============================================================
// STATISTIK
// ============================================================

router.get('/stats', async (req, res) => {
  const { rows: byType } = await pool.query(`
    SELECT vt.label, vt.category, c.name AS company_name,
           COUNT(*)::int AS anzahl,
           COUNT(*) FILTER (WHERE v.status = 'eingeloest')::int AS eingeloest,
           COALESCE(SUM(v.wert) FILTER (WHERE vt.category = 'wert'), 0) AS summe_wert
    FROM vouchers v
    JOIN voucher_types vt ON vt.id = v.voucher_type_id
    LEFT JOIN companies c ON c.id = vt.company_id
    GROUP BY vt.label, vt.category, c.name
    ORDER BY anzahl DESC
  `);
  const { rows: totals } = await pool.query(`
    SELECT
      COUNT(*)::int AS gesamt,
      COUNT(*) FILTER (WHERE status = 'offen')::int AS offen,
      COUNT(*) FILTER (WHERE status = 'bezahlt')::int AS bezahlt,
      COUNT(*) FILTER (WHERE status = 'eingeloest')::int AS eingeloest,
      COALESCE(SUM(wert) FILTER (WHERE status IN ('bezahlt','eingeloest')), 0) AS offener_wert
    FROM vouchers
  `);
  res.render('stats', { byType, totals: totals[0] });
});

module.exports = router;
