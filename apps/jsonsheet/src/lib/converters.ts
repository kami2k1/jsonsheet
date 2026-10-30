/**
 * JSONSheet core converters — pure TypeScript, zero dependencies.
 * Every function takes text + options and returns converted text.
 * All run client-side: user data never leaves the browser.
 */
import { parseCsv, serializeCsv, rowsToObjects, escapeRegex } from './csv';

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

export interface ConvertResult {
  ok: boolean;
  output: string;
  error?: string;
  stats?: string;
}

const ok = (output: string, stats?: string): ConvertResult => ({ ok: true, output, stats });
const fail = (error: string): ConvertResult => ({ ok: false, output: '', error });

/** Objects/arrays embed as compact JSON text; primitives pass through. */
const toCell = (v: Json): string | number | boolean | null => {
  if (v === undefined) return '';
  if (v !== null && typeof v === 'object') return JSON.stringify(v);
  return v as string | number | boolean | null;
};

/** Strip markdown code fences and stray prose often pasted from ChatGPT/Claude output. */
export function fixAiOutput(text: string): string {
  let t = text.trim();
  // ```json ... ``` / ```csv ... ``` / ``` ... ```
  const fence = t.match(/^```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n?```$/);
  if (fence) t = fence[1].trim();
  // Leading prose like "Here is the JSON:" before a [ or {
  const firstBrace = t.search(/[[{]/);
  if (firstBrace > 0) {
    const opening = t[firstBrace];
    const lastCloser = Math.max(t.lastIndexOf(opening === '[' ? ']' : '}'), t.lastIndexOf(opening));
    if (lastCloser > firstBrace) t = t.slice(firstBrace, lastCloser + 1);
  }
  return t.trim();
}

function parseJsonLoose(text: string): Json {
  return JSON.parse(text) as Json;
}

/* ---------------------------- JSON → CSV ---------------------------- */

export interface JsonToCsvOptions {
  delimiter?: string;
  flatten?: boolean;
  includeHeader?: boolean;
}

function flattenObject(obj: Record<string, Json>, prefix = '', out: Record<string, Json> = {}): Record<string, Json> {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flattenObject(v as Record<string, Json>, key, out);
    } else {
      out[key] = v;
    }
  }
  return out;
}

export function jsonToCsv(text: string, opts: JsonToCsvOptions = {}): ConvertResult {
  const delimiter = opts.delimiter ?? ',';
  let data: Json;
  try {
    data = parseJsonLoose(text);
  } catch (e) {
    return fail(`JSON không hợp lệ: ${(e as Error).message}`);
  }

  let records: Json[];
  if (Array.isArray(data)) {
    records = data;
  } else if (data && typeof data === 'object') {
    // A bare object → treat values arrays as rows if uniform, else key/value rows
    const entries = Object.entries(data as Record<string, Json>);
    const allArrays = entries.every(([, v]) => Array.isArray(v));
    if (allArrays && entries.length > 0) {
      const keys = entries.map(([k]) => k);
      const len = (entries[0][1] as Json[]).length;
      if (entries.every(([, v]) => (v as Json[]).length === len)) {
        const rows: (string | number | boolean | null)[][] = opts.includeHeader === false ? [] : [keys];
        for (let i = 0; i < len; i++) rows.push(entries.map(([, v]) => toCell((v as Json[])[i])));
        return ok(serializeCsv(rows, { delimiter }), `${rows.length} dòng × ${keys.length} cột`);
      }
    }
    records = [opts.flatten === false ? data : flattenObject(data as Record<string, Json>)];
  } else {
    return fail('JSON gốc phải là object hoặc array.');
  }

  // Normalize each record to a flat cell map
  const flat: Record<string, Json>[] = records.map((r) => {
    if (r === null || typeof r !== 'object') return { value: r };
    if (Array.isArray(r)) return Object.fromEntries(r.map((v, i) => [`col${i + 1}`, v]));
    return opts.flatten === false ? (r as Record<string, Json>) : flattenObject(r as Record<string, Json>);
  });

  // Union of keys preserving first-seen order
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const rec of flat) {
    for (const k of Object.keys(rec)) {
      if (!seen.has(k)) {
        seen.add(k);
        columns.push(k);
      }
    }
  }
  if (columns.length === 0) return fail('Không tìm thấy dữ liệu để chuyển đổi.');

  const rows: (string | number | boolean | null)[][] =
    opts.includeHeader === false ? [] : [columns];
  for (const rec of flat) rows.push(columns.map((c) => toCell(rec[c])));
  return ok(serializeCsv(rows, { delimiter }), `${flat.length} dòng × ${columns.length} cột`);
}

/* ---------------------------- CSV → JSON ---------------------------- */

export interface CsvToJsonOptions {
  delimiter?: string;
  hasHeader?: boolean;
  parseNumbers?: boolean;
}

function infer(v: string, parseNumbers: boolean): Json {
  if (v === '') return null;
  if (!parseNumbers) return v;
  if (/^-?\d+$/.test(v) && v.length < 16) return Number(v);
  if (/^-?\d*\.\d+$/.test(v)) return Number(v);
  if (/^(true|false)$/i.test(v)) return v.toLowerCase() === 'true';
  return v;
}

export function csvToJson(text: string, opts: CsvToJsonOptions = {}): ConvertResult {
  const delimiter = opts.delimiter ?? ',';
  const hasHeader = opts.hasHeader !== false;
  const parseNumbers = opts.parseNumbers !== false;
  const rows = parseCsv(text.trim(), { delimiter });
  if (rows.length === 0) return fail('Không có dữ liệu đầu vào.');

  if (!hasHeader) {
    const arr = rows.map((cells) => cells.map((c) => infer(c, parseNumbers)));
    return ok(JSON.stringify(arr, null, 2), `${arr.length} dòng`);
  }
  const objs = rowsToObjects(rows, true).map((o) =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, infer(v, parseNumbers)])),
  );
  return ok(JSON.stringify(objs, null, 2), `${objs.length} objects`);
}

/* ------------------------ JSON ↔ Markdown table ------------------------ */

export function jsonToMarkdown(text: string, opts: JsonToCsvOptions = {}): ConvertResult {
  const res = jsonToCsv(text, { ...opts, delimiter: '\t' });
  if (!res.ok) return res;
  // Reuse csv rows via parse of tab output
  const rows = parseCsv(res.output, { delimiter: '\t' });
  if (rows.length === 0) return fail('Không có dữ liệu.');
  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r: string[]) => [...r, ...Array(width - r.length).fill('')];
  const head = pad(rows[0]);
  const lines = [
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...rows.slice(1).map((r) => `| ${pad(r).join(' | ')} |`),
  ];
  return ok(lines.join('\n') + '\n', res.stats);
}

export function markdownToCsv(text: string, opts: { delimiter?: string } = {}): ConvertResult {
  const delimiter = opts.delimiter ?? ',';
  const rows = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && !/^\|[\s:|-]+\|$/.test(l))
    .map((l) =>
      l
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim()),
    );
  if (rows.length === 0) return fail('Không tìm thấy bảng Markdown (các dòng bắt đầu bằng |).');
  return ok(serializeCsv(rows, { delimiter }), `${rows.length} dòng × ${rows[0].length} cột`);
}

export function csvToMarkdown(text: string, opts: { delimiter?: string } = {}): ConvertResult {
  const rows = parseCsv(text.trim(), { delimiter: opts.delimiter ?? ',' });
  if (rows.length === 0) return fail('Không có dữ liệu đầu vào.');
  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r: string[]) => [...r, ...Array(width - r.length).fill('')];
  const head = pad(rows[0]);
  const lines = [
    `| ${head.map((h) => h || ' ').join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...rows.slice(1).map((r) => `| ${pad(r).join(' | ')} |`),
  ];
  return ok(lines.join('\n') + '\n', `${rows.length - 1} dòng × ${width} cột`);
}

/* ---------------------------- JSON → TypeScript ---------------------------- */

export interface JsonToTsOptions {
  rootName?: string;
}

const pascal = (s: string): string => {
  const clean = s.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c: string) => (c ? c.toUpperCase() : ''));
  return clean.charAt(0).toUpperCase() + clean.slice(1) || 'Item';
};

export function jsonToTs(text: string, opts: JsonToTsOptions = {}): ConvertResult {
  let data: Json;
  try {
    data = parseJsonLoose(text);
  } catch (e) {
    return fail(`JSON không hợp lệ: ${(e as Error).message}`);
  }
  const interfaces: string[] = [];
  const used = new Set<string>();
  const uniqueName = (base: string): string => {
    let name = base;
    let i = 2;
    while (used.has(name)) name = `${base}${i++}`;
    used.add(name);
    return name;
  };

  const tsTypeOf = (v: Json, keyHint: string): string => {
    if (v === null) return 'unknown';
    if (Array.isArray(v)) {
      if (v.length === 0) return 'unknown[]';
      const types = [...new Set(v.map((item) => tsTypeOf(item, keyHint)))];
      return `${types.join(' | ')}[]`;
    }
    if (typeof v === 'object') {
      const name = uniqueName(pascal(keyHint) || 'Item');
      const fields = Object.entries(v as Record<string, Json>)
        .map(([k, val]) => `  ${/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k)}: ${tsTypeOf(val, k)};`)
        .join('\n');
      interfaces.push(`export interface ${name} {\n${fields || '  [key: string]: unknown;'}\n}`);
      return name;
    }
    if (typeof v === 'number') return 'number';
    if (typeof v === 'boolean') return 'boolean';
    return 'string';
  };

  const rootName = pascal(opts.rootName || 'Root');
  let rootType: string;
  if (Array.isArray(data) && data.length > 0) {
    // One interface per distinct object shape is noisy; use the first object as the row type.
    // "Row" suffix avoids the interface name colliding with the root type name.
    const firstObj = data.find((d) => d !== null && typeof d === 'object' && !Array.isArray(d));
    rootType = firstObj
      ? `${tsTypeOf(firstObj, `${rootName}Row`)}[]`
      : `${[...new Set(data.map((d) => tsTypeOf(d, `${rootName}Item`)))].join(' | ')}[]`;
  } else if (data && typeof data === 'object') {
    // "Data" suffix avoids Root = Root self-reference.
    rootType = tsTypeOf(data, `${rootName}Data`);
  } else {
    rootType = tsTypeOf(data, `${rootName}Value`);
  }

  const header = `// Generated by jsonsheet.com — ${new Date().toISOString().slice(0, 10)}\n\nexport type ${rootName} = ${rootType};\n`;
  const body = interfaces.length ? '\n' + interfaces.join('\n\n') + '\n' : '';
  const stats = `${interfaces.length} interface(s)`;
  return ok(header + body, stats);
}

/* ---------------------------- CSV/JSON → SQL ---------------------------- */

export interface SqlOptions {
  table?: string;
  dialect?: 'postgres' | 'mysql';
  createTable?: boolean;
}

const sqlIdent = (name: string, dialect: 'postgres' | 'mysql'): string => {
  const q = dialect === 'mysql' ? '`' : '"';
  const clean = name.replace(/[^a-zA-Z0-9_]+/g, '_').replace(/^(\d)/, 'c$1').toLowerCase();
  return `${q}${clean || 'col'}${q}`;
};

const sqlValue = (v: Json): string => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return `'${String(v).replace(/'/g, "''")}'`;
};

const inferSqlType = (vals: Json[]): string =>
  vals.every((v) => v === null || typeof v === 'number')
    ? 'NUMERIC'
    : vals.every((v) => typeof v === 'boolean' || v === null)
      ? dialectBool
      : 'TEXT';
let dialectBool = 'BOOLEAN';

export function csvToSql(text: string, opts: SqlOptions = {}): ConvertResult {
  const dialect = opts.dialect ?? 'postgres';
  dialectBool = dialect === 'mysql' ? 'TINYINT(1)' : 'BOOLEAN';
  const table = opts.table || 'my_table';
  const rows = parseCsv(text.trim(), { delimiter: ',' });
  if (rows.length < 2) return fail('Cần ít nhất 1 dòng header + 1 dòng dữ liệu.');
  const header = rows[0];
  const dataRows = rows.slice(1).map((cells) => header.map((_, i) => infer(cells[i] ?? '', true)));
  return buildSql(header, dataRows, table, dialect, opts.createTable !== false);
}

export function jsonToSql(text: string, opts: SqlOptions = {}): ConvertResult {
  const dialect = opts.dialect ?? 'postgres';
  dialectBool = dialect === 'mysql' ? 'TINYINT(1)' : 'BOOLEAN';
  const table = opts.table || 'my_table';
  let data: Json;
  try {
    data = parseJsonLoose(text);
  } catch (e) {
    return fail(`JSON không hợp lệ: ${(e as Error).message}`);
  }
  let records: Record<string, Json>[];
  if (Array.isArray(data)) {
    records = data.map((r) => {
      if (r && typeof r === 'object' && !Array.isArray(r)) return r as Record<string, Json>;
      return { value: r as Json };
    });
  } else if (data && typeof data === 'object') {
    records = [data as Record<string, Json>];
  } else {
    return fail('JSON gốc phải là object hoặc array.');
  }
  if (records.length === 0) return fail('Không có dữ liệu.');
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const rec of records) {
    for (const k of Object.keys(rec)) if (!seen.has(k)) { seen.add(k); columns.push(k); }
  }
  const dataRows = records.map((rec) => columns.map((c) => rec[c] ?? null));
  return buildSql(columns, dataRows, table, dialect, opts.createTable !== false);
}

function buildSql(
  columns: string[],
  rows: Json[][],
  table: string,
  dialect: 'postgres' | 'mysql',
  createTable: boolean,
): ConvertResult {
  const idents = columns.map((c) => sqlIdent(c, dialect));
  const parts: string[] = [];
  if (createTable) {
    const cols = idents
      .map((id, i) => `  ${id} ${inferSqlType(rows.map((r) => r[i]))}`)
      .join(',\n');
    parts.push(`CREATE TABLE ${sqlIdent(table, dialect)} (\n${cols}\n);`);
  }
  const insert = `INSERT INTO ${sqlIdent(table, dialect)} (${idents.join(', ')}) VALUES`;
  const values = rows.map((r) => `  (${r.map(sqlValue).join(', ')});`);
  parts.push(`${insert}\n${values.join('\n')}`);
  return ok(parts.join('\n\n') + '\n', `${rows.length} INSERT, ${columns.length} cột`);
}

/* ---------------------------- Format/Validate JSON ---------------------------- */

export interface FormatJsonOptions {
  mode?: 'pretty2' | 'pretty4' | 'minify';
  sortKeys?: boolean;
}

function sortDeep(v: Json): Json {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, Json>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, val]) => [k, sortDeep(val)]),
    );
  }
  return v;
}

export function formatJson(text: string, opts: FormatJsonOptions = {}): ConvertResult {
  let data: Json;
  try {
    data = parseJsonLoose(text);
  } catch (e) {
    const msg = (e as Error).message;
    const pos = msg.match(/position (\d+)/);
    let hint = '';
    if (pos) {
      const p = Number(pos[1]);
      const line = text.slice(0, p).split('\n').length;
      hint = ` (gần dòng ${line})`;
    }
    return fail(`JSON không hợp lệ: ${msg}${hint}`);
  }
  if (opts.sortKeys) data = sortDeep(data);
  const mode = opts.mode ?? 'pretty2';
  // Minify returns exact compact text (no trailing newline); pretty output ends with one.
  const out =
    mode === 'minify' ? JSON.stringify(data) : JSON.stringify(data, null, mode === 'pretty4' ? 4 : 2) + '\n';
  const count = (v: Json): number =>
    Array.isArray(v)
      ? v.length
      : v && typeof v === 'object'
        ? Object.keys(v).length
        : 0;
  return ok(out, `hợp lệ — ${count(data)} key/element cấp gốc`);
}

/* ---------------------------- TSV → JSON ---------------------------- */

export function tsvToJson(text: string, opts: { hasHeader?: boolean; parseNumbers?: boolean } = {}): ConvertResult {
  return csvToJson(text, { delimiter: '\t', hasHeader: opts.hasHeader, parseNumbers: opts.parseNumbers });
}

/* ---------------------------- CSV utilities ---------------------------- */

export function csvDedupe(text: string, opts: { delimiter?: string } = {}): ConvertResult {
  const rows = parseCsv(text.trim(), { delimiter: opts.delimiter ?? ',' });
  if (rows.length === 0) return fail('Không có dữ liệu.');
  const seen = new Set<string>();
  const unique: string[][] = [];
  let removed = 0;
  for (const r of rows) {
    const key = JSON.stringify(r);
    if (seen.has(key)) {
      removed++;
      continue;
    }
    seen.add(key);
    unique.push(r);
  }
  return ok(serializeCsv(unique, { delimiter: opts.delimiter ?? ',' }), `loại bỏ ${removed} dòng trùng, còn ${unique.length}`);
}

export function csvTranspose(text: string, opts: { delimiter?: string } = {}): ConvertResult {
  const rows = parseCsv(text.trim(), { delimiter: opts.delimiter ?? ',' });
  if (rows.length === 0) return fail('Không có dữ liệu.');
  const width = Math.max(...rows.map((r) => r.length));
  const out: string[][] = [];
  for (let c = 0; c < width; c++) {
    out.push(rows.map((r) => r[c] ?? ''));
  }
  return ok(serializeCsv(out, { delimiter: opts.delimiter ?? ',' }), `${width} dòng × ${rows.length} cột sau chuyển vị`);
}

// Re-export for tool pages
export { parseCsv, serializeCsv, escapeRegex };
