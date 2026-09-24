require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const methodOverride = require('method-override');
const path = require('path');
const multer = require('multer');
const pool = require('./db');
const { attachUser } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const voucherRoutes = require('./routes/vouchers');
const redeemRoutes = require('./routes/redeem');
const settingsRoutes = require('./routes/settings');

const app = express();

// Render (wie die meisten Hoster) terminiert HTTPS an einem vorgeschalteten
// Proxy und leitet intern per HTTP weiter. Ohne diese Zeile hält Express die
// Verbindung fälschlich für unverschlüsselt und weigert sich, das sichere
// Session-Cookie zu setzen.
app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(session({
  store: new pgSession({ pool, tableName: 'session' }),
  secret: process.env.SESSION_SECRET || 'bitte-in-.env-aendern',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 12, // 12 Stunden
    secure: process.env.NODE_ENV === 'production'
  }
}));

app.use(attachUser);

app.use('/', authRoutes);
app.use('/', voucherRoutes);
app.use('/', redeemRoutes);
app.use('/', settingsRoutes);

app.use((req, res) => {
  res.status(404).render('error', { title: 'Seite nicht gefunden', message: 'Diese Seite gibt es nicht.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);

  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).render('error', {
      title: 'Datei zu groß',
      message: 'Das hochgeladene Bild ist größer als 20 MB. Bitte ein kleineres Foto wählen (z.B. am Handy vor dem Hochladen verkleinern) und erneut versuchen.'
    });
  }

  res.status(500).render('error', { title: 'Fehler', message: 'Etwas ist schiefgelaufen. Bitte erneut versuchen.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Gutschein-App läuft auf Port ${PORT}`);
});
