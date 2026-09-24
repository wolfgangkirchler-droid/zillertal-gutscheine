# Gutschein-Verwaltung (Mehrfirmen)

Web-App zur Erstellung, Verwaltung und Einlösung von Gutscheinen für mehrere
Unternehmen (aktuell Zillertal Sports und skiCHECK Alpbachtal). Design im
Look einer modernen ERP-Oberfläche (Xentral-Stil).

## Was ist neu in dieser Version?

- **Unternehmen** (Sidebar → „Unternehmen"): eigenes Logo + Footer-Adresszeile
  pro Firma. Logo/Footer werden automatisch anhand der gewählten Gutscheinart
  aufs PDF übernommen.
- **Neue Gutscheinarten direkt in der App erstellen** (Sidebar →
  „Gutscheinarten" → „Neue Gutscheinart erstellen"), inklusive
  **Bild-Upload per Browser** – kein Datei-Umbenennen oder Git-Push mehr
  nötig für neue Hintergrundbilder oder Logos. Hochgeladene Bilder landen
  sicher in der Datenbank (nicht auf der Server-Festplatte, die bei jedem
  Deploy zurückgesetzt wird).
- **skiCHECK Skiverleih** und **skiCHECK Skischule** als neue Gutscheinarten
  angelegt (Wert & Leistung werden pro Gutschein frei befüllt).
- Alle Datenbank-Änderungen sind rein additiv (neue Spalten/Tabellen) –
  bestehende, bereits verkaufte Gutscheine bleiben unangetastet.

## Wichtig: Web Service auf einen bezahlten Plan upgraden

Falls die App nach längerer Nicht-Nutzung sehr langsam startet (Render-
Ladebildschirm): Das liegt am **Web Service**, nicht an der Datenbank – der
kostenlose Plan „schläft" nach Inaktivität ein. Render-Dashboard → euer Web
Service → oben bei „Free" auf **„Upgrade your instance"** klicken → z.B.
„Starter" wählen. Kostet ca. 7 $/Monat, dafür läuft die App immer sofort.

## Lokal starten (optional)

```bash
npm install
cp .env.example .env
npm run migrate
npm start
```

## Deployment (GitHub + Render.com)

Unverändert zum bisherigen Setup: Änderungen committen, über GitHub Desktop
pushen, Render deployt automatisch. Die Migration (`npm run migrate`) läuft
bei jedem Start und ergänzt nur neue Tabellen/Spalten – nichts wird
überschrieben oder gelöscht.
