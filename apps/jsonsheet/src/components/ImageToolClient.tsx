'use client';

import { useRef, useState } from 'react';
import { parseImageMetadata, formatImageReport, formatMetadataDump, summarizeRemoved } from '@/lib/image-tools';
import { reencodeImage } from '@/lib/image-canvas';
import type { ToolDef } from '@/data/tools';

type AnyOpts = Record<string, unknown>;

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export default function ImageToolClient({ tool }: { tool: ToolDef }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [report, setReport] = useState('');
  const [download, setDownload] = useState<{ url: string; name: string } | null>(null);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [opts, setOpts] = useState<AnyOpts>(() => Object.fromEntries(tool.options.map((o) => [o.id, o.default])));
  const inputRef = useRef<HTMLInputElement>(null);

  const isSync = tool.fn === 'aiImageDetector' || tool.fn === 'imageMetadataViewer';

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setReport('');
    setDownload(null);
    setStatus(null);
    if (isSync) {
      void f.arrayBuffer().then((buf) => {
        const meta = parseImageMetadata(new Uint8Array(buf));
        setReport(tool.fn === 'aiImageDetector' ? formatImageReport(meta) : formatMetadataDump(meta));
        setStatus({ kind: 'ok', text: `✓ ${f.name} — ${meta.format.toUpperCase()} ${meta.width ?? '?'}×${meta.height ?? '?'}` });
      });
    }
  };

  const setOpt = (id: string, value: unknown) => setOpts((prev) => ({ ...prev, [id]: value }));

  const process = async () => {
    if (!file) return;
    setBusy(true);
    setStatus(null);
    setDownload(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const meta = parseImageMetadata(bytes);
      if (tool.fn === 'imageMetadataCleaner') {
        const fmt = (opts.format as string) || 'auto';
        const type = (fmt === 'auto' ? (file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg') : fmt) as 'image/jpeg' | 'image/png' | 'image/webp';
        const res = await reencodeImage(file, { format: type, quality: 1 });
        const removed = summarizeRemoved(meta);
        const ext = EXT[type] ?? 'jpg';
        setDownload({ url: res.url, name: `clean-${file.name.replace(/\.[^.]+$/, '')}.${ext}` });
        setReport(
          [
            '════════ METADATA REMOVAL REPORT ════════',
            `Before: ${file.name} — ${file.size.toLocaleString()} bytes (${meta.format.toUpperCase()})`,
            `After:  ${res.width}×${res.height} · ${res.blob.size.toLocaleString()} bytes (${type})`,
            '',
            removed.length ? 'REMOVED (gone from the new file):' : 'No metadata found in the original file.',
            ...removed.map((r) => `  ✂ ${r}`),
            '',
            'The output was re-encoded from raw pixels — it contains no EXIF, no XMP, no GPS, no C2PA container.',
          ].join('\n') + '\n',
        );
        setStatus({ kind: 'ok', text: `✓ clean copy ready (${removed.length} metadata nhóm bị xoá)` });
      } else if (tool.fn === 'imageCompressor') {
        const fmt = (opts.format as string) || 'image/jpeg';
        const quality = Math.min(100, Math.max(1, Number(opts.quality ?? 75))) / 100;
        const maxWidth = Number(opts.maxWidth) > 0 ? Number(opts.maxWidth) : undefined;
        const res = await reencodeImage(file, { format: fmt as 'image/jpeg', quality, maxWidth });
        const saved = Math.round((1 - res.blob.size / file.size) * 100);
        const ext = EXT[fmt] ?? 'jpg';
        setDownload({ url: res.url, name: `compressed-${file.name.replace(/\.[^.]+$/, '')}.${ext}` });
        setReport(
          [
            '════════ COMPRESSION REPORT ════════',
            `Before: ${meta.format.toUpperCase()} ${meta.width ?? '?'}×${meta.height ?? '?'} · ${file.size.toLocaleString()} bytes`,
            `After:  ${res.width}×${res.height} · ${res.blob.size.toLocaleString()} bytes (${fmt})`,
            `Saved:  ${saved > 0 ? saved + '% smaller' : Math.abs(saved) + '% LARGER — try lower quality'}`,
            '',
            'Note: re-encoding also removes all metadata (EXIF/GPS/C2PA).',
          ].join('\n') + '\n',
        );
        setStatus({ kind: 'ok', text: `✓ ${saved > 0 ? `tiết kiệm ${saved}% dung lượng` : 'kết quả lớn hơn gốc — giảm quality'}` });
      }
    } catch (e) {
      setStatus({ kind: 'err', text: `✗ ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  const renderOption = (opt: ToolDef['options'][number]) => {
    if (opt.type === 'select') {
      return (
        <label className="opt" key={opt.id}>
          {opt.label}
          <select value={String(opts[opt.id])} onChange={(e) => setOpt(opt.id, e.target.value)}>
            {opt.choices.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>
      );
    }
    if (opt.type === 'number') {
      return (
        <label className="opt" key={opt.id}>
          {opt.label}
          <input type="number" value={Number(opts[opt.id])} min={opt.min} max={opt.max}
            onChange={(e) => setOpt(opt.id, e.target.value === '' ? '' : Number(e.target.value))} />
        </label>
      );
    }
    return (
      <label className="opt" key={opt.id}>
        {opt.label}
        <input type="text" value={String(opts[opt.id] ?? '')} onChange={(e) => setOpt(opt.id, e.target.value)} />
      </label>
    );
  };

  return (
    <section className="tool-app" id="tool-app">
      <div className="panes">
        <div className="pane">
          <div className="pane-head">
            <span className="lang">Input · {tool.inputLang}</span>
            <span className="count">{file ? `${(file.size / 1024).toFixed(1)} KB` : 'no file'}</span>
          </div>
          <div
            className="dropzone"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0] ?? null);
            }}
          >
            {preview ? (
              <img src={preview} alt="preview" style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 8 }} />
            ) : (
              <p className="muted" style={{ textAlign: 'center', padding: '48px 8px', margin: 0 }}>
                🖼️ Click or drop an image here<br />
                <span className="small">JPEG · PNG · WebP — the file never leaves your browser</span>
              </p>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
          <div className="options">{tool.options.map(renderOption)}</div>
          <div className="toolbar">
            {!isSync && (
              <button className="btn btn-primary btn-sm" type="button" onClick={process} disabled={!file || busy}>
                {busy ? 'Processing…' : 'Process'}
              </button>
            )}
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setFile(null); setPreview(null); setReport(''); setDownload(null); setStatus(null); }}>
              Clear
            </button>
          </div>
        </div>

        <div className="pane">
          <div className="pane-head">
            <span className="lang">Output · {tool.outputLang}</span>
          </div>
          <textarea id="js-out" className="editor" readOnly spellCheck={false}
            placeholder="Report appears here…"
            value={report} style={{ minHeight: isSync ? 320 : 200 }} />
          {download && (
            <div className="toolbar">
              <a className="btn btn-primary btn-sm" href={download.url} download={download.name}>⬇ Download result</a>
            </div>
          )}
          <p className={`status ${status ? (status.kind === 'ok' ? 'ok' : 'err') : ''}`} role="status" aria-live="polite">
            {status?.text ?? ''}
          </p>
        </div>
      </div>

      <p className="privacy-note">
        🔒 <strong>100% private:</strong> your image is analyzed and processed inside your browser — it is never
        uploaded, stored or sent anywhere.
      </p>
    </section>
  );
}
