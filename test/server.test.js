'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createLeadServer, rateLimiter } = require('../src/server');

async function withServer(opts, fn) {
  const leads = [];
  const srv = createLeadServer({ onLead: async (l) => leads.push(l), ...opts });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${srv.address().port}`;
  try { await fn(url, leads); } finally { srv.close(); }
}

test('accepts JSON and form-encoded leads', () => withServer({ allowedOrigins: ['https://example.com'] }, async (url, leads) => {
  let r = await fetch(url + '/lead', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://example.com' }, body: JSON.stringify({ name: 'Anna', phone: '+375291112233' }) });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.headers.get('access-control-allow-origin'), 'https://example.com');
  r = await fetch(url + '/lead', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'name=Ivan&contact=ivan%40example.com' });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(leads.map((l) => l.name), ['Anna', 'Ivan']);
  assert.strictEqual(leads[0].source, 'https://example.com');
}));

test('rejects invalid leads, bad JSON and wrong secret', () => withServer({ secret: 's3cret' }, async (url, leads) => {
  const post = (body, secret = 's3cret') => fetch(url + '/lead', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Lead-Secret': secret }, body });
  assert.strictEqual((await post('{}')).status, 422);
  assert.strictEqual((await post('{bad')).status, 400);
  assert.strictEqual((await post(JSON.stringify({ name: 'A', phone: '+1234567' }), 'wrong')).status, 401);
  assert.strictEqual((await post(JSON.stringify({ name: 'Bot', phone: '+1234567', website: 'x' }))).status, 200);
  assert.strictEqual(leads.length, 0);
}));

test('rate limiter blocks bursts', () => {
  const allow = rateLimiter({ limit: 2, windowMs: 1000 });
  assert.deepStrictEqual([allow('ip', 0), allow('ip', 1), allow('ip', 2), allow('ip', 1500)], [true, true, false, true]);
});
