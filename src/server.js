'use strict';
const http = require('http');
const { validateLead } = require('./validate');

/** Simple fixed-window rate limiter per IP. */
function rateLimiter({ limit = 5, windowMs = 60_000 } = {}) {
  const hits = new Map();
  return (key, now = Date.now()) => {
    const h = hits.get(key);
    if (!h || now - h.start > windowMs) { hits.set(key, { start: now, count: 1 }); return true; }
    h.count += 1;
    return h.count <= limit;
  };
}

function readBody(req, max = 32 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > max) { reject(Object.assign(new Error('Payload too large'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parseBody(raw, type = '') {
  if (type.includes('application/json')) return JSON.parse(raw || '{}');
  return Object.fromEntries(new URLSearchParams(raw));
}

/**
 * HTTP endpoint for website forms: POST /lead (JSON or form-urlencoded).
 * onLead(lead) is called for every valid lead.
 */
function createLeadServer({ onLead, allowedOrigins = [], secret = '', limit = rateLimiter() }) {
  return http.createServer(async (req, res) => {
    const origin = req.headers.origin || '';
    const allowOrigin = allowedOrigins.includes('*') ? '*' : allowedOrigins.includes(origin) ? origin : '';
    const send = (status, body) => {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        ...(allowOrigin && { 'Access-Control-Allow-Origin': allowOrigin, Vary: 'Origin' }),
        'Access-Control-Allow-Headers': 'Content-Type, X-Lead-Secret',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      });
      res.end(JSON.stringify(body));
    };
    try {
      if (req.method === 'OPTIONS') return send(204, {});
      if (req.method === 'GET' && req.url === '/health') return send(200, { ok: true });
      if (req.method !== 'POST' || !req.url.startsWith('/lead')) return send(404, { ok: false, error: 'Not found' });
      if (secret && req.headers['x-lead-secret'] !== secret) return send(401, { ok: false, error: 'Unauthorized' });
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
      if (!limit(ip)) return send(429, { ok: false, error: 'Too many requests' });
      const data = parseBody(await readBody(req), req.headers['content-type']);
      const v = validateLead(data);
      if (v.spam) return send(200, { ok: true }); // do not tell bots they were caught
      if (!v.ok) return send(422, { ok: false, errors: v.errors });
      await onLead({ ...v.lead, source: v.lead.source === 'website' && origin ? origin : v.lead.source });
      return send(200, { ok: true });
    } catch (e) {
      return send(e.status || (e instanceof SyntaxError ? 400 : 500), { ok: false, error: e.status || e instanceof SyntaxError ? e.message : 'Internal error' });
    }
  });
}

module.exports = { createLeadServer, rateLimiter, parseBody };
