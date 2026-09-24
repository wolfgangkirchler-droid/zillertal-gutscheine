const QRCode = require('qrcode');

async function generateVoucherQr(code, baseUrl) {
  const redeemUrl = `${baseUrl}/redeem/${code}`;
  return QRCode.toBuffer(redeemUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 300,
    color: { dark: '#1A1A1A', light: '#FFFFFF' }
  });
}

module.exports = { generateVoucherQr };
