require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false }
    : false
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('→ Führe Schema aus (db/schema.sql) ...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);

    console.log('→ Führe Seed-Daten aus (db/seed.sql) ...');
    const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    await client.query(seed);

    // Ersten Admin-User anlegen, falls noch keiner existiert
    const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM users');
    if (rows[0].count === 0) {
      const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@zillertal-sports.com';
      const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'aendern123';
      const hash = await bcrypt.hash(adminPassword, 10);
      await client.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')`,
        ['Admin', adminEmail, hash]
      );
      console.log(`→ Admin-User angelegt: ${adminEmail} / ${adminPassword}`);
      console.log('  WICHTIG: Passwort nach dem ersten Login sofort ändern!');
    } else {
      console.log('→ Es existieren bereits Benutzer, überspringe Admin-Anlage.');
    }

    console.log('✓ Migration abgeschlossen.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Migration fehlgeschlagen:', err);
  process.exit(1);
});
