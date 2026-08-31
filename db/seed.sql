-- Grunddaten für die Gutscheinarten
-- background_image = Dateiname, den du in public/images/vouchers/ ablegen musst (siehe README)

INSERT INTO voucher_types (key, label, category, default_price, default_leistung, background_image, accent_color, sort_order)
VALUES
  ('wertgutschein', 'Wertgutschein', 'wert', NULL, NULL, 'wertgutschein-bg.jpg', '#0EA5A5', 1),
  ('flying_fox_erwachsen', 'Flying Fox – Erwachsen', 'leistung', 18.00, 'Eine Fahrt mit dem Mega Flying Fox über die Kaunzbucht am Spieljoch', 'flying-fox-erwachsen-bg.jpg', '#0B7285', 2),
  ('flying_fox_kind', 'Flying Fox – Kind', 'leistung', 18.00, 'Eine Fahrt mit dem Mega Flying Fox über die Kaunzbucht am Spieljoch (in Begleitung eines Erwachsenen)', 'flying-fox-kind-bg.jpg', '#0B7285', 3),
  ('monsterroller', 'Monsterroller', 'leistung', 20.00, 'Ein geführter Downhill-Run mit dem Monsterroller am Spieljoch', 'monsterroller-bg.jpg', '#D9822B', 4),
  ('mountaincart', 'Mountaincart', 'leistung', 20.00, 'Ein geführter Downhill-Run mit dem Mountaincart am Spieljoch', 'mountaincart-bg.jpg', '#D9822B', 5),
  ('kristalldoerfl', 'Kristalldörfl', 'leistung', 16.00, 'Ein Besuch im Kristalldörfl am Spieljoch', 'kristalldoerfl-bg.jpg', '#7048A8', 6)
ON CONFLICT (key) DO NOTHING;
