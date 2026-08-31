const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

// --- Gutscheinarten verwalten ---
router.get('/settings/voucher-types', async (req, res) => {
  const { rows: voucherTypes } = await pool.query('SELECT * FROM voucher_types ORDER BY sort_order');
  res.render('settings-voucher-types', { voucherTypes, saved: req.query.saved === '1' });
});

router.post('/settings/voucher-types/:id', async (req, res) => {
  const { label, default_price, default_leistung, background_image, accent_color, active } = req.body;
  await pool.query(
    `UPDATE voucher_types
     SET label = $1, default_price = $2, default_leistung = $3,
         background_image = $4, accent_color = $5, active = $6
     WHERE id = $7`,
    [label, default_price || null, default_leistung || null, background_image, accent_color, active === 'on', req.params.id]
  );
  res.redirect('/settings/voucher-types?saved=1');
});

// --- Benutzer verwalten ---
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

// --- Statistik ---
router.get('/stats', async (req, res) => {
  const { rows: byType } = await pool.query(`
    SELECT vt.label, vt.category,
           COUNT(*)::int AS anzahl,
           COUNT(*) FILTER (WHERE v.status = 'eingeloest')::int AS eingeloest,
           COALESCE(SUM(v.wert) FILTER (WHERE vt.category = 'wert'), 0) AS summe_wert
    FROM vouchers v JOIN voucher_types vt ON vt.id = v.voucher_type_id
    GROUP BY vt.label, vt.category
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
