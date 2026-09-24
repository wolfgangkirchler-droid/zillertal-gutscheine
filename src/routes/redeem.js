const express = require('express');
const pool = require('../db');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();
router.use(requireLogin);

async function findVoucherByCode(code) {
  const { rows } = await pool.query(
    `SELECT v.*, vt.label AS type_label, vt.category, vt.accent_color
     FROM vouchers v JOIN voucher_types vt ON vt.id = v.voucher_type_id
     WHERE v.code = $1`,
    [code.toUpperCase()]
  );
  return rows[0];
}

router.get('/redeem', (req, res) => {
  res.render('redeem-search', { error: null });
});

router.post('/redeem', async (req, res) => {
  const code = (req.body.code || '').trim();
  const voucher = await findVoucherByCode(code);
  if (!voucher) {
    return res.render('redeem-search', { error: `Kein Gutschein mit Code „${code}" gefunden.` });
  }
  res.redirect(`/redeem/${voucher.code}`);
});

router.get('/redeem/:code', async (req, res) => {
  const voucher = await findVoucherByCode(req.params.code);
  if (!voucher) {
    return res.render('redeem-search', { error: `Kein Gutschein mit Code „${req.params.code}" gefunden.` });
  }
  res.render('redeem-confirm', { voucher });
});

router.post('/redeem/:code/confirm', async (req, res) => {
  const voucher = await findVoucherByCode(req.params.code);
  if (!voucher) return res.redirect('/redeem');

  if (voucher.status === 'bezahlt') {
    await pool.query(
      `UPDATE vouchers SET status = 'eingeloest', redeemed_at = now(), redeemed_by = $1 WHERE id = $2`,
      [req.session.user.id, voucher.id]
    );
  }
  res.redirect(`/vouchers/${voucher.id}`);
});

module.exports = router;
