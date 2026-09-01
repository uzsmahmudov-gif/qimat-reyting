const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

function defaultData() {
  return {
    settings: {
      standard_price: 1000,
      classic_price: 4900,
      premium_price: 9900,
      edition_price: 7777,
      editions_total: 77,
      editions_sold: 0
    },
    entries: [], // {id, name, username, telegram_id, amount, status, edition_number, created_at}
    pending_state: {} // telegram chat_id -> { step, amount }
  };
}

function load() {
  if (!fs.existsSync(DB_FILE)) {
    save(defaultData());
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function nextId(data) {
  return data.entries.length ? Math.max(...data.entries.map(e => e.id)) + 1 : 1;
}

module.exports = { load, save, nextId, DB_FILE };
