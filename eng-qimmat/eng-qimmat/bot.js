require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID; // sizning telegram chat_id'ngiz
const CARD_NUMBER = process.env.CARD_NUMBER || '0000 0000 0000 0000';
const CARD_OWNER = process.env.CARD_OWNER || "F.I.Sh.";
const API_URL = process.env.API_URL || 'http://localhost:3000';
const BOT_API_KEY = process.env.BOT_API_KEY || 'change_me_too';

if (!TOKEN) {
  console.error('BOT_TOKEN .env faylida yo\'q! Iltimos qo\'shing.');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// oddiy xotira: har bir chat uchun "hozir nima kutyapmiz" holati
const state = {}; // chat_id -> { step: 'await_amount' | 'await_receipt', amount }

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  state[chatId] = { step: 'await_amount' };
  bot.sendMessage(chatId,
    `Xush kelibsiz! "Eng Qimmat" reytingiga chiqish uchun:\n\n` +
    `💳 Karta: ${CARD_NUMBER}\n👤 Egasi: ${CARD_OWNER}\n\n` +
    `1) Xohlagan summangizni shu yerga o'tkazing\n` +
    `2) Qancha to'laganingizni yozing (masalan: 15000)\n` +
    `3) Keyin to'lov chekining screenshot'ini yuboring\n\n` +
    `Necha so'm to'laysiz?`
  );
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const s = state[chatId];
  if (!s) return; // /start bosmagan, e'tiborsiz qoldiramiz

  // 1-qadam: summani kutyapmiz
  if (s.step === 'await_amount' && msg.text && !msg.text.startsWith('/')) {
    const amount = parseInt(msg.text.replace(/\D/g, ''), 10);
    if (!amount || amount <= 0) {
      return bot.sendMessage(chatId, 'Iltimos, faqat summani raqamda yozing (masalan: 15000).');
    }
    s.amount = amount;
    s.step = 'await_receipt';
    return bot.sendMessage(chatId, `${amount} so'm. Endi to'lov chekining screenshotini (rasm) yuboring.`);
  }

  // 2-qadam: chek rasmini kutyapmiz
  if (s.step === 'await_receipt' && msg.photo) {
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const name = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ');
    const username = msg.from.username ? '@' + msg.from.username : null;

    try {
      const res = await fetch(`${API_URL}/api/bot/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-bot-key': BOT_API_KEY },
        body: JSON.stringify({
          name, username, telegram_id: chatId,
          amount: s.amount, receipt_file_id: fileId
        })
      });
      const entry = await res.json();

      await bot.sendMessage(chatId, 'Rahmat! Chekingiz admin tomonidan tekshirilmoqda. Tasdiqlangach reytingda ko\'rinasiz ✅');

      // Adminga chek va tasdiqlash tugmalarini yuboramiz
      if (ADMIN_CHAT_ID) {
        await bot.sendPhoto(ADMIN_CHAT_ID, fileId, {
          caption:
            `🆕 Yangi to'lov\n👤 ${name} (${username || 'username yo\'q'})\n💰 ${s.amount} so'm\n🆔 chat_id: ${chatId}\n\nTekshiring va tasdiqlang:`,
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Tasdiqlash', callback_data: `approve_${entry.id}` },
              { text: '❌ Rad etish', callback_data: `reject_${entry.id}` }
            ], [
              { text: '✅ Tasdiqlash + Edition raqami berish', callback_data: `approve_edition_${entry.id}` }
            ]]
          }
        });
      }
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, 'Xatolik yuz berdi, keyinroq urinib ko\'ring.');
    }

    delete state[chatId];
  }
});

// Admin tugmani bosganda
bot.on('callback_query', async (query) => {
  const data = query.data;
  const adminChat = query.message.chat.id;

  if (String(adminChat) !== String(ADMIN_CHAT_ID)) {
    return bot.answerCallbackQuery(query.id, { text: 'Sizda ruxsat yo\'q' });
  }

  let action, id, assignEdition = false;
  if (data.startsWith('approve_edition_')) {
    action = 'approve'; id = data.replace('approve_edition_', ''); assignEdition = true;
  } else if (data.startsWith('approve_')) {
    action = 'approve'; id = data.replace('approve_', '');
  } else if (data.startsWith('reject_')) {
    action = 'reject'; id = data.replace('reject_', '');
  } else {
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/admin/entries/${id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': process.env.ADMIN_PASSWORD },
      body: JSON.stringify({ assign_edition: assignEdition })
    });
    const entry = await res.json();

    await bot.answerCallbackQuery(query.id, { text: action === 'approve' ? 'Tasdiqlandi ✅' : 'Rad etildi ❌' });
    await bot.editMessageCaption(
      query.message.caption + `\n\n${action === 'approve' ? '✅ TASDIQLANDI' : '❌ RAD ETILDI'}` +
      (entry.edition_number ? ` (Edition #${entry.edition_number})` : ''),
      { chat_id: adminChat, message_id: query.message.message_id }
    );

    // foydalanuvchiga xabar beramiz
    if (entry.telegram_id) {
      const userMsg = action === 'approve'
        ? `To'lovingiz tasdiqlandi! Siz reytingdasiz 🎉${entry.edition_number ? `\nSizning edition raqamingiz: #${entry.edition_number}` : ''}`
        : 'Afsuski, to\'lovingiz tasdiqlanmadi. Savol bo\'lsa, shu yerga yozing.';
      bot.sendMessage(entry.telegram_id, userMsg).catch(() => {});
    }
  } catch (err) {
    console.error(err);
    bot.answerCallbackQuery(query.id, { text: 'Xatolik yuz berdi' });
  }
});

console.log('Bot ishga tushdi...');
