-- Zillertal Sports / skiCHECK Gutschein-Verwaltung – Datenbankschema
-- Wird bei JEDEM Start erneut ausgeführt (siehe db/migrate.js). Deshalb hier
-- ausschließlich additive, wiederholbare Anweisungen verwenden:
-- CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS. Niemals DROP oder
-- eine bestehende Tabelle umdefinieren – das würde auf der Live-Datenbank
-- (mit bereits verkauften Gutscheinen!) nichts anrichten, weil CREATE TABLE
-- IF NOT EXISTS bei einer schon existierenden Tabelle ein no-op ist, aber
-- zur Sicherheit trotzdem: alles hier ist additiv.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unternehmen: eigenes Logo + Footer-Adresszeile pro Firma (z.B. Zillertal
-- Sports, skiCHECK). Logo wird als Bild direkt in der Datenbank gespeichert
-- (nicht auf der Server-Festplatte, die bei jedem Deploy zurückgesetzt wird).
CREATE TABLE IF NOT EXISTS companies (
  id              SERIAL PRIMARY KEY,
  key             VARCHAR(50) UNIQUE NOT NULL,
  name            VARCHAR(150) NOT NULL,
  footer_text     VARCHAR(300),
  logo_data       BYTEA,
  logo_mimetype   VARCHAR(50),
  active          BOOLEAN NOT NULL DEFAULT true,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Gutschein-Arten inkl. Basis-Preis & Hintergrundbild fürs PDF-Design
-- (über die Einstellungen von Admins pflegbar)
CREATE TABLE IF NOT EXISTS voucher_types (
  id                  SERIAL PRIMARY KEY,
  key                 VARCHAR(50) UNIQUE NOT NULL,   -- z.B. 'flying_fox_erwachsen'
  label               VARCHAR(100) NOT NULL,          -- z.B. 'Flying Fox Erwachsen'
  category            VARCHAR(20) NOT NULL DEFAULT 'leistung' CHECK (category IN ('wert', 'leistung')),
  default_price       NUMERIC(10,2),                  -- Vorschlagswert, individuell anpassbar
  default_leistung    TEXT,                           -- Beschreibungstext der Leistung
  background_image    VARCHAR(255),                   -- Legacy: Dateiname in public/images/vouchers/
  background_data     BYTEA,                          -- Hintergrundbild als Upload (bevorzugt, falls vorhanden)
  background_mimetype VARCHAR(50),
  accent_color        VARCHAR(20) DEFAULT '#0EA5A5',
  active              BOOLEAN NOT NULL DEFAULT true,
  sort_order          INT NOT NULL DEFAULT 0
);

-- Additive Erweiterung für bereits existierende Installationen: neue Spalte,
-- alte Daten/Zeilen bleiben unangetastet.
ALTER TABLE voucher_types ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
ALTER TABLE voucher_types ADD COLUMN IF NOT EXISTS background_data BYTEA;
ALTER TABLE voucher_types ADD COLUMN IF NOT EXISTS background_mimetype VARCHAR(50);

CREATE TABLE IF NOT EXISTS vouchers (
  id                SERIAL PRIMARY KEY,
  code              VARCHAR(20) UNIQUE NOT NULL,   -- eindeutiger Gutschein-Code (auch im QR-Code)
  voucher_type_id   INT NOT NULL REFERENCES voucher_types(id),
  wert              NUMERIC(10,2),                 -- Betrag bei Wertgutschein
  leistung_text     TEXT,                          -- individuelle Leistungsbeschreibung
  empfaenger_name   VARCHAR(150),
  personal_message  TEXT,
  gueltig_bis       DATE,
  status            VARCHAR(20) NOT NULL DEFAULT 'offen'
                     CHECK (status IN ('offen', 'bezahlt', 'eingeloest', 'storniert')),
  created_by        INT REFERENCES users(id),
  paid_at           TIMESTAMPTZ,
  paid_by           INT REFERENCES users(id),
  redeemed_at       TIMESTAMPTZ,
  redeemed_by       INT REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);

-- Session-Tabelle für connect-pg-simple
CREATE TABLE IF NOT EXISTS "session" (
  "sid" VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  "sess" JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
