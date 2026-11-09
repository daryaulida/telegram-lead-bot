'use strict';

/** Thin wrapper over the Telegram Bot API using global fetch (Node 18+). */
function createTelegram(token, { fetchImpl = globalThis.fetch } = {}) {
  const base = `https://api.telegram.org/bot${token}`;
  async function call(method, params = {}) {
    const res = await fetchImpl(`${base}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(`Telegram ${method} failed: ${data.description || res.status}`);
    return data.result;
  }
  return {
    call,
    sendMessage: (chatId, text, extra = {}) => call('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra }),
    getUpdates: (offset, timeout = 30) => call('getUpdates', { offset, timeout, allowed_updates: ['message', 'callback_query'] }),
    answerCallbackQuery: (id, text) => call('answerCallbackQuery', { callback_query_id: id, text }),
  };
}

module.exports = { createTelegram };
