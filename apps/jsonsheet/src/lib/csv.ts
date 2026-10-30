/**
 * Minimal, robust CSV/TSV parsing and serialization (RFC 4180 flavored).
 * Handles quoted fields with embedded delimiters, newlines and escaped quotes.
 */

export interface CsvParseOptions {
  delimiter?: string;
}

export interface CsvRow {
  cells: string[];
}

/** Split raw text into rows of string cells. Never throws — bad input yields best-effort rows. */
export function parseCsv(text: string, opts: CsvParseOptions = {}): string[][] {
  const delimiter = opts.delimiter ?? ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    // Skip completely empty trailing rows (e.g. file ends with newline)
    if (row.length === 1 && row[0] === '' && field === '') {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"' && field === '') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === delimiter) {
      pushField();
      i += 1;
      continue;
    }
    if (ch === '\r') {
      i += 1;
      continue;
    }
    if (ch === '\n') {
      pushField();
      pushRow();
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  // Flush last field/row
  pushField();
  if (row.length > 0) pushRow();
  return rows;
}

/** Serialize rows to CSV/TSV text, quoting only when necessary. */
export function serializeCsv(rows: (string | number | boolean | null)[][], opts: CsvParseOptions = {}): string {
  const delimiter = opts.delimiter ?? ',';
  const needsQuote = new RegExp(`["\\n\\r${escapeRegex(delimiter)}]`);
  const esc = (v: string | number | boolean | null): string => {
    const s = v === null || v === undefined ? '' : String(v);
    if (needsQuote.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  return rows.map((r) => r.map(esc).join(delimiter)).join('\n') + '\n';
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Convert flat rows (first row = header) into objects. */
export function rowsToObjects(rows: string[][], hasHeader = true): Record<string, string>[] {
  if (rows.length === 0) return [];
  if (!hasHeader) return rows.map((cells) => Object.fromEntries(cells.map((c, i) => [`col${i + 1}`, c])));
  const header = rows[0].map((h, i) => (h.trim() === '' ? `col${i + 1}` : h.trim()));
  return rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      obj[h] = cells[i] ?? '';
    });
    return obj;
  });
}
