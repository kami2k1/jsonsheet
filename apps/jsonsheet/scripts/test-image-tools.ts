/**
 * Tests for image metadata parser + AI detector — run with: npm test
 * Uses synthetic JPEG/PNG buffers (no real files needed).
 */
import { parseImageMetadata, buildImageVerdict, formatImageReport } from '../src/lib/image-tools';

let pass = 0;
let failCount = 0;
function check(name: string, cond: boolean, extra = ''): void {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { failCount++; console.error(`  ✗ ${name} ${extra}`); }
}

// ---------- builders ----------
function buildExifTiff(tags: { tag: number; text: string }[]): Uint8Array {
  const enc = (s: string) => Array.from(s, (c) => c.charCodeAt(0) & 0xff);
  const header = [...enc('II'), 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00]; // II, 42, IFD0@8, next=0
  const ifdSize = 2 + tags.length * 12 + 4;
  let dataOff = 8 + ifdSize;
  const data: number[] = [];
  const ifd: number[] = [tags.length & 0xff, (tags.length >> 8) & 0xff]; // count is 2 bytes!
  for (const t of tags) {
    const bytes = [...enc(t.text), 0x00];
    const entry = [t.tag & 0xff, (t.tag >> 8) & 0xff, 0x02, 0x00, // type ASCII
      bytes.length & 0xff, (bytes.length >> 8) & 0xff, 0x00, 0x00, // count
      dataOff & 0xff, (dataOff >> 8) & 0xff, 0x00, 0x00];
    ifd.push(...entry);
    data.push(...bytes);
    dataOff += bytes.length;
  }
  ifd.push(0, 0, 0, 0); // next IFD = 0
  return new Uint8Array([...header, ...ifd, ...data]);
}

function buildJpeg(opts: { width: number; height: number; exifTags?: { tag: number; text: string }[]; xmp?: string; jumbf?: boolean }): Uint8Array {
  const out: number[] = [0xff, 0xd8];
  if (opts.exifTags) {
    const tiff = buildExifTiff(opts.exifTags);
    const payload = [...Array.from('Exif\u0000\u0000', (c) => c.charCodeAt(0)), ...tiff];
    const len = payload.length + 2;
    out.push(0xff, 0xe1, (len >> 8) & 0xff, len & 0xff, ...payload);
  }
  if (opts.xmp) {
    const sig = [...Array.from('http://ns.adobe.com/xap/1.0/\u0000', (c) => c.charCodeAt(0))];
    const payload = [...sig, ...Array.from(opts.xmp, (c) => c.charCodeAt(0) & 0xff)];
    const len = payload.length + 2;
    out.push(0xff, 0xe1, (len >> 8) & 0xff, len & 0xff, ...payload);
  }
  if (opts.jumbf) {
    const payload = [...Array.from('JUMBF\u0000\u0000\u0000\u0000c2pa', (c) => c.charCodeAt(0))];
    const len = payload.length + 2;
    out.push(0xff, 0xeb, (len >> 8) & 0xff, len & 0xff, ...payload);
  }
  // SOF0: precision(1) + height(2) + width(2) + Nf(1) + components(Nf×3)
  const sof = [0x08, (opts.height >> 8) & 0xff, opts.height & 0xff, (opts.width >> 8) & 0xff, opts.width & 0xff, 0x01, 0x01, 0x00, 0x11];
  out.push(0xff, 0xc0, (sof.length + 2) >> 8 & 0xff, (sof.length + 2) & 0xff, ...sof);
  out.push(0xff, 0xd9);
  return new Uint8Array(out);
}

function buildPng(opts: { width: number; height: number; texts?: { keyword: string; value: string }[] }): Uint8Array {
  const out: number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const chunk = (type: string, data: number[]) => {
    const len = data.length;
    const t = Array.from(type, (c) => c.charCodeAt(0));
    out.push((len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff, ...t, ...data, 0, 0, 0, 0); // dummy CRC
  };
  chunk('IHDR', [(opts.width >> 24) & 0xff, (opts.width >> 16) & 0xff, (opts.width >> 8) & 0xff, opts.width & 0xff,
    (opts.height >> 24) & 0xff, (opts.height >> 16) & 0xff, (opts.height >> 8) & 0xff, opts.height & 0xff,
    0x08, 0x06, 0x00, 0x00, 0x00]);
  for (const t of opts.texts ?? []) {
    chunk('tEXt', [...Array.from(t.keyword, (c) => c.charCodeAt(0)), 0x00, ...Array.from(t.value, (c) => c.charCodeAt(0) & 0xff)]);
  }
  chunk('IEND', []);
  return new Uint8Array(out);
}

const str2u8 = (s: string) => new Uint8Array(Array.from(s, (c) => c.charCodeAt(0) & 0xff));

console.log('— JPEG camera photo —');
{
  const jpg = buildJpeg({ width: 4000, height: 3000, exifTags: [
    { tag: 0x010f, text: 'Canon' }, { tag: 0x0110, text: 'EOS R5' }, { tag: 0x0131, text: 'Lightroom' },
  ] });
  const m = parseImageMetadata(jpg);
  check('format jpeg', m.format === 'jpeg');
  check('dimensions', m.width === 4000 && m.height === 3000);
  check('exif Make parsed', m.exif['Camera Make'] === 'Canon');
  check('exif Model parsed', m.exif['Camera Model'] === 'EOS R5');
  check('hasExif', m.hasExif);
  const v = buildImageVerdict(m);
  check('verdict: likely camera', v.verdict.includes('CAMERA') && v.confidence === 'medium');
  check('report contains VERDICT', formatImageReport(m).includes('VERDICT'));
}

console.log('— JPEG AI (Midjourney XMP + C2PA) —');
{
  const jpg = buildJpeg({ width: 1024, height: 1024, xmp: '<x:xmpmeta><rdf:RDF>midjourney prompt "a cat"</rdf:RDF></x:xmpmeta>', jumbf: true });
  const m = parseImageMetadata(jpg);
  check('xmp captured', m.hasXmp && m.xmp!.includes('midjourney'));
  check('c2pa found', m.c2paFound);
  check('AI signature Midjourney', m.aiSignatures.some((s) => s.marker === 'Midjourney'));
  const v = buildImageVerdict(m);
  check('verdict: AI-GENERATED high', v.verdict.startsWith('AI-GENERATED') && v.confidence === 'high');
  check('reasons cite evidence', v.reasons.some((r) => r.includes('XMP')));
}

console.log('— PNG Stable Diffusion —');
{
  const png = buildPng({ width: 1024, height: 1024, texts: [{ keyword: 'parameters', value: 'Stable Diffusion XL, steps 30' }] });
  const m = parseImageMetadata(png);
  check('format png', m.format === 'png');
  check('png text captured', m.pngTexts[0].keyword === 'parameters');
  check('AI signature Stable Diffusion', m.aiSignatures.some((s) => s.marker === 'Stable Diffusion'));
  check('verdict AI-GENERATED', buildImageVerdict(m).verdict.startsWith('AI-GENERATED'));
}

console.log('— PNG clean, AI-typical dimensions —');
{
  const png = buildPng({ width: 1024, height: 1024 });
  const m = parseImageMetadata(png);
  check('no ai signatures', m.aiSignatures.length === 0);
  const v = buildImageVerdict(m);
  check('inconclusive + dimension note', v.verdict.startsWith('INCONCLUSIVE') && v.reasons.some((r) => r.includes('1024×1024')));
}

console.log('— Edge cases —');
{
  const bad = parseImageMetadata(str2u8('this is not an image at all, just text'));
  check('unknown format graceful', bad.format === 'unknown' && bad.notes.length > 0);
  const truncated = parseImageMetadata(str2u8('\xff\xd8\xff\xe1\x00\x04Ex'));
  check('truncated jpeg no crash', truncated.format === 'jpeg');
  const png = buildPng({ width: 1920, height: 1080, texts: [{ keyword: 'Comment', value: 'Screenshot from GIMP 2.10' }] });
  const m = parseImageMetadata(png);
  check('non-AI png text no false positive', m.aiSignatures.length === 0);
}

console.log(`\n${pass} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
