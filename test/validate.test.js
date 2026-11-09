'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { validateLead, normalizePhone, formatLead } = require('../src/validate');
const { csvCell } = require('../src/store');

test('normalizes phone numbers', () => {
  assert.strictEqual(normalizePhone('+375 (29) 781-33-40'), '+375297813340');
  assert.strictEqual(normalizePhone('8 029 781 33 40'), '+80297813340');
  assert.strictEqual(normalizePhone('12'), '');
  assert.strictEqual(normalizePhone('call me'), '');
});

test('accepts a lead with name and phone', () => {
  const v = validateLead({ name: '  Anna ', phone: '+375 29 000 00 00', message: 'Need a landing', promo: 'otido10' });
  assert.ok(v.ok);
  assert.strictEqual(v.lead.name, 'Anna');
  assert.strictEqual(v.lead.promo, 'OTIDO10');
});

test('requires name and a way to contact', () => {
  assert.deepStrictEqual(validateLead({}).errors, ['name is required', 'phone or contact is required']);
  assert.ok(validateLead({ name: 'Ivan', email: 'ivan@example.com' }).ok);
  assert.deepStrictEqual(validateLead({ name: 'Ivan', phone: 'abc' }).errors, ['phone looks invalid', 'phone or contact is required']);
});

test('honeypot marks spam', () => {
  const v = validateLead({ name: 'Bot', phone: '+1234567890', website: 'http://spam' });
  assert.strictEqual(v.spam, true);
});

test('escapes HTML in Telegram message', () => {
  const text = formatLead({ name: '<b>Eve</b>', phone: '+1234567', source: 'site' }, new Date('2026-01-01T10:00:00Z'));
  assert.match(text, /&lt;b&gt;Eve&lt;\/b&gt;/);
  assert.match(text, /2026-01-01 10:00 UTC/);
});

test('CSV cells are escaped and formula-safe', () => {
  assert.strictEqual(csvCell('a,b'), '"a,b"');
  assert.strictEqual(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
});
