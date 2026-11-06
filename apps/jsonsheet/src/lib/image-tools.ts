/**
 * Image metadata parser + AI-signature detector — pure TypeScript, zero dependencies.
 * Reads JPEG (segments/EXIF/XMP/JUMBF), PNG (tEXt/iTXt/eXIf) and WebP (EXIF/XMP) metadata
 * entirely client-side. Never throws for valid images; unknown data degrades gracefully.
 */

export interface ImageSegment {
  name: string;
  size: number;
}

export interface ImageMetadata {
  format: 'jpeg' | 'png' | 'webp' | 'unknown';
  width?: number;
  height?: number;
  fileSize: number;
  segments: ImageSegment[];
  exif: Record<string, string>;
  xmp: string | null;
  pngTexts: { keyword: string; value: string }[];
  hasExif: boolean;
  hasXmp: boolean;
  c2paFound: boolean;
  aiSignatures: { marker: string; evidence: string }[];
  notes: string[];
}

const AI_MARKERS: { marker: string; patterns: RegExp[] }[] = [
  { marker: 'OpenAI / DALL·E', patterns: [/dall[·\-. ]?e/i, /openai/i] },
  { marker: 'Midjourney', patterns: [/midjourney/i, /mj_version/i] },
  { marker: 'Stable Diffusion', patterns: [/stable[ \-]?diffusion/i, /sd-metadata/i, /diffusion_model/i] },
  { marker: 'Adobe Firefly', patterns: [/firefly/i] },
  { marker: 'Google Imagen / Gemini', patterns: [/imagen/i, /\bgemini\b/i] },
  { marker: 'Flux', patterns: [/\bflux\b[ \-]?(dev|schnell|pro|1\.1)?/i] },
  { marker: 'Sora (video frame)', patterns: [/\bsora\b/i] },
  { marker: 'NovelAI', patterns: [/novelai/i] },
  { marker: 'Craiyon', patterns: [/craiyon/i] },
  { marker: 'Ideogram', patterns: [/ideogram/i] },
  { marker: 'Leonardo', patterns: [/leonardo\.ai/i] },
  { marker: 'Generic AI prompt field', patterns: [/negative[ \-_]?prompt/i, /^parameters$/i, /\bprompt:\s/i] },
  { marker: 'C2PA "trained algorithmic media"', patterns: [/trainedalgorithmicmedia/i, /compositewithtrainedalgorithmicmedia/i] },
];

const C2PA_PATTERNS = [/c2pa/i, /jumbf/i, /contentcredentials/i, /\bcai\b/];

const COMMON_AI_DIMENSIONS: [number, number][] = [
  [1024, 1024], [1024, 1536], [1536, 1024], [1024, 1792], [1792, 1024],
  [896, 1152], [1152, 896], [1344, 768], [768, 1344], [1216, 832], [832, 1216],
  [512, 512], [768, 768], [1440, 720],
];

const exifIfd = 'Exif\u0000\u0000';
const xmpSig = 'http://ns.adobe.com/xap/1.0/\u0000';

const latin1 = (bytes: Uint8Array, start: number, end: number): string => {
  let s = '';
  for (let i = start; i < end; i++) s += String.fromCharCode(bytes[i]);
  return s;
};

/** Parse EXIF TIFF block (starts after "Exif\0\0") into a flat tag map. */
export function parseExif(bytes: Uint8Array, start: number, end: number): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    if (start + 8 > end) return out;
    const order = latin1(bytes, start, start + 2);
    const little = order === 'II';
    const big = order === 'MM';
    if (!little && !big) return out;
    const u16 = (o: number) => little ? bytes[o] | (bytes[o + 1] << 8) : (bytes[o] << 8) | bytes[o + 1];
    const u32 = (o: number) => little
      ? (bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | (bytes[o + 3] << 24)) >>> 0
      : ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0;
    if (u16(start + 2) !== 42) return out;
    const TAG_NAMES: Record<number, string> = {
      0x010f: 'Camera Make', 0x0110: 'Camera Model', 0x0131: 'Software',
      0x0132: 'Date/Time', 0x013b: 'Artist', 0x8298: 'Copyright',
      0x0112: 'Orientation', 0x9003: 'Date Taken', 0x9286: 'User Comment',
      0x8827: 'ISO', 0x829a: 'Exposure Time', 0x829d: 'F-Number',
      0x920a: 'Focal Length', 0xa002: 'Exif Width', 0xa003: 'Exif Height',
    };
    const readIfd = (ifdStart: number, depth: number): void => {
      if (ifdStart + 2 > end || depth > 3) return;
      const count = u16(ifdStart);
      if (count > 512) return;
      for (let i = 0; i < count; i++) {
        const e = ifdStart + 2 + i * 12;
        if (e + 12 > end) return;
        const tag = u16(e);
        const type = u16(e + 2);
        const n = u32(e + 4);
        const typeSize: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
        const size = (typeSize[type] ?? 1) * n;
        let dataOff = e + 8;
        if (size > 4) dataOff = start + u32(e + 8);
        if (dataOff < start || dataOff + size > end) continue;
        let val = '';
        if (type === 2) {
          val = latin1(bytes, dataOff, dataOff + n).replace(/\u0000.*$/, '').trim();
        } else if (type === 3 && n === 1) {
          val = String(u16(dataOff));
        } else if (type === 4 && n === 1) {
          val = String(u32(dataOff));
        } else if (type === 5 && n === 1) {
          const num = u32(dataOff), den = u32(dataOff + 4);
          val = den ? String(Math.round((num / den) * 100) / 100) : '0';
        } else {
          val = `[${type}/${n} bytes]`;
        }
        if (val) {
          const name = TAG_NAMES[tag] ?? `Tag 0x${tag.toString(16)}`;
          out[name] = val;
        }
        if (tag === 0x8769) readIfd(start + u32(e + 8), depth + 1); // Exif sub-IFD
        if (tag === 0x8825) readIfd(start + u32(e + 8), depth + 1); // GPS IFD (values raw; skip detail)
      }
    };
    readIfd(start + 8, 0);
  } catch {
    // Metadata parsing must never fail the whole report.
  }
  return out;
}

function parseJpeg(b: Uint8Array, meta: ImageMetadata): void {
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const marker = b[i + 1];
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { i += 2; continue; }
    if (marker === 0xd9) break; // EOI
    const len = (b[i + 2] << 8) | b[i + 3];
    if (len < 2 || i + 2 + len > b.length) break;
    const dataStart = i + 4;
    const name = `0x${marker.toString(16).toUpperCase()}`;
    meta.segments.push({ name, size: len });
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2 || marker === 0xc3) {
      meta.height = (b[dataStart + 1] << 8) | b[dataStart + 2];
      meta.width = (b[dataStart + 3] << 8) | b[dataStart + 4];
    } else if (marker === 0xe1) {
      const sig = latin1(b, dataStart, dataStart + 30);
      if (sig.startsWith(exifIfd)) {
        meta.hasExif = true;
        meta.exif = { ...meta.exif, ...parseExif(b, dataStart + 6, i + 2 + len) };
      } else if (sig.startsWith(xmpSig)) {
        meta.hasXmp = true;
        meta.xmp = latin1(b, dataStart + xmpSig.length, i + 2 + len);
      }
    } else if (marker === 0xeb) {
      // APP11: JUMBF — C2PA Content Credentials container
      const sig = latin1(b, dataStart, dataStart + 8);
      if (/jumbf|c2pa/i.test(sig)) meta.c2paFound = true;
    } else if (marker === 0xfe) {
      meta.exif['JPEG Comment'] = latin1(b, dataStart, i + 2 + len).slice(0, 300);
    }
    i += 2 + len;
  }
}

function parsePng(b: Uint8Array, meta: ImageMetadata): void {
  let i = 8;
  while (i + 8 <= b.length) {
    const len = (b[i] << 24 | b[i + 1] << 16 | b[i + 2] << 8 | b[i + 3]) >>> 0;
    const type = latin1(b, i + 4, i + 8);
    if (i + 12 + len > b.length) break;
    meta.segments.push({ name: type, size: len });
    const dataStart = i + 8;
    if (type === 'IHDR') {
      meta.width = (b[dataStart] << 24 | b[dataStart + 1] << 16 | b[dataStart + 2] << 8 | b[dataStart + 3]) >>> 0;
      meta.height = (b[dataStart + 4] << 24 | b[dataStart + 5] << 16 | b[dataStart + 6] << 8 | b[dataStart + 7]) >>> 0;
    } else if (type === 'tEXt') {
      const nul = b.indexOf(0, dataStart);
      if (nul > -1 && nul < dataStart + len) {
        meta.pngTexts.push({
          keyword: latin1(b, dataStart, nul),
          value: latin1(b, nul + 1, dataStart + len),
        });
      }
    } else if (type === 'iTXt') {
      const parts: number[] = [];
      for (let k = dataStart; k < dataStart + len && parts.length < 4; k++) {
        if (b[k] === 0) parts.push(k);
      }
      if (parts.length >= 2) {
        const keyword = latin1(b, dataStart, parts[0]);
        const compressed = b[parts[0] + 1] === 1;
        // text begins after language tag + translated keyword (2 more NULs)
        const txtStart = parts.length >= 4 ? parts[3] + 1 : parts[1] + 2;
        meta.pngTexts.push({
          keyword,
          value: compressed ? '[compressed text]' : latin1(b, txtStart, dataStart + len).slice(0, 2000),
        });
      }
    } else if (type === 'eXIf') {
      meta.hasExif = true;
      meta.exif = { ...meta.exif, ...parseExif(b, dataStart, dataStart + len) };
    }
    i += 12 + len;
  }
}

function parseWebp(b: Uint8Array, meta: ImageMetadata): void {
  let i = 12;
  while (i + 8 <= b.length) {
    const type = latin1(b, i, i + 4);
    const len = b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24);
    meta.segments.push({ name: type, size: len });
    const dataStart = i + 8;
    if (type === 'VP8X') {
      // canvas size: 24-bit values - 1
      meta.width = 1 + (b[dataStart + 4] | b[dataStart + 5] << 8 | b[dataStart + 6] << 16);
      meta.height = 1 + (b[dataStart + 7] | b[dataStart + 8] << 8 | b[dataStart + 9] << 16);
    } else if (type === 'EXIF') {
      meta.hasExif = true;
      const off = latin1(b, dataStart, dataStart + 6).startsWith(exifIfd) ? 6 : 0;
      meta.exif = { ...meta.exif, ...parseExif(b, dataStart + off, dataStart + len) };
    } else if (type === 'XMP ') {
      meta.hasXmp = true;
      meta.xmp = latin1(b, dataStart, dataStart + Math.min(len, 50000));
    }
    i += 8 + len + (len % 2);
  }
}

export function parseImageMetadata(b: Uint8Array): ImageMetadata {
  const meta: ImageMetadata = {
    format: 'unknown', fileSize: b.length, segments: [], exif: {}, xmp: null,
    pngTexts: [], hasExif: false, hasXmp: false, c2paFound: false, aiSignatures: [], notes: [],
  };
  const magic = latin1(b, 0, 12);
  if (b[0] === 0xff && b[1] === 0xd8) meta.format = 'jpeg';
  else if (b[0] === 0x89 && magic.slice(1, 4) === 'PNG') meta.format = 'png';
  else if (magic.slice(0, 4) === 'RIFF' && magic.slice(8, 12) === 'WEBP') meta.format = 'webp';
  else {
    meta.notes.push('Định dạng không nhận diện được (chỉ hỗ trợ JPEG/PNG/WebP).');
    return meta;
  }
  try {
    if (meta.format === 'jpeg') parseJpeg(b, meta);
    else if (meta.format === 'png') parsePng(b, meta);
    else parseWebp(b, meta);
  } catch {
    meta.notes.push('Cấu trúc file không chuẩn — một số metadata có thể bị bỏ qua.');
  }

  // AI signature scan across all readable metadata
  const haystacks: { src: string; label: (e: string) => string }[] = [];
  if (meta.xmp) haystacks.push({ src: meta.xmp, label: (e) => `XMP: "${e.slice(0, 120)}"` });
  for (const t of meta.pngTexts) haystacks.push({ src: `${t.keyword}\u0000${t.value}`, label: (e) => `PNG text "${t.keyword}": "${e.slice(0, 120)}"` });
  for (const [k, v] of Object.entries(meta.exif)) haystacks.push({ src: `${k}\u0000${v}`, label: (e) => `EXIF ${k}: "${e.slice(0, 120)}"` });
  if (meta.c2paFound) meta.aiSignatures.push({ marker: 'C2PA Content Credentials', evidence: 'JUMBF container present in file' });

  for (const { marker, patterns } of AI_MARKERS) {
    for (const h of haystacks) {
      for (const p of patterns) {
        const m = h.src.match(p);
        if (m) {
          meta.aiSignatures.push({ marker, evidence: h.label(m[0]) });
          break;
        }
      }
    }
  }
  // C2PA byte-scan fallback (container may live in APP11 we didn't label)
  if (!meta.c2paFound) {
    const raw = latin1(b, 0, Math.min(b.length, 300000));
    if (C2PA_PATTERNS.some((p) => p.test(raw))) meta.c2paFound = true;
  }
  return meta;
}

export interface ImageVerdict {
  verdict: string;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
}

export function buildImageVerdict(meta: ImageMetadata): ImageVerdict {
  const reasons: string[] = [];
  const aiEvidence = meta.aiSignatures.filter((s) => s.marker !== 'C2PA Content Credentials');
  if (aiEvidence.length > 0) {
    return {
      verdict: 'AI-GENERATED (metadata evidence)',
      confidence: 'high',
      reasons: [
        ...aiEvidence.map((s) => `${s.marker} → ${s.evidence}`),
        ...(meta.c2paFound ? ['C2PA Content Credentials container present.'] : []),
      ],
    };
  }
  if (meta.c2paFound) {
    return {
      verdict: 'C2PA manifest found — provenance claimed by the file',
      confidence: 'medium',
      reasons: ['File contains a Content Credentials (C2PA/JUMBF) container. Open contentcredentials.org/verify for the full claim history.'],
    };
  }
  const camera = meta.exif['Camera Make'] || meta.exif['Camera Model'];
  if (camera) {
    return {
      verdict: 'Likely a CAMERA photo (no AI signatures)',
      confidence: 'medium',
      reasons: [`EXIF camera data present: ${camera} ${meta.exif['Camera Model'] ?? ''}. No AI generator signatures found in metadata.`],
    };
  }
  const dimNote = meta.width && meta.height
    && COMMON_AI_DIMENSIONS.some(([w, h]) => meta.width === w && meta.height === h);
  if (dimNote) {
    return {
      verdict: 'INCONCLUSIVE — no metadata, but dimensions match common AI output sizes',
      confidence: 'low',
      reasons: [
        `No EXIF/XMP metadata at all — the file was likely re-saved or cleaned, which erases provenance.`,
        `Dimensions ${meta.width}×${meta.height} match sizes commonly produced by AI generators.`,
      ],
    };
  }
  return {
    verdict: 'INCONCLUSIVE — no metadata evidence',
    confidence: 'low',
    reasons: ['No AI signatures, no C2PA container, no camera EXIF. Metadata-based detection cannot determine the origin; pixel-level ML detectors (server-side) are needed for stronger claims.'],
  };
}

export function formatImageReport(meta: ImageMetadata): string {
  const v = buildImageVerdict(meta);
  const L: string[] = [];
  L.push('════════ AI IMAGE DETECTION REPORT ════════');
  L.push(`File: ${meta.format.toUpperCase()} · ${meta.fileSize.toLocaleString()} bytes`);
  if (meta.width) L.push(`Dimensions: ${meta.width}×${meta.height}`);
  L.push('');
  L.push(`VERDICT: ${v.verdict}  [confidence: ${v.confidence}]`);
  v.reasons.forEach((r) => L.push(`  • ${r}`));
  L.push('');
  L.push('════════ METADATA ════════');
  if (Object.keys(meta.exif).length === 0 && !meta.xmp && meta.pngTexts.length === 0) {
    L.push('  (no EXIF/XMP/text metadata found)');
  } else {
    for (const [k, val] of Object.entries(meta.exif)) L.push(`  ${k}: ${val}`);
    if (meta.xmp) L.push(`  XMP: ${meta.xmp.length.toLocaleString()} chars (open Metadata Viewer for full dump)`);
    for (const t of meta.pngTexts) L.push(`  PNG text [${t.keyword}]: ${t.value.slice(0, 200)}${t.value.length > 200 ? '…' : ''}`);
  }
  L.push('');
  L.push('════════ SEGMENTS/CHUNKS ════════');
  L.push('  ' + meta.segments.map((s) => `${s.name}(${s.size}B)`).join(' · '));
  if (meta.notes.length) { L.push(''); meta.notes.forEach((n) => L.push(`  ⚠ ${n}`)); }
  return L.join('\n') + '\n';
}

/** Full metadata dump for the Metadata Viewer tool. */
export function formatMetadataDump(meta: ImageMetadata): string {
  const L: string[] = [];
  L.push('════════ IMAGE METADATA DUMP ════════');
  L.push(`Format: ${meta.format.toUpperCase()} · ${meta.fileSize.toLocaleString()} bytes`);
  if (meta.width) L.push(`Dimensions: ${meta.width}×${meta.height}`);
  L.push('');
  L.push('── EXIF ──');
  const exifEntries = Object.entries(meta.exif);
  if (exifEntries.length === 0) L.push('  (none)');
  for (const [k, val] of exifEntries) L.push(`  ${k}: ${val}`);
  L.push('');
  L.push('── XMP ──');
  if (!meta.xmp) L.push('  (none)');
  else {
    const x = meta.xmp.length > 8000 ? meta.xmp.slice(0, 8000) + '\n  …[truncated]' : meta.xmp;
    L.push(x);
  }
  L.push('');
  L.push('── PNG/WEBP TEXT CHUNKS ──');
  if (meta.pngTexts.length === 0) L.push('  (none)');
  for (const t of meta.pngTexts) L.push(`  [${t.keyword}]\n    ${t.value.slice(0, 1000)}${t.value.length > 1000 ? '…[truncated]' : ''}`);
  L.push('');
  L.push('── STRUCTURE ──');
  L.push('  ' + meta.segments.map((s) => `${s.name}(${s.size}B)`).join(' · '));
  L.push(`  C2PA/Content Credentials: ${meta.c2paFound ? 'PRESENT' : 'not found'}`);
  L.push(`  AI generator signatures: ${meta.aiSignatures.length ? meta.aiSignatures.map((s) => s.marker).join(', ') : 'none'}`);
  if (meta.notes.length) { L.push(''); meta.notes.forEach((n) => L.push(`  ⚠ ${n}`)); }
  return L.join('\n') + '\n';
}

/** Summary of everything a re-encode would strip — used by the metadata cleaner. */
export function summarizeRemoved(meta: ImageMetadata): string[] {
  const removed: string[] = [];
  const exifKeys = Object.keys(meta.exif);
  if (exifKeys.length) removed.push(`EXIF (${exifKeys.length} trường: ${exifKeys.slice(0, 6).join(', ')}${exifKeys.length > 6 ? '…' : ''})`);
  if (meta.xmp) removed.push(`XMP (${meta.xmp.length.toLocaleString()} ký tự)`);
  if (meta.pngTexts.length) removed.push(`PNG text chunks (${meta.pngTexts.length})`);
  if (meta.c2paFound) removed.push('C2PA Content Credentials container');
  const gps = exifKeys.find((k) => /gps|location/i.test(k));
  if (gps) removed.push('⚠ GPS/location data');
  return removed;
}
