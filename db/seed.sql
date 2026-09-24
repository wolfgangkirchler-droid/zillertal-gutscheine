-- Unternehmen zuerst (Gutscheinarten verweisen darauf)
INSERT INTO companies (key, name, footer_text, sort_order)
VALUES
  ('zillertal-sports', 'Zillertal Sports',
   'Zillertal Sports  ·  Spieljochbahn, 6263 Fügen  ·  +43 5288 20222  ·  info@zillertal-sports.com', 1),
  ('skicheck', 'skiCHECK Alpbachtal',
   'skiCHECK Alpbachtal  ·  Inneralpbach 40, 6236 Alpbach  ·  +43 5336 5610460  ·  info@skialpbach.com', 2)
ON CONFLICT (key) DO NOTHING;

-- Gutscheinarten: bestehende Zillertal-Sports-Arten (background_image = Dateiname
-- in public/images/vouchers/, wie bisher) plus neue skiCHECK-Arten (Wert/Leistung
-- werden pro Gutschein frei befüllt, daher kein Vorschlagswert).
INSERT INTO voucher_types (key, label, category, default_price, default_leistung, background_image, accent_color, sort_order)
VALUES
  ('wertgutschein', 'Wertgutschein', 'wert', NULL, NULL, 'wertgutschein-bg.jpg', '#0EA5A5', 1),
  ('flying_fox_erwachsen', 'Flying Fox – Erwachsen', 'leistung', 18.00, 'Eine Fahrt mit dem Mega Flying Fox über die Kaunzbucht am Spieljoch', 'flying-fox-erwachsen-bg.jpg', '#0B7285', 2),
  ('flying_fox_kind', 'Flying Fox – Kind', 'leistung', 18.00, 'Eine Fahrt mit dem Mega Flying Fox über die Kaunzbucht am Spieljoch (in Begleitung eines Erwachsenen)', 'flying-fox-kind-bg.jpg', '#0B7285', 3),
  ('monsterroller', 'Monsterroller', 'leistung', 20.00, 'Ein geführter Downhill-Run mit dem Monsterroller am Spieljoch', 'monsterroller-bg.jpg', '#D9822B', 4),
  ('mountaincart', 'Mountaincart', 'leistung', 20.00, 'Ein geführter Downhill-Run mit dem Mountaincart am Spieljoch', 'mountaincart-bg.jpg', '#D9822B', 5),
  ('kristalldoerfl', 'Kristalldörfl', 'leistung', 16.00, 'Ein Besuch im Kristalldörfl am Spieljoch', 'kristalldoerfl-bg.jpg', '#7048A8', 6),
  ('skicheck_skiverleih', 'skiCHECK Skiverleih', 'leistung', NULL, NULL, NULL, '#1D6FA5', 7),
  ('skicheck_skischule', 'skiCHECK Skischule', 'leistung', NULL, NULL, NULL, '#0E4C75', 8)
ON CONFLICT (key) DO NOTHING;

-- Bestehende (schon vor diesem Update angelegte) Gutscheinarten hatten noch
-- kein company_id gesetzt – hier einmalig nachträglich zuordnen. Läuft bei
-- jedem Deploy erneut, wirkt sich aber nur auf noch nicht zugeordnete Zeilen
-- aus (WHERE company_id IS NULL), also unschädlich bei Wiederholung.
UPDATE voucher_types
SET company_id = (SELECT id FROM companies WHERE key = 'zillertal-sports')
WHERE company_id IS NULL
  AND key IN ('wertgutschein', 'flying_fox_erwachsen', 'flying_fox_kind', 'monsterroller', 'mountaincart', 'kristalldoerfl');

UPDATE voucher_types
SET company_id = (SELECT id FROM companies WHERE key = 'skicheck')
WHERE company_id IS NULL
  AND key IN ('skicheck_skiverleih', 'skicheck_skischule');
