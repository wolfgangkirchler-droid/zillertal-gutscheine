const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { generateVoucherQr } = require('./qrcode');

const IMAGES_DIR = path.join(__dirname, '..', '..', 'public', 'images', 'vouchers');
// Legacy-Fallback: das ursprüngliche Zillertal-Sports-Logo, falls für ein
// Unternehmen (noch) kein Logo in der Datenbank hochgeladen wurde.
const LEGACY_LOGO_PATH = path.join(__dirname, '..', '..', 'public', 'images', 'logo', 'logo.png');

const PAGE_WIDTH = 841.89;  // A4 quer
const PAGE_HEIGHT = 595.28;

function formatCurrency(value) {
  return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(value);
}

function formatDate(date) {
  if (!date) return null;
  return new Intl.DateTimeFormat('de-AT').format(new Date(date));
}

/**
 * Baut das Gutschein-PDF und schreibt es in den übergebenen Stream (z.B. res).
 * `voucher` = Zeile aus `vouchers`, `voucherType` = Zeile aus `voucher_types`,
 * `company` = zugehörige Zeile aus `companies` (kann null sein, dann greifen
 * Fallbacks), `baseUrl` wird für den QR-Code-Link gebraucht.
 */
async function renderVoucherPdf({ voucher, voucherType, company, baseUrl }, outputStream) {
  const doc = new PDFDocument({ size: [PAGE_WIDTH, PAGE_HEIGHT], margin: 0 });
  doc.pipe(outputStream);

  const accent = voucherType.accent_color || '#0EA5A5';

  // --- Hintergrundbild bestimmen: Upload aus der DB bevorzugt, sonst
  // Legacy-Datei vom Server, sonst einfarbige Fläche in der Akzentfarbe ---
  let bgSource = null;
  if (voucherType.background_data) {
    bgSource = voucherType.background_data; // Buffer aus der DB
  } else if (voucherType.background_image) {
    const legacyPath = path.join(IMAGES_DIR, voucherType.background_image);
    if (fs.existsSync(legacyPath)) bgSource = legacyPath;
  }

  if (bgSource) {
    doc.image(bgSource, 0, 0, { cover: [PAGE_WIDTH, PAGE_HEIGHT], align: 'center', valign: 'center' });
  } else {
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(accent);
  }

  // Dunkles Verlaufs-Panel links, damit der Text auf jedem Foto lesbar bleibt.
  const panelWidth = PAGE_WIDTH * 0.46;
  const gradient = doc.linearGradient(0, 0, panelWidth, 0);
  gradient
    .stop(0, '#0B0B0B', 1)
    .stop(0.75, '#0B0B0B', 0.88)
    .stop(1, '#0B0B0B', 0);
  doc.rect(0, 0, panelWidth, PAGE_HEIGHT).fill(gradient);

  // Dünner Akzentbalken oben
  doc.rect(0, 0, PAGE_WIDTH, 6).fill(accent);

  // Durchgehender dunkler Fußbalken über die volle Breite, damit die
  // Kontaktzeile unten auch über dem hellen Foto rechts lesbar bleibt.
  const footerBarHeight = 34;
  doc.rect(0, PAGE_HEIGHT - footerBarHeight, PAGE_WIDTH, footerBarHeight).fill('#0B0B0B');

  const marginX = 48;
  let cursorY = 56;

  // --- Logo / Wortmarke: Unternehmens-Logo aus DB, sonst Legacy-Datei,
  // sonst Firmenname als Text ---
  const logoHeight = 54;
  let logoSource = null;
  if (company && company.logo_data) {
    logoSource = company.logo_data;
  } else if (fs.existsSync(LEGACY_LOGO_PATH)) {
    logoSource = LEGACY_LOGO_PATH;
  }

  if (logoSource) {
    doc.image(logoSource, marginX, cursorY, { height: logoHeight });
    cursorY += logoHeight + 22;
  } else {
    const companyName = (company && company.name) ? company.name.toUpperCase() : 'ZILLERTAL SPORTS';
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(14)
      .text(companyName, marginX, cursorY, { characterSpacing: 1.5 });
    cursorY += 14 + 30;
  }

  // --- "GUTSCHEIN" Eyebrow ---
  doc.fillColor(accent).font('Helvetica-Bold').fontSize(12)
    .text('GUTSCHEIN', marginX, cursorY, { characterSpacing: 2 });
  cursorY += 22;

  // --- Titel (Gutscheinart) ---
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(30)
    .text(voucherType.label, marginX, cursorY, { width: panelWidth - marginX - 24 });
  cursorY = doc.y + 16;

  // --- Wert bzw. Leistung ---
  doc.font('Helvetica-Bold').fontSize(22).fillColor(accent);
  if (voucherType.category === 'wert') {
    doc.text(formatCurrency(voucher.wert), marginX, cursorY);
    cursorY = doc.y + 14;
  } else {
    const leistung = voucher.leistung_text || voucherType.default_leistung || '';
    doc.fontSize(14).fillColor('#F2F2F2').font('Helvetica')
      .text(leistung, marginX, cursorY, { width: panelWidth - marginX - 24, lineGap: 3 });
    cursorY = doc.y + 14;
    if (voucher.wert) {
      doc.font('Helvetica-Bold').fontSize(16).fillColor(accent)
        .text(formatCurrency(voucher.wert), marginX, cursorY);
      cursorY = doc.y + 14;
    }
  }

  // --- Personalisierung ---
  if (voucher.empfaenger_name) {
    cursorY += 10;
    doc.font('Helvetica').fontSize(11).fillColor('#CCCCCC')
      .text('Für', marginX, cursorY, { characterSpacing: 1 });
    cursorY = doc.y + 2;
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#FFFFFF')
      .text(voucher.empfaenger_name, marginX, cursorY);
    cursorY = doc.y + 10;
  }
  if (voucher.personal_message) {
    doc.font('Helvetica-Oblique').fontSize(11).fillColor('#DDDDDD')
      .text(`„${voucher.personal_message}"`, marginX, cursorY, { width: panelWidth - marginX - 24, lineGap: 2 });
    cursorY = doc.y + 10;
  }

  // --- Fußbereich: Code, Gültigkeit, QR-Code ---
  const footerY = PAGE_HEIGHT - 120;

  doc.font('Helvetica').fontSize(9).fillColor('#BBBBBB')
    .text('GUTSCHEIN-CODE', marginX, footerY, { characterSpacing: 1.5 });
  doc.font('Helvetica-Bold').fontSize(15).fillColor('#FFFFFF')
    .text(voucher.code, marginX, footerY + 13);

  if (voucher.gueltig_bis) {
    doc.font('Helvetica').fontSize(9).fillColor('#BBBBBB')
      .text('GÜLTIG BIS', marginX, footerY + 42, { characterSpacing: 1.5 });
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#FFFFFF')
      .text(formatDate(voucher.gueltig_bis), marginX, footerY + 55);
  }

  // QR-Code unten rechts im dunklen Panel
  const qrSize = 92;
  const qrBuffer = await generateVoucherQr(voucher.code, baseUrl);
  const qrX = panelWidth - qrSize - 40;
  const qrY = PAGE_HEIGHT - qrSize - 48;
  doc.roundedRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 6).fill('#FFFFFF');
  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
  doc.font('Helvetica').fontSize(7.5).fillColor('#BBBBBB')
    .text('Einlösen vor Ort', qrX - 8, qrY + qrSize + 12, { width: qrSize + 16, align: 'center' });

  // --- Kontaktzeile unten über die volle Breite (auf dem Fußbalken) ---
  const footerText = (company && company.footer_text)
    ? company.footer_text
    : 'Zillertal Sports  ·  Spieljochbahn, 6263 Fügen  ·  +43 5288 20222  ·  info@zillertal-sports.com';
  doc.font('Helvetica').fontSize(9).fillColor('#FFFFFF')
    .text(footerText, marginX, PAGE_HEIGHT - 22, { width: PAGE_WIDTH - marginX * 2 });

  doc.end();
}

module.exports = { renderVoucherPdf };
