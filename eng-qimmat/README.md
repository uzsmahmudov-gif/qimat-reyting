# Eng Qimmat — reyting tizimi

## Tizim qanday ishlaydi

1. Odam botga kiradi, `/start` bosadi → karta raqami va yo'riqnoma chiqadi
2. Summani yozadi, keyin to'lov chekining screenshotini yuboradi
3. Chek **sizga (admin)** Telegram orqali tugmalar bilan keladi: ✅ Tasdiqlash / ❌ Rad etish
4. Tasdiqlasangiz — odam **avtomatik ravishda** saytdagi reytingga qo'shiladi, sizga qo'lda hech narsa qilish shart emas
5. "✅ + Edition" tugmasini bossangiz, unga navbatdagi raqamlangan edition (1-77) ham beriladi

**Muhim:** Chekning haqiqiyligini bot o'zi 100% aniqlay olmaydi (screenshot'ni soxtalashtirish oson). Shuning uchun tugmani bosishdan oldin chekni ko'zingiz bilan tekshirib chiqing — bu jarayon atigi 2-3 soniya vaqt oladi, lekin firibgarlikdan himoya qiladi.

## O'rnatish (birinchi marta)

```bash
npm install
cp .env.example .env
```

`.env` faylini oching va to'ldiring:
- `BOT_TOKEN` — Telegram'da @BotFather ga yozib, `/newbot` orqali oling
- `ADMIN_CHAT_ID` — @userinfobot ga `/start` yozing, u sizga ID beradi
- `ADMIN_PASSWORD` — admin panelga kirish paroli
- `BOT_API_KEY` — istalgan uzun tasodifiy matn
- `CARD_NUMBER`, `CARD_OWNER` — odamlar pul o'tkazadigan karta

## Ishga tushirish

Ikkita alohida jarayon kerak (ikkita terminal oynasida):

```bash
npm start      # veb-server (sayt + admin panel)
npm run bot    # telegram bot
```

- Sayt: `http://localhost:3000`
- Admin panel: `http://localhost:3000/admin.html`

`public/index.html` faylida `YOUR_BOT_USERNAME` ni o'z bot username'ingizga almashtiring.

## Doimiy ishlashi uchun (production)

Kompyuteringizni o'chirsangiz ham bot ishlab turishi uchun buni **serverga (VPS)** joylashtirish kerak. Oson variantlar:

- **Railway.app** yoki **Render.com** — bepul/arzon, GitHub'ga yuklab, ular avtomatik ishga tushiradi
- **Oddiy VPS** (masalan Timeweb, Beget, DigitalOcean) + `pm2` dasturi orqali doimiy ishlatish:
  ```bash
  npm install -g pm2
  pm2 start server.js --name sayt
  pm2 start bot.js --name bot
  pm2 save
  ```

Serverga joylashtirgach, `.env` faylidagi `API_URL` ni haqiqiy domeningizga o'zgartiring (masalan `https://engqimmat.uz`).

## Keyingi qadam: haqiqiy to'lov gateway

Hozirgi tizim — **karta raqamiga qo'lda o'tkazma + chek tasdiqlash** usulida ishlaydi (P2P), bu O'zbekistonda eng tez ishga tushiriladigan variant. Agar kelajakda **Payme yoki Click** kabi rasmiy to'lov tizimini ulasangiz, chek yuborish bosqichi shart bo'lmay qoladi — to'lov avtomatik tasdiqlanadi. Buning uchun tadbirkor sifatida ro'yxatdan o'tish va merchant hisob ochish kerak bo'ladi. Tayyor bo'lganingizda ayting, shu qismni ham qo'shib beraman.

## Fayllar tuzilishi

```
eng-qimmat/
  server.js       # veb-server + API
  bot.js          # telegram bot
  db.js           # ma'lumotlar bazasi (data.json fayl)
  public/
    index.html    # ochiq reyting sahifasi
    admin.html    # admin panel
  .env            # sizning sozlamalaringiz (hech kimga bermang!)
```
