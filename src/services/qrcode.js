const QRCode = require('qrcode');

/**
 * Erzeugt einen QR-Code als PNG-Buffer für den gegebenen Gutschein-Code.
 * Der QR-Code kodiert die Einlöse-URL, sodass ein Scan direkt auf die
 * Einlöse-Seite dieses Gutscheins springt.
 */
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
