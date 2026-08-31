# Zillertal Sports – Gutschein-Verwaltung

Web-App zur Erstellung, Verwaltung und Einlösung von Gutscheinen für
[zillertal-sports.com](https://www.zillertal-sports.com). Design im Look einer
modernen ERP-Oberfläche (Xentral-Stil): dunkle Sidebar, Teal-Akzente, klare
Datentabellen.

## Workflow

1. Kunde fragt per Mail nach einem Gutschein an.
2. Mitarbeiter erstellt den Gutschein in der App (Art, Wert/Leistung, Personalisierung).
3. Mitarbeiter verschickt die Rechnung (externes Programm) + das Gutschein-PDF zum Selbstdrucken.
4. Nach Zahlungseingang markiert der Mitarbeiter den Gutschein als **bezahlt** → er ist ab
   jetzt gültig.
5. Bei Einlösung vor Ort: Code eingeben oder QR-Code auf dem Gutschein scannen → bestätigen.
   Der Gutschein wird als **eingelöst** markiert und verliert seine Gültigkeit.

## Rollen

- **Admin**: alles, inkl. Gutscheinarten/Preise pflegen, Benutzer anlegen, Statistik.
- **User (Mitarbeiter)**: Gutscheine erstellen, als bezahlt markieren, einlösen —
  kein Zugriff auf Einstellungen/Statistik.

## Tech-Stack

Node.js + Express + EJS (serverseitig gerendert), PostgreSQL, PDFKit (Gutschein-PDF
inkl. QR-Code), bcrypt (Login). Bewusst schlank gehalten, damit es 1:1 wie die
Rapport-App über GitHub + Render.com läuft — kein Build-Step, kein Headless-Browser.

## 1. Bilder ergänzen (wichtig, vor dem ersten Start!)

Lade folgende Bilder direkt von eurer eigenen Website herunter und lege sie unter
`public/images/vouchers/` mit genau diesen Dateinamen ab (steuert, welches Bild auf
welchem Gutschein erscheint – siehe `db/seed.sql`):

| Datei | Empfohlene Quelle |
|---|---|
| `flying-fox-erwachsen-bg.jpg` | zillertal-sports.com/wp-content/uploads/2019/06/FlyingFox2.jpg |
| `flying-fox-kind-bg.jpg` | dieselbe Seite/Galerie – idealerweise ein Bild mit Kindern |
| `monsterroller-bg.jpg` | zillertal-sports.com/wp-content/uploads/2020/05/mountain-cart-teaser.jpg |
| `mountaincart-bg.jpg` | Galerie-Seite: eigenes Mountaincart-Bild, falls vorhanden |
| `kristalldoerfl-bg.jpg` | zillertal-sports.com/wp-content/uploads/2019/06/KristallPark1.jpg |
| `wertgutschein-bg.jpg` | ein schönes Panorama-/Berghintergrundbild aus eurer [Bildergalerie](https://www.zillertal-sports.com/galerie/) |

Empfehlung: Querformat, mindestens 1600×1100px, damit es das A4-Querformat-PDF
gut ausfüllt (wird automatisch zugeschnitten/gecovert, nicht verzerrt).

Optional: Euer Logo als **helle/weiße Version** unter
`public/images/logo/logo.png` (transparent, ca. 300px hoch) ablegen – erscheint
oben links auf jedem Gutschein. Ohne Logo-Datei wird automatisch der Schriftzug
„ZILLERTAL SPORTS" angezeigt, die App funktioniert also auch ohne.

Weitere Gutscheinarten, Preise oder Texte lassen sich später jederzeit bequem
unter **Einstellungen → Gutscheinarten** in der App selbst anpassen (auch die
Bilddatei-Namen), ohne Code-Änderung.

## 2. Lokal starten (optional, zum Testen)

```bash
npm install
cp .env.example .env
# .env anpassen: DATABASE_URL auf eine lokale/Test-Postgres-DB zeigen lassen
npm run migrate   # legt Tabellen, Gutscheinarten und einen Admin-User an
npm start
```

Die Konsole zeigt beim ersten Start die Admin-Zugangsdaten an
(`INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` aus der `.env`, sonst ein
Standardwert – siehe `.env.example`).

## 3. Deployment auf Render.com (wie bei der Rapport-App)

1. Neues GitHub-Repo anlegen, dieses Projekt pushen.
2. Auf [render.com](https://render.com): **New → PostgreSQL** anlegen (kostenloser
   Plan reicht zum Start) → die `Internal Database URL` merken.
3. **New → Web Service** → das GitHub-Repo verbinden.
   - Build Command: `npm install`
   - Start Command: `npm run migrate && npm start`
     (führt bei jedem Deploy sicher die Migration aus; legt beim allerersten Mal
     die Tabellen + Admin-User an, danach passiert nichts Neues mehr)
   - Environment Variables: `DATABASE_URL` (die Internal Database URL aus Schritt 2),
     `SESSION_SECRET` (langer Zufallsstring), optional
     `INITIAL_ADMIN_EMAIL`/`INITIAL_ADMIN_PASSWORD`.
4. Deploy abwarten, dann unter `https://euer-service.onrender.com/login` mit den
   Admin-Zugangsdaten einloggen und **sofort das Passwort-Konzept klären** (aktuell
   gibt es noch keine „Passwort ändern"-Seite – siehe nächste Schritte unten,
   sag mir Bescheid, dann bauen wir die gleich mit ein).

## Mögliche nächste Schritte

- Eigene „Passwort ändern"-Seite für eingeloggte User
- E-Mail-Versand des Gutschein-PDFs direkt aus der App (statt manuell anhängen)
- Freies Bearbeiten eines Gutscheins nach dem Erstellen (aktuell nur Status-Wechsel)
- Zweite Sprache / Rechnungsnummer-Verknüpfung, falls gewünscht
