'use strict';

const MAX = { name: 100, phone: 32, contact: 120, message: 2000, source: 200 };

const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/** Normalizes a phone number to +digits. Returns '' when it does not look like a phone. */
function normalizePhone(raw) {
  const digits = String(raw ?? '').replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  const count = digits.replace('+', '').length;
  if (count < 7 || count > 15) return '';
  return digits.startsWith('+') ? digits : '+' + digits;
}

/**
 * Validates an incoming lead.
 * Requires a name and at least one way to reach the person (phone or contact: email / @username).
 * `website` is a honeypot field: bots fill it, people never see it.
 */
function validateLead(input = {}) {
  const errors = [];
  if (clean(input.website, 50)) return { ok: false, spam: true, errors: ['spam'] };
  const lead = {
    name: clean(input.name, MAX.name),
    phone: normalizePhone(input.phone),
    contact: clean(input.contact || input.email || input.telegram, MAX.contact),
    message: clean(input.message, MAX.message),
    source: clean(input.source || 'website', MAX.source),
    promo: clean(input.promo, 30).toUpperCase(),
  };
  if (!lead.name) errors.push('name is required');
  if (input.phone && !lead.phone) errors.push('phone looks invalid');
  if (!lead.phone && !lead.contact) errors.push('phone or contact is required');
  return errors.length ? { ok: false, errors } : { ok: true, lead };
}

const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Formats a lead as a Telegram HTML message. */
function formatLead(lead, date = new Date()) {
  const rows = [
    ['👤 Name', lead.name],
    ['📞 Phone', lead.phone],
    ['✉️ Contact', lead.contact],
    ['💬 Message', lead.message],
    ['🏷 Promo', lead.promo],
    ['🌐 Source', lead.source],
  ].filter(([, v]) => v);
  return `<b>New lead</b> · ${date.toISOString().slice(0, 16).replace('T', ' ')} UTC\n\n` +
    rows.map(([k, v]) => `${k}: ${escapeHtml(v)}`).join('\n');
}

module.exports = { validateLead, normalizePhone, formatLead, escapeHtml };
