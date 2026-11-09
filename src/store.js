'use strict';
const fs = require('fs');

const COLUMNS = ['date', 'name', 'phone', 'contact', 'message', 'promo', 'source'];
const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@]/.test(s)) s = "'" + s; // prevent CSV formula injection in Excel / Google Sheets
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Appends leads to a CSV file that opens directly in Excel or Google Sheets. */
function createCsvStore(file) {
  return {
    async save(lead, date = new Date()) {
      if (!fs.existsSync(file)) await fs.promises.writeFile(file, '\ufeff' + COLUMNS.join(',') + '\n');
      const row = COLUMNS.map((c) => csvCell(c === 'date' ? date.toISOString() : lead[c])).join(',');
      await fs.promises.appendFile(file, row + '\n');
    },
  };
}

module.exports = { createCsvStore, csvCell };
