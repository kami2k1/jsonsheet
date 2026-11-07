/**
 * Subtitle toolkit — SRT/VTT parse, convert, shift, to-text, to-CSV/JSON.
 * Pure TypeScript, zero dependencies. Malformed cues are skipped, never thrown.
 */

export interface Cue {
  /** Start time in seconds. */
  start: number;
  /** End time in seconds. */
  end: number;
  /** Cue text (may contain \n). */
  text: string;
}

/** Parse "HH:MM:SS,mmm" / "HH:MM:SS.mmm" / "MM:SS.mmm" to seconds. Returns NaN on failure. */
export function parseTimestamp(s: string): number {
  const m = s.trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2})[.,](\d{1,3})$/);
  if (!m) return NaN;
  const h = m[1] ? Number(m[1]) : 0;
  const mi = Number(m[2]);
  const se = Number(m[3]);
  const ms = Number(m[4].padEnd(3, '0'));
  return h * 3600 + mi * 60 + se + ms / 1000;
}

function fmtTimestamp(seconds: number, dot: boolean): string {
  const clamped = Math.max(0, seconds);
  const h = Math.floor(clamped / 3600);
  const mi = Math.floor((clamped % 3600) / 60);
  const se = Math.floor(clamped % 60);
  const ms = Math.round((clamped - Math.floor(clamped)) * 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(h)}:${p(mi)}:${p(se)}${dot ? '.' : ','}${p(ms, 3)}`;
}

const CUE_TIME = /([0-9:.,]+)\s*-->\s*([0-9:.,]+)/;

/** Parse SRT content. Skips index lines and malformed blocks. */
export function parseSRT(text: string): Cue[] {
  return parseBlockFormat(text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'));
}

/** Parse WebVTT content. Skips WEBVTT header, NOTE and STYLE blocks. */
export function parseVTT(text: string): Cue[] {
  return parseBlockFormat(text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'));
}

function parseBlockFormat(text: string): Cue[] {
  const cues: Cue[] = [];
  for (const block of text.split(/\n{2,}/)) {
    const lines = block.split('\n').filter((l) => l.trim() !== '');
    if (lines.length === 0) continue;
    if (/^WEBVTT/i.test(lines[0]) && !CUE_TIME.test(lines[0])) continue;
    if (/^NOTE\b|^STYLE\b|^REGION\b/i.test(lines[0])) continue;
    const timeLineIdx = lines.findIndex((l) => CUE_TIME.test(l));
    if (timeLineIdx === -1) continue;
    const m = lines[timeLineIdx].match(CUE_TIME);
    if (!m) continue;
    const start = parseTimestamp(m[1]);
    const end = parseTimestamp(m[2]);
    if (isNaN(start) || isNaN(end)) continue;
    const textLines = lines.slice(timeLineIdx + 1).join('\n').trim();
    cues.push({ start, end, text: textLines });
  }
  return cues.sort((a, b) => a.start - b.start);
}

/** Serialize cues to SRT. */
export function toSRT(cues: Cue[]): string {
  return (
    cues
      .map(
        (c, i) =>
          `${i + 1}\n${fmtTimestamp(c.start, false)} --> ${fmtTimestamp(c.end, false)}\n${c.text}`,
      )
      .join('\n\n') + '\n'
  );
}

/** Serialize cues to WebVTT. */
export function toVTT(cues: Cue[]): string {
  return (
    'WEBVTT\n\n' +
    cues
      .map((c) => `${fmtTimestamp(c.start, true)} --> ${fmtTimestamp(c.end, true)}\n${c.text}`)
      .join('\n\n') +
    '\n'
  );
}

/** Shift every cue by deltaSeconds (negative = earlier). */
export function shiftCues(cues: Cue[], deltaSeconds: number): Cue[] {
  return cues.map((c) => ({
    start: Math.max(0, c.start + deltaSeconds),
    end: Math.max(0, c.end + deltaSeconds),
    text: c.text,
  }));
}

/** Strip basic markup tags (<i>, <b>, <font …>, {\…}) and join lines. */
export function cuesToText(cues: Cue[], dedupe = true): string {
  const clean = (s: string) =>
    s
      .replace(/<[^>]+>/g, '')
      .replace(/\{\\[^}]*\}/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  const lines: string[] = [];
  for (const c of cues) {
    for (const raw of c.text.split('\n')) {
      const t = clean(raw);
      if (!t) continue;
      if (dedupe && lines[lines.length - 1] === t) continue;
      lines.push(t);
    }
  }
  return lines.join('\n') + '\n';
}

import { serializeCsv } from './csv';

/** Cues → CSV (start,end,duration,text) — the "subtitle as data" bridge. */
export function cuesToCsv(cues: Cue[]): string {
  const rows: (string | number | null)[][] = [['start_seconds', 'end_seconds', 'duration_seconds', 'text']];
  for (const c of cues) {
    rows.push([
      Math.round(c.start * 1000) / 1000,
      Math.round(c.end * 1000) / 1000,
      Math.round((c.end - c.start) * 1000) / 1000,
      c.text.replace(/\n/g, ' '),
    ]);
  }
  return serializeCsv(rows);
}

/** Cues → JSON array. */
export function cuesToJson(cues: Cue[]): string {
  const arr = cues.map((c) => ({
    start: Math.round(c.start * 1000) / 1000,
    end: Math.round(c.end * 1000) / 1000,
    duration: Math.round((c.end - c.start) * 1000) / 1000,
    text: c.text,
  }));
  return JSON.stringify(arr, null, 2) + '\n';
}

/** Auto-detect SRT vs VTT from content. */
export function detectSubtitleFormat(text: string): 'srt' | 'vtt' | 'unknown' {
  const t = text.replace(/^\uFEFF/, '').trim();
  if (/^WEBVTT/i.test(t)) return 'vtt';
  if (/\d\s*-->\s*\d/.test(t) && /,\d{3}/.test(t)) return 'srt';
  if (/\d\s*-->\s*\d/.test(t)) return 'vtt';
  return 'unknown';
}

/* ------------------------- Tool-facing wrappers ------------------------- */

export interface SubtitleConvertOptions {
  /** Desired output format. "auto" = the other format of the detected input. */
  output?: 'srt' | 'vtt' | 'auto';
}

export function subtitleConvert(text: string, opts: SubtitleConvertOptions = {}): { ok: boolean; output: string; error?: string; stats?: string } {
  const detected = detectSubtitleFormat(text);
  if (detected === 'unknown') return { ok: false, output: '', error: 'Không nhận diện được SRT hay VTT (cần timestamp dạng -->).' };
  const cues = detected === 'vtt' ? parseVTT(text) : parseSRT(text);
  if (cues.length === 0) return { ok: false, output: '', error: 'Không tìm thấy cue nào trong file.' };
  const wanted = opts.output ?? 'auto';
  const target = wanted === 'auto' ? (detected === 'srt' ? 'vtt' : 'srt') : wanted;
  const out = target === 'vtt' ? toVTT(cues) : toSRT(cues);
  return { ok: true, output: out, stats: `${cues.length} cues · ${detected.toUpperCase()} → ${target.toUpperCase()}` };
}

export interface SubtitleShiftOptions {
  seconds?: number;
  output?: 'srt' | 'vtt' | 'same';
}

export function subtitleShift(text: string, opts: SubtitleShiftOptions = {}): { ok: boolean; output: string; error?: string; stats?: string } {
  const detected = detectSubtitleFormat(text);
  if (detected === 'unknown') return { ok: false, output: '', error: 'Không nhận diện được SRT hay VTT.' };
  const cues = detected === 'vtt' ? parseVTT(text) : parseSRT(text);
  const delta = Number(opts.seconds ?? 0);
  if (isNaN(delta) || delta === 0) return { ok: false, output: '', error: 'Điền số giây cần dịch (âm = sớm hơn, dương = muộn hơn).' };
  const shifted = shiftCues(cues, delta);
  const target = opts.output ?? 'same';
  const out = target === 'srt' ? toSRT(shifted) : target === 'vtt' ? toVTT(shifted) : detected === 'vtt' ? toVTT(shifted) : toSRT(shifted);
  return { ok: true, output: out, stats: `${cues.length} cues · shifted ${delta > 0 ? '+' : ''}${delta}s` };
}

export function subtitleToText(text: string, opts: { dedupe?: boolean } = {}): { ok: boolean; output: string; error?: string; stats?: string } {
  const detected = detectSubtitleFormat(text);
  if (detected === 'unknown') return { ok: false, output: '', error: 'Không nhận diện được SRT hay VTT.' };
  const cues = detected === 'vtt' ? parseVTT(text) : parseSRT(text);
  const out = cuesToText(cues, opts.dedupe !== false);
  return { ok: true, output: out, stats: `${out.split('\n').length - 1} transcript lines` };
}

export interface SubtitleDataOptions {
  format?: 'csv' | 'json';
}

export function subtitleToData(text: string, opts: SubtitleDataOptions = {}): { ok: boolean; output: string; error?: string; stats?: string } {
  const detected = detectSubtitleFormat(text);
  if (detected === 'unknown') return { ok: false, output: '', error: 'Không nhận diện được SRT hay VTT.' };
  const cues = detected === 'vtt' ? parseVTT(text) : parseSRT(text);
  const fmt = opts.format ?? 'csv';
  const out = fmt === 'json' ? cuesToJson(cues) : cuesToCsv(cues);
  return { ok: true, output: out, stats: `${cues.length} cues → ${fmt.toUpperCase()}` };
}
