'use strict';
const fs = require('fs');
const path = require('path');

/** Minimal .env loader: KEY=value lines, # comments. Real env vars win. */
function loadEnv(file = path.join(process.cwd(), '.env')) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

function getConfig(env = process.env) {
  const cfg = {
    botToken: env.BOT_TOKEN || '',
    leadsChatId: env.LEADS_CHAT_ID || '',
    port: Number(env.PORT) || 3000,
    allowedOrigins: (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
    leadSecret: env.LEAD_SECRET || '',
    leadsFile: env.LEADS_FILE || 'leads.csv',
  };
  const missing = ['botToken', 'leadsChatId'].filter((k) => !cfg[k]);
  if (missing.length) throw new Error(`Missing config: ${missing.join(', ')} (see .env.example)`);
  return cfg;
}

module.exports = { loadEnv, getConfig };
