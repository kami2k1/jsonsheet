/**
 * Extra converters (batch 2) — pure TypeScript, zero dependencies.
 * Includes a minimal but robust YAML serializer/parser for JSON-sourced data.
 */
import type { Json } from './converters';
import type { ConvertResult } from './converters';

const ok = (output: string, stats?: string): ConvertResult => ({ ok: true, output, stats });
const fail = (error: string): ConvertResult => ({ ok: false, output: '', error });

/* ============================ JSON → YAML ============================ */

const YAML_PLAIN_SAFE = /^[A-Za-z0-9_][A-Za-z0-9_ .\/-]*$/;

function yamlQuote(s: string): string {
  // Double-quote when the plain scalar would be ambiguous.
  if (s === '' || s !== s.trim() || !YAML_PLAIN_SAFE.test(s)) return JSON.stringify(s);
  if (/^(null|true|false|yes|no|on|off|~)$/i.test(s)) return JSON.stringify(s);
  if (/^[-?:,\[\]{}#&*!|>'"%@`]/.test(s)) return JSON.stringify(s);
  if (/[:#]/.test(s)) return JSON.stringify(s);
  if (/^-?[\d.]+(e[-+]?\d+)?$/i.test(s)) return JSON.stringify(s);
  if (/^-?\d*\.\d+$/.test(s)) return JSON.stringify(s);
  return s;
}

function yamlKey(k: string): string {
  return /^[A-Za-z0-9_][A-Za-z0-9_ -]*$/.test(k) && !/:/.test(k) ? k : JSON.stringify(k);
}

function yamlScalarLine(v: Json): string {
  if (v === null) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.length === 0 ? '[]' : JSON.stringify(v);
  if (typeof v === 'object') return Object.keys(v).length === 0 ? '{}' : JSON.stringify(v);
  return yamlQuote(String(v));
}

function isBlockValue(v: Json): boolean {
  if (Array.isArray(v)) return v.length > 0;
  return v !== null && typeof v === 'object' && Object.keys(v).length > 0;
}

function yamlNode(v: Json, indent: number, lines: string[]): void {
  const pad = '  '.repeat(indent);
  if (Array.isArray(v)) {
    if (v.length === 0) {
      lines[lines.length - 1] += ' []';
      return;
    }
    for (const item of v) {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        // Compact "- key: value" style: first entry rides the dash line.
        const entries = Object.entries(item);
        if (entries.length === 0) {
          lines.push(`${pad}- {}`);
          continue;
        }
        const [k0, v0] = entries[0];
        if (isBlockValue(v0)) {
          lines.push(`${pad}- ${yamlKey(k0)}:`);
          yamlNode(v0, indent + 1, lines);
        } else {
          lines.push(`${pad}- ${yamlKey(k0)}: ${yamlScalarLine(v0)}`);
        }
        for (const [k, val] of entries.slice(1)) {
          if (isBlockValue(val)) {
            lines.push(`${pad}  ${yamlKey(k)}:`);
            yamlNode(val, indent + 1, lines);
          } else {
            lines.push(`${pad}  ${yamlKey(k)}: ${yamlScalarLine(val)}`);
          }
        }
      } else if (item !== null && typeof item === 'object') {
        // Nested array item
        lines.push(`${pad}-`);
        yamlNode(item, indent + 1, lines);
      } else {
        lines.push(`${pad}- ${yamlScalarLine(item)}`);
      }
    }
    return;
  }
  if (v !== null && typeof v === 'object') {
    const entries = Object.entries(v);
    if (entries.length === 0) {
      lines[lines.length - 1] += ' {}';
      return;
    }
    for (const [k, val] of entries) {
      if (isBlockValue(val)) {
        lines.push(`${pad}${yamlKey(k)}:`);
        yamlNode(val, indent + 1, lines);
      } else {
        lines.push(`${pad}${yamlKey(k)}: ${yamlScalarLine(val)}`);
      }
    }
    return;
  }
  // Scalar root
  lines[lines.length - 1] += ` ${yamlScalarLine(v)}`;
}

export function jsonToYaml(text: string): ConvertResult {
  let data: Json;
  try {
    data = JSON.parse(text) as Json;
  } catch (e) {
    return fail(`JSON không hợp lệ: ${(e as Error).message}`);
  }
  const lines: string[] = [''];
  if (Array.isArray(data) || (data !== null && typeof data === 'object')) {
    yamlNode(data, 0, lines);
  } else {
    lines.push(data === null ? 'null' : yamlQuote(String(data)));
  }
  const out = lines.join('\n').replace(/^\n/, '') + '\n';
  const count = Array.isArray(data) ? `${data.length} items` : '1 root';
  return ok(out, count);
}

/* ============================ YAML → JSON ============================ */

interface YLine {
  indent: number;
  text: string;
}

function stripInlineComment(s: string): string {
  // Remove " #..." when outside quotes
  let inS = false;
  let inD = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (c === '#' && !inS && !inD && i > 0 && (s[i - 1] === ' ' || s[i - 1] === '\t')) return s.slice(0, i).trimEnd();
  }
  return s.trimEnd();
}

function parseFlow(s: string): Json {
  // Minimal flow parser: [a, b] / {a: 1, b: x} — recursive on nested brackets.
  const parse = (i: number): [Json, number] => {
    while (s[i] === ' ') i++;
    if (s[i] === '[') {
      const arr: Json[] = [];
      i++;
      while (i < s.length) {
        while (s[i] === ' ') i++;
        if (s[i] === ']') return [arr, i + 1];
        const [val, ni] = parse(i);
        arr.push(val);
        i = ni;
        while (s[i] === ' ') i++;
        if (s[i] === ',') i++;
      }
      throw new Error('Unclosed flow sequence "["');
    }
    if (s[i] === '{') {
      const obj: Record<string, Json> = {};
      i++;
      while (i < s.length) {
        while (s[i] === ' ') i++;
        if (s[i] === '}') return [obj, i + 1];
        let key = '';
        if (s[i] === '"' || s[i] === "'") {
          const q = s[i];
          i++;
          while (s[i] !== q) key += s[i++];
          i++;
        } else {
          while (i < s.length && s[i] !== ':') key += s[i++];
        }
        while (s[i] === ' ') i++;
        if (s[i] !== ':') throw new Error('Expected ":" in flow mapping');
        i++; // skip ':'
        const [val, ni] = parse(i);
        obj[key.trim()] = val;
        i = ni;
        while (s[i] === ' ') i++;
        if (s[i] === ',') i++;
      }
      throw new Error('Unclosed flow mapping "{"');
    }
    if (s[i] === '"' || s[i] === "'") {
      const q = s[i];
      i++;
      let str = '';
      while (i < s.length && s[i] !== q) {
        if (q === '"' && s[i] === '\\') {
          str += s[i + 1] === 'n' ? '\n' : s[i + 1] === 't' ? '\t' : s[i + 1];
          i += 2;
        } else str += s[i++];
      }
      return [str, i + 1];
    }
    let raw = '';
    while (i < s.length && s[i] !== ',' && s[i] !== ']' && s[i] !== '}') raw += s[i++];
    return [yamlScalar(raw.trim()), i];
  };
  const [val] = parse(0);
  return val;
}

function yamlScalar(raw: string): Json {
  const s = raw.trim();
  if (s === '' || s === '~' || s === 'null' || s === 'Null' || s === 'NULL') return null;
  if (s === 'true' || s === 'True' || s === 'TRUE' || s === 'yes' || s === 'on') return true;
  if (s === 'false' || s === 'False' || s === 'FALSE' || s === 'no' || s === 'off') return false;
  if (/^-?\d+$/.test(s) && s.length < 16) return Number(s);
  if (/^-?\d*\.\d+(e[-+]?\d+)?$/i.test(s)) return Number(s);
  if (/^-?[\d.]+e[-+]?\d+$/i.test(s)) return Number(s);
  if ((s.startsWith('"') && s.endsWith('"') && s.length >= 2) || (s.startsWith("'") && s.endsWith("'") && s.length >= 2)) {
    const inner = s.slice(1, -1);
    if (s[0] === '"') return JSON.parse(s);
    return inner.replace(/''/g, "'");
  }
  if (s.startsWith('[') || s.startsWith('{')) return parseFlow(s);
  return s;
}

export function yamlToJson(text: string): ConvertResult {
  const rawLines = text.replace(/\r\n?/g, '\n').split('\n');
  const lines: YLine[] = [];
  for (const rl of rawLines) {
    const stripped = stripInlineComment(rl.replace(/\t/g, '  '));
    if (!stripped.trim()) continue;
    if (stripped.trim() === '---' || stripped.trim() === '...') continue;
    lines.push({ indent: stripped.length - stripped.trimStart().length, text: stripped.trim() });
  }
  if (lines.length === 0) return fail('YAML trống hoặc không có nội dung.');

  let pos = 0;
  const parseBlock = (indent: number): Json => {
    if (pos >= lines.length) return null;
    const first = lines[pos];
    if (first.indent < indent) return null;
    if (first.text.startsWith('- ') || first.text === '-') {
      // Sequence
      const arr: Json[] = [];
      const seqIndent = first.indent;
      while (pos < lines.length && lines[pos].indent === seqIndent && (lines[pos].text.startsWith('- ') || lines[pos].text === '-')) {
        const item = lines[pos].text === '-' ? '' : lines[pos].text.slice(2).trim();
        if (item === '') {
          pos++;
          arr.push(pos < lines.length && lines[pos].indent > seqIndent ? parseBlock(lines[pos].indent) : null);
        } else if (yamlIsMapEntry(item)) {
          // List of maps: rewrite this line as "key: value" at indent+2 and parse as block
          lines[pos] = { indent: seqIndent + 2, text: item };
          arr.push(parseMap(seqIndent + 2));
        } else {
          pos++;
          arr.push(yamlScalar(item));
        }
      }
      return arr;
    }
    return parseMap(indent);
  };

  const yamlIsMapEntry = (s: string): boolean => {
    // "key:" or "key: value" — key may be quoted
    const m = s.match(/^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^:\s][^:]*):(\s|$)/);
    return m !== null;
  };

  const parseMap = (indent: number): Json => {
    const obj: Record<string, Json> = {};
    while (pos < lines.length && lines[pos].indent === indent) {
      const line = lines[pos];
      if (line.text.startsWith('- ')) break;
      const m = line.text.match(/^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^:]+):\s*(.*)$/);
      if (!m) {
        pos++;
        continue;
      }
      let key = m[1];
      if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
        key = key.startsWith('"') ? JSON.parse(key) : key.slice(1, -1).replace(/''/g, "'");
      }
      const rest = m[2].trim();
      pos++;
      if (rest === '') {
        const next = lines[pos];
        if (next && next.indent === indent && (next.text.startsWith('- ') || next.text === '-')) {
          // Block sequence at the same indentation as its key is valid YAML
          obj[key] = parseBlock(next.indent);
        } else if (next && next.indent > indent) {
          obj[key] = parseBlock(next.indent);
        } else {
          obj[key] = null;
        }
      } else {
        obj[key] = yamlScalar(rest);
      }
    }
    return obj;
  };

  try {
    const result = parseBlock(lines[0].indent);
    return ok(JSON.stringify(result, null, 2) + '\n', `${Object.keys(result as object).length || (result as Json[]).length || 0} phần tử gốc`);
  } catch (e) {
    return fail(`YAML không hợp lệ: ${(e as Error).message}`);
  }
}

/* ============================ Flatten / Unflatten JSON ============================ */

export interface FlattenOptions {
  mode?: 'flatten' | 'unflatten';
}

function flattenTo(obj: Json, prefix: string, out: Record<string, Json>, sep: string): void {
  if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
    const entries = Object.entries(obj);
    if (entries.length === 0) {
      out[prefix || 'root'] = {};
      return;
    }
    for (const [k, v] of entries) flattenTo(v, prefix ? `${prefix}${sep}${k}` : k, out, sep);
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => flattenTo(v, `${prefix}${sep}${i}`, out, sep));
  } else {
    out[prefix] = obj as Json;
  }
}

export function flattenJson(text: string, opts: FlattenOptions = {}): ConvertResult {
  let data: Json;
  try {
    data = JSON.parse(text) as Json;
  } catch (e) {
    return fail(`JSON không hợp lệ: ${(e as Error).message}`);
  }
  const sep = '.';
  if ((opts.mode ?? 'flatten') === 'flatten') {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      return fail('Flatten cần một JSON object ở cấp gốc (array lồng nhau cũng được nhưng root nên là object).');
    }
    const out: Record<string, Json> = {};
    flattenTo(data, '', out, sep);
    return ok(JSON.stringify(out, null, 2) + '\n', `${Object.keys(out).length} key phẳng`);
  }
  // Unflatten
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return fail('Unflatten cần một JSON object phẳng (key dạng "a.b.c").');
  }
  const root: Record<string, Json> = {};
  for (const [flatKey, val] of Object.entries(data as Record<string, Json>)) {
    const parts = flatKey.split(sep);
    let cur: Record<string, Json> = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (cur[p] === undefined || typeof cur[p] !== 'object' || Array.isArray(cur[p])) cur[p] = {};
      cur = cur[p] as Record<string, Json>;
    }
    cur[parts[parts.length - 1]] = val;
  }
  return ok(JSON.stringify(root, null, 2) + '\n', `${Object.keys(root).length} key gốc`);
}

/* ============================ JSON Escape / Unescape ============================ */

export interface JsonEscapeOptions {
  mode?: 'escape' | 'unescape';
}

export function jsonEscape(text: string, opts: JsonEscapeOptions = {}): ConvertResult {
  const mode = opts.mode ?? 'escape';
  if (mode === 'escape') {
    // Escape the raw text so it can be embedded as a JSON string value.
    return ok(JSON.stringify(text), `${text.length.toLocaleString()} chars → escaped`);
  }
  // Unescape: accept a quoted JSON string or a bare escaped string.
  let src = text.trim();
  if (!src.startsWith('"')) src = `"${src}"`;
  try {
    const unescaped = JSON.parse(src) as string;
    return ok(unescaped, `${unescaped.length.toLocaleString()} chars → unescaped`);
  } catch (e) {
    return fail(`Không unescape được: ${(e as Error).message}`);
  }
}

/* ============================ CSV → HTML table ============================ */

export interface CsvToHtmlOptions {
  hasHeader?: boolean;
  cssClass?: string;
}

const htmlEsc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function csvToHtml(text: string, opts: CsvToHtmlOptions = {}): ConvertResult {
  const rows = text.trim() ? text.trim().split(/\r?\n/).map((l) => l.split(',').map((c) => c.trim())) : [];
  if (rows.length === 0) return fail('Không có dữ liệu CSV.');
  const hasHeader = opts.hasHeader !== false;
  const cls = (opts.cssClass || '').trim();
  const attr = cls ? ` class="${htmlEsc(cls)}"` : '';
  const [head, ...body] = rows;
  const parts: string[] = [`<table${attr}>`];
  if (hasHeader) {
    parts.push('  <thead>');
    parts.push('    <tr>');
    for (const c of head) parts.push(`      <th>${htmlEsc(c)}</th>`);
    parts.push('    </tr>');
    parts.push('  </thead>');
    parts.push('  <tbody>');
  } else {
    parts.push('  <tbody>');
    body.unshift(head);
  }
  for (const r of body) {
    parts.push('    <tr>');
    for (const c of r) parts.push(`      <td>${htmlEsc(c)}</td>`);
    parts.push('    </tr>');
  }
  parts.push('  </tbody>');
  parts.push('</table>');
  return ok(parts.join('\n') + '\n', `${body.length} dòng × ${head.length} cột`);
}

/* ============================ JSON → Query String ============================ */

export interface QueryStringOptions {
  sortKeys?: boolean;
}

export function jsonToQueryString(text: string, opts: QueryStringOptions = {}): ConvertResult {
  let data: Json;
  try {
    data = JSON.parse(text) as Json;
  } catch (e) {
    return fail(`JSON không hợp lệ: ${(e as Error).message}`);
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return fail('Cần một JSON object ở cấp gốc.');
  }
  let entries = Object.entries(data as Record<string, Json>);
  if (opts.sortKeys) entries = entries.sort(([a], [b]) => a.localeCompare(b));
  const parts: string[] = [];
  for (const [k, v] of entries) {
    const key = encodeURIComponent(k);
    if (Array.isArray(v)) {
      for (const item of v) parts.push(`${key}=${encodeURIComponent(String(item ?? ''))}`);
    } else if (v !== null && typeof v === 'object') {
      parts.push(`${key}=${encodeURIComponent(JSON.stringify(v))}`);
    } else {
      parts.push(`${key}=${encodeURIComponent(String(v ?? ''))}`);
    }
  }
  return ok(parts.join('&') + '\n', `${entries.length} tham số`);
}

/* ============================ JSON → XML ============================ */

export interface XmlOptions {
  rootName?: string;
}

const xmlEsc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const xmlName = (k: string): string => {
  let n = k.replace(/[^A-Za-z0-9_.-]/g, '_');
  if (/^[^A-Za-z_]/.test(n)) n = '_' + n;
  return n || '_';
};

function xmlNode(v: Json, name: string, indent: number, lines: string[]): void {
  const pad = '  '.repeat(indent);
  if (Array.isArray(v)) {
    // Array elements render as repeated <item> siblings
    for (const item of v) xmlNode(item, 'item', indent, lines);
    return;
  }
  if (v !== null && typeof v === 'object') {
    const entries = Object.entries(v);
    if (entries.length === 0) {
      lines.push(`${pad}<${name} />`);
      return;
    }
    lines.push(`${pad}<${name}>`);
    for (const [k, val] of entries) xmlNode(val, xmlName(k), indent + 1, lines);
    lines.push(`${pad}</${name}>`);
    return;
  }
  if (v === null) {
    lines.push(`${pad}<${name} />`);
  } else {
    lines.push(`${pad}<${name}>${xmlEsc(String(v))}</${name}>`);
  }
}

export function jsonToXml(text: string, opts: XmlOptions = {}): ConvertResult {
  let data: Json;
  try {
    data = JSON.parse(text) as Json;
  } catch (e) {
    return fail(`JSON không hợp lệ: ${(e as Error).message}`);
  }
  const root = xmlName(opts.rootName || 'root');
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>'];
  if (Array.isArray(data)) {
    // Root-level array: wrap so the document has a single root element
    lines.push(`<${root}>`);
    for (const item of data) xmlNode(item, 'item', 1, lines);
    lines.push(`</${root}>`);
  } else {
    xmlNode(data, root, 0, lines);
  }
  const out = lines.join('\n') + '\n';
  const count = Array.isArray(data) ? `${data.length} item` : '1 root';
  return ok(out, count);
}

/* ============================ JSON → JSONL (JSON Lines) ============================ */

export function jsonToJsonl(text: string): ConvertResult {
  let data: Json;
  try {
    data = JSON.parse(text) as Json;
  } catch (e) {
    return fail(`JSON không hợp lệ: ${(e as Error).message}`);
  }
  const items = Array.isArray(data) ? data : [data];
  const lines = items.map((it) => JSON.stringify(it));
  return ok(lines.join('\n') + (lines.length ? '\n' : ''), `${lines.length} dòng NDJSON`);
}

/* ============================ URL params → JSON ============================ */

export interface UrlParamsOptions {
  parseNumbers?: boolean;
}

export function urlParamsToJson(text: string, opts: UrlParamsOptions = {}): ConvertResult {
  const parseNumbers = opts.parseNumbers !== false;
  let qs = text.trim();
  const qIdx = qs.indexOf('?');
  if (qs.startsWith('?') || (qIdx > -1 && qIdx < qs.indexOf('='))) qs = qs.slice(qIdx + 1);
  qs = qs.trim();
  if (!qs) return fail('Không có query string (ví dụ: a=1&b=x)');
  const params: Record<string, Json | Json[]> = {};
  for (const pair of qs.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawVal = eq === -1 ? '' : pair.slice(eq + 1);
    let key: string;
    let val: string;
    try {
      key = decodeURIComponent(rawKey.replace(/\+/g, ' '));
      val = decodeURIComponent(rawVal.replace(/\+/g, ' '));
    } catch {
      key = rawKey;
      val = rawVal;
    }
    const typed: Json = parseNumbers
      ? (val !== '' && /^-?\d+$/.test(val) && val.length < 16 ? Number(val) : /^-?\d*\.\d+$/.test(val) ? Number(val) : val === 'true' ? true : val === 'false' ? false : val)
      : val;
    const existing = params[key];
    if (existing === undefined) params[key] = typed;
    else if (Array.isArray(existing)) existing.push(typed);
    else params[key] = [existing, typed];
  }
  return ok(JSON.stringify(params, null, 2) + '\n', `${Object.keys(params).length} tham số`);
}

/* ============================ Base64 Text ============================ */

export interface Base64Options {
  mode?: 'encode' | 'decode';
}

const b64Encode = (s: string): string => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
};

const b64Decode = (b: string): string => {
  const bin = atob(b.replace(/\s+/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
};

export function base64Text(text: string, opts: Base64Options = {}): ConvertResult {
  const mode = opts.mode ?? 'encode';
  if (mode === 'encode') {
    const out = b64Encode(text);
    return ok(out, `${out.length.toLocaleString()} ký tự base64`);
  }
  try {
    const out = b64Decode(text.trim());
    return ok(out, `${out.length.toLocaleString()} chars decoded`);
  } catch {
    return fail('Base64 không hợp lệ (ký tự lạ hoặc độ dài không chia hết cho 4).');
  }
}
