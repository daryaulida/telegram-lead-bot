'use strict';
const { normalizePhone, validateLead } = require('./validate');

/**
 * Chat questionnaire: name → phone → task. A finished conversation becomes a lead.
 * State lives in memory: a restart only drops conversations that were in progress.
 */
function createConversation({ texts, onLead }) {
  const sessions = new Map();
  const removeKeyboard = { reply_markup: { remove_keyboard: true } };

  /** Handles one incoming message, returns an array of [text, extra] replies. */
  async function handle(msg) {
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();
    const s = sessions.get(chatId);

    if (text === '/start' || text === texts.leave || text.startsWith('/start ')) {
      sessions.set(chatId, { step: 'name', source: text.split(' ')[1] || 'telegram' });
      return [[texts.start], [texts.askName, removeKeyboard]];
    }
    if (text === '/cancel') { sessions.delete(chatId); return [[texts.cancel, removeKeyboard]]; }
    if (!s) return [[texts.start, { reply_markup: { keyboard: [[{ text: texts.leave }]], resize_keyboard: true } }]];

    if (s.step === 'name') {
      if (!text) return [[texts.askName]];
      Object.assign(s, { name: text, step: 'phone' });
      return [[texts.askPhone, { reply_markup: { keyboard: [[{ text: texts.sharePhone, request_contact: true }]], resize_keyboard: true, one_time_keyboard: true } }]];
    }
    if (s.step === 'phone') {
      const phone = normalizePhone(msg.contact ? msg.contact.phone_number : text);
      if (!phone) return [[texts.badPhone]];
      Object.assign(s, { phone, step: 'message' });
      return [[texts.askMessage, removeKeyboard]];
    }
    if (s.step === 'message') {
      sessions.delete(chatId);
      const username = msg.from && msg.from.username ? '@' + msg.from.username : '';
      const v = validateLead({ name: s.name, phone: s.phone, contact: username, message: text === '-' ? '' : text, source: 'telegram:' + s.source });
      if (v.ok) await onLead(v.lead);
      return [[texts.done, removeKeyboard]];
    }
    return [];
  }

  return { handle, sessions };
}

/** Long-polling loop: no public URL or webhook needed. */
async function runPolling(tg, conversation, { log = console } = {}) {
  let offset = 0;
  for (;;) {
    try {
      const updates = await tg.getUpdates(offset, 30);
      for (const u of updates) {
        offset = u.update_id + 1;
        if (!u.message) continue;
        for (const [text, extra] of await conversation.handle(u.message)) await tg.sendMessage(u.message.chat.id, text, extra);
      }
    } catch (e) {
      log.error('[bot]', e.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

module.exports = { createConversation, runPolling };
