# telegram-lead-bot

[![Tests](https://github.com/daryaulida/telegram-lead-bot/actions/workflows/test.yml/badge.svg)](https://github.com/daryaulida/telegram-lead-bot/actions/workflows/test.yml)
![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

A small, **zero-dependency** Telegram bot that collects leads for a small business and sends each one to your Telegram chat, so no request gets lost:

- **In Telegram:** a short questionnaire (name → phone → task) with a "share my phone" button.
- **From your website:** an HTTP endpoint `POST /lead` for any form (plain HTML, WordPress, Tilda, React…).

Every lead is also appended to `leads.csv`, which opens in Excel or Google Sheets.

```
Website form ──POST /lead──┐
                           ├──► validation + anti-spam ──► Telegram chat  +  leads.csv
Telegram questionnaire ────┘
```

## Features

- No npm dependencies. It uses only Node.js 18+ built-ins (`http`, `fetch`, `node:test`).
- Accepts JSON and `application/x-www-form-urlencoded` bodies, so it works with a plain `<form>`.
- Anti-spam:
  - a honeypot field;
  - a per-IP rate limit;
  - a body size limit;
  - an optional shared secret header.
- CORS allow-list for browser forms.
- Normalizes phone numbers, escapes HTML in Telegram messages, and protects the CSV against formula injection.
- Tracks the lead source: `t.me/your_bot?start=ads` saves the source as `telegram:ads`.
- Message texts in English and Russian (`BOT_LANG=ru`).
- Long polling, so you don't need a public URL to run the bot.

## Quick start

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy its token.
2. Find your chat id: send any message to [@userinfobot](https://t.me/userinfobot). For a group, add the bot to the group and use the group id.
3. Configure and run:

```bash
git clone https://github.com/daryaulida/telegram-lead-bot.git
cd telegram-lead-bot
cp .env.example .env      # fill BOT_TOKEN and LEADS_CHAT_ID
npm start
```

4. Open `examples/form.html` in a browser and send a test lead. It arrives in your chat within a second.

## Configuration

| Variable | Required | Description |
|---|---|---|
| `BOT_TOKEN` | yes | Token from @BotFather |
| `LEADS_CHAT_ID` | yes | Chat or group that receives leads |
| `PORT` | no | HTTP port, default `3000` |
| `ALLOWED_ORIGINS` | no | Comma-separated origins allowed to post from a browser, or `*` |
| `LEAD_SECRET` | no | When set, requests must send it in the `X-Lead-Secret` header (use it for server-to-server calls) |
| `LEADS_FILE` | no | CSV path, default `leads.csv` |
| `BOT_LANG` | no | `en` (default) or `ru` |

## API

`POST /lead`. Every field except `name` is optional, but a lead needs at least one of `phone` or `contact`.

```json
{ "name": "Anna", "phone": "+375 29 123-45-67", "contact": "@anna", "message": "Need a landing page", "promo": "OTIDO10", "source": "pricing-page" }
```

| Status | Meaning |
|---|---|
| `200` | Lead accepted (a request caught by the honeypot also gets `200`, so bots don't learn they were filtered) |
| `422` | Validation errors: `{ "ok": false, "errors": [...] }` |
| `400` / `401` / `413` / `429` | Bad JSON / wrong secret / body too large / rate limited |

`GET /health` returns `{ "ok": true }` for uptime checks.

### Connecting a WordPress form

Most form plugins (Contact Form 7, MetForm, Elementor Forms, WPForms) can send a webhook. Point the webhook to `https://your-server/lead` and map the fields to `name`, `phone`, `message`.

## Project structure

```
src/
  index.js      wiring: config → Telegram, CSV store, HTTP server, bot
  validate.js   lead validation, phone normalization, message formatting
  server.js     HTTP endpoint, CORS, rate limit, body parsing
  bot.js        questionnaire state machine + long polling
  telegram.js   minimal Bot API client
  store.js      CSV storage
  texts.js      EN / RU messages
test/           node:test unit and HTTP tests
examples/       ready-to-use HTML form
```

## Development

```bash
npm test
```

## Deploy

Any machine with Node.js 18+ will work, for example a $5 VPS with `pm2 start src/index.js --name lead-bot`. Put it behind nginx with HTTPS if browser forms post to it directly.

## License

MIT © [Daria Ulida](https://github.com/daryaulida) · [Otido](https://otido.dev)
