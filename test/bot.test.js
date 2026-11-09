'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createConversation } = require('../src/bot');
const TEXTS = require('../src/texts');

test('questionnaire produces a lead', async () => {
  const leads = [];
  const c = createConversation({ texts: TEXTS.en, onLead: async (l) => leads.push(l) });
  const msg = (text, extra = {}) => ({ chat: { id: 1 }, from: { username: 'anna' }, text, ...extra });
  await c.handle(msg('/start ad_campaign'));
  await c.handle(msg('Anna'));
  assert.strictEqual((await c.handle(msg('not a phone')))[0][0], TEXTS.en.badPhone);
  await c.handle(msg('', { contact: { phone_number: '375297813340' } }));
  const reply = await c.handle(msg('Landing page for a cafe'));
  assert.strictEqual(reply[0][0], TEXTS.en.done);
  assert.strictEqual(leads.length, 1);
  assert.deepStrictEqual(
    { name: leads[0].name, phone: leads[0].phone, contact: leads[0].contact, source: leads[0].source },
    { name: 'Anna', phone: '+375297813340', contact: '@anna', source: 'telegram:ad_campaign' },
  );
});

test('/cancel resets the conversation', async () => {
  const c = createConversation({ texts: TEXTS.en, onLead: async () => {} });
  const msg = (text) => ({ chat: { id: 2 }, text });
  await c.handle(msg('/start'));
  assert.strictEqual(c.sessions.size, 1);
  await c.handle(msg('/cancel'));
  assert.strictEqual(c.sessions.size, 0);
});
