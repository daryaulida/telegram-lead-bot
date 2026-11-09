'use strict';
const { loadEnv, getConfig } = require('./config');
const { createTelegram } = require('./telegram');
const { createCsvStore } = require('./store');
const { createLeadServer } = require('./server');
const { createConversation, runPolling } = require('./bot');
const { formatLead } = require('./validate');
const TEXTS = require('./texts');

loadEnv();
const cfg = getConfig();
const tg = createTelegram(cfg.botToken);
const store = createCsvStore(cfg.leadsFile);

async function onLead(lead) {
  await store.save(lead);
  await tg.sendMessage(cfg.leadsChatId, formatLead(lead));
  console.log('[lead]', lead.name, lead.phone || lead.contact, '←', lead.source);
}

createLeadServer({ onLead, allowedOrigins: cfg.allowedOrigins, secret: cfg.leadSecret })
  .listen(cfg.port, () => console.log(`[http] POST http://localhost:${cfg.port}/lead`));

runPolling(tg, createConversation({ texts: TEXTS[process.env.BOT_LANG] || TEXTS.en, onLead }));
console.log('[bot] polling Telegram…');
