require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change_me';
const BOT_API_KEY = process.env.BOT_API_KEY || 'change_me_too';
const PORT = process.env.PORT || 3000;

function requireAdmin(req, res, next) {
  const auth = req.headers['x-admin-password'];
  if (auth !== ADMIN_PASSWORD) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function requireBot(req, res, next) {
  const auth = req.headers['x-bot-key'];
  if (auth !== BOT_API_KEY) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// ---------- PUBLIC API ----------

app.get('/api/leaderboard', (req, res) => {
  const data = db.load();
  const approved = data.entries
    .filter(e => e.status === 'approved')
    .sort((a, b) => b.amount - a.amount);
  res.json(approved);
});

app.get('/api/settings', (req, res) => {
  const data = db.load();
  res.json(data.settings);
});

// ---------- BOT-ONLY API (called by bot.js with shared key) ----------

// Create a pending entry (after user sends receipt photo)
app.post('/api/bot/entries', requireBot, (req, res) => {
  const { name, username, telegram_id, amount, receipt_file_id } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'invalid amount' });

  const data = db.load();
  const entry = {
    id: db.nextId(data),
    name: name || 'Anonim',
    username: username || null,
    telegram_id,
    amount: Number(amount),
    receipt_file_id: receipt_file_id || null,
    status: 'pending',
    edition_number: null,
    created_at: new Date().toISOString()
  };
  data.entries.push(entry);
  db.save(data);
  res.json(entry);
});

app.get('/api/bot/settings', requireBot, (req, res) => {
  const data = db.load();
  res.json(data.settings);
});

// ---------- ADMIN API ----------

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) return res.json({ ok: true });
  res.status(401).json({ ok: false });
});

app.get('/api/admin/entries', requireAdmin, (req, res) => {
  const data = db.load();
  res.json(data.entries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

app.post('/api/admin/entries/:id/approve', requireAdmin, (req, res) => {
  const data = db.load();
  const entry = data.entries.find(e => e.id === Number(req.params.id));
  if (!entry) return res.status(404).json({ error: 'not found' });
  entry.status = 'approved';

  // assign numbered edition if requested and available
  if (req.body && req.body.assign_edition) {
    if (data.settings.editions_sold < data.settings.editions_total) {
      data.settings.editions_sold += 1;
      entry.edition_number = data.settings.editions_sold;
    }
  }
  db.save(data);
  res.json(entry);
});

app.post('/api/admin/entries/:id/reject', requireAdmin, (req, res) => {
  const data = db.load();
  const entry = data.entries.find(e => e.id === Number(req.params.id));
  if (!entry) return res.status(404).json({ error: 'not found' });
  entry.status = 'rejected';
  db.save(data);
  res.json(entry);
});

app.post('/api/admin/settings', requireAdmin, (req, res) => {
  const data = db.load();
  Object.assign(data.settings, req.body);
  db.save(data);
  res.json(data.settings);
});

app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishlayapti`);
  console.log(`Sayt: http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
});
