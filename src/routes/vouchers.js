const express = require('express');
const { customAlphabet } = require('nanoid');
const pool = require('../db');
const { requireLogin } = require('../middleware/auth');
const { renderVoucherPdf } = require('../services/pdfGenerator');

const router = express.Router();

// Ohne verwechselbare Zeichen (0/O, 1/I) – leichter am Telefon vorzulesen
const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

const STATUS_LABELS = {
  offen: 'Offen',
  bezahlt: 'Bezahlt / Gültig',
  eingeloest: 'Eingelöst',
  storniert: 'Storniert'
};

router.use(requireLogin);

// --- Dashboard / Liste ---
router.get('/', async (req, res) => {
  const { status, type, q } = req.query;
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`v.status = $${params.length}`);
  }
  if (type) {
    params.push(type);
    conditions.push(`vt.key = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    conditions.push(`(v.code ILIKE $${params.length} OR v.empfaenger_name ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: vouchers } = await pool.query(
    `SELECT v.*, vt.label AS type_label, vt.category, vt.accent_color
     FROM vouchers v
     JOIN voucher_types vt ON vt.id = v.voucher_type_id
     ${where}
     ORDER BY v.created_at DESC
     LIMIT 200`,
    params
  );

  const { rows: counts } = await pool.query(
    `SELECT status, COUNT(*)::int AS count FROM vouchers GROUP BY status`
  );
  const { rows: voucherTypes } = await pool.query(
    'SELECT * FROM voucher_types WHERE active = true ORDER BY sort_order'
  );

  const statusCounts = { offen: 0, bezahlt: 0, eingeloest: 0, storniert: 0 };
  counts.forEach((c) => { statusCounts[c.status] = c.count; });

  res.render('dashboard', {
    vouchers,
    voucherTypes,
    statusCounts,
    statusLabels: STATUS_LABELS,
    filters: { status: status || '', type: type || '', q: q || '' }
  });
});

// --- Neuer Gutschein: Formular ---
router.get('/vouchers/new', async (req, res) => {
  const { rows: voucherTypes } = await pool.query(
    'SELECT * FROM voucher_types WHERE active = true ORDER BY sort_order'
  );
  res.render('voucher-new', { voucherTypes, error: null, formData: {} });
});

// --- Neuer Gutschein: Speichern ---
router.post('/vouchers', async (req, res) => {
  const { voucher_type_id, wert, leistung_text, empfaenger_name, personal_message, gueltig_bis } = req.body;

  const { rows: voucherTypes } = await pool.query(
    'SELECT * FROM voucher_types WHERE active = true ORDER BY sort_order'
  );
  const voucherType = voucherTypes.find((t) => t.id === parseInt(voucher_type_id, 10));

  if (!voucherType) {
    return res.status(400).render('voucher-new', {
      voucherTypes, error: 'Bitte eine gültige Gutscheinart wählen.', formData: req.body
    });
  }

  const code = generateCode();
  const finalWert = wert ? parseFloat(wert) : (voucherType.category === 'wert' ? null : voucherType.default_price);

  try {
    const { rows } = await pool.query(
      `INSERT INTO vouchers
        (code, voucher_type_id, wert, leistung_text, empfaenger_name, personal_message, gueltig_bis, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        code, voucherType.id, finalWert,
        leistung_text || voucherType.default_leistung,
        empfaenger_name || null, personal_message || null,
        gueltig_bis || null, req.session.user.id
      ]
    );
    res.redirect(`/vouchers/${rows[0].id}`);
  } catch (err) {
    console.error(err);
    res.status(500).render('voucher-new', {
      voucherTypes, error: 'Speichern fehlgeschlagen. Bitte erneut versuchen.', formData: req.body
    });
  }
});

// --- Detailansicht ---
router.get('/vouchers/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT v.*, vt.label AS type_label, vt.category, vt.accent_color, vt.background_image
     FROM vouchers v JOIN voucher_types vt ON vt.id = v.voucher_type_id
     WHERE v.id = $1`,
    [req.params.id]
  );
  const voucher = rows[0];
  if (!voucher) return res.status(404).render('error', { title: 'Nicht gefunden', message: 'Dieser Gutschein existiert nicht.' });
  res.render('voucher-detail', { voucher, statusLabels: STATUS_LABELS });
});

// --- Als bezahlt markieren ---
router.post('/vouchers/:id/mark-paid', async (req, res) => {
  await pool.query(
    `UPDATE vouchers SET status = 'bezahlt', paid_at = now(), paid_by = $1
     WHERE id = $2 AND status = 'offen'`,
    [req.session.user.id, req.params.id]
  );
  res.redirect(`/vouchers/${req.params.id}`);
});

// --- Stornieren ---
router.post('/vouchers/:id/cancel', async (req, res) => {
  await pool.query(
    `UPDATE vouchers SET status = 'storniert' WHERE id = $1 AND status != 'eingeloest'`,
    [req.params.id]
  );
  res.redirect(`/vouchers/${req.params.id}`);
});

// --- PDF-Download ---
router.get('/vouchers/:id/pdf', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT v.*, vt.* , v.id AS id
     FROM vouchers v JOIN voucher_types vt ON vt.id = v.voucher_type_id
     WHERE v.id = $1`,
    [req.params.id]
  );
  const row = rows[0];
  if (!row) return res.status(404).send('Gutschein nicht gefunden.');

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="gutschein-${row.code}.pdf"`);

  await renderVoucherPdf({
    voucher: row,
    voucherType: row,
    baseUrl
  }, res);
});

module.exports = router;
