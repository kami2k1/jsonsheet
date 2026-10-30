'use client';

import { useMemo, useState } from 'react';
import {
  jsonToCsv, csvToJson, jsonToMarkdown, markdownToCsv, csvToMarkdown,
  jsonToTs, csvToSql, jsonToSql, formatJson, tsvToJson, csvDedupe, csvTranspose,
  fixAiOutput, type ConvertResult,
} from '@/lib/converters';
import {
  jsonToYaml, yamlToJson, flattenJson, jsonEscape, csvToHtml, jsonToQueryString,
  jsonToXml, jsonToJsonl, urlParamsToJson, base64Text,
} from '@/lib/extra-converters';
import type { OptionDef, ToolDef } from '@/data/tools';

type AnyOpts = Record<string, unknown>;

const FN: Record<string, (input: string, opts: AnyOpts) => ConvertResult> = {
  jsonToCsv, csvToJson, jsonToMarkdown, markdownToCsv, csvToMarkdown,
  jsonToTs, csvToSql, jsonToSql, formatJson, tsvToJson, csvDedupe, csvTranspose,
  jsonToYaml, yamlToJson, flattenJson, jsonEscape, csvToHtml, jsonToQueryString,
  jsonToXml, jsonToJsonl, urlParamsToJson, base64Text,
};

const EXT: Record<string, string> = {
  csv: 'csv', json: 'json', markdown: 'md', sql: 'sql', ts: 'ts', text: 'txt',
  yaml: 'yaml', html: 'html', xml: 'xml', jsonl: 'jsonl',
};

function normalizeOpts(raw: AnyOpts): AnyOpts {
  const out: AnyOpts = { ...raw };
  if (typeof out.delimiter === 'string') out.delimiter = (out.delimiter as string).replace('\\t', '\t');
  return out;
}

export default function ToolClient({ tool }: { tool: ToolDef }) {
  const [input, setInput] = useState('');
  const [fixAi, setFixAi] = useState(true);
  const [opts, setOpts] = useState<AnyOpts>(() =>
    Object.fromEntries(tool.options.map((o) => [o.id, o.default])),
  );
  const [status, setStatus] = useState<{ kind: 'ok' | 'err' | 'info'; text: string } | null>(null);

  const result: ConvertResult | null = useMemo(() => {
    if (!input.trim()) return null;
    const fn = FN[tool.fn];
    if (!fn) return { ok: false, output: '', error: `Unknown converter: ${tool.fn}` };
    const first = fn(input, normalizeOpts(opts));
    if (first.ok) return first;
    if (fixAi) {
      const cleaned = fixAiOutput(input);
      if (cleaned && cleaned !== input) {
        const second = fn(cleaned, normalizeOpts(opts));
        if (second.ok) return second;
      }
    }
    return first;
  }, [input, opts, fixAi, tool.fn]);

  const setOpt = (id: string, value: unknown) => setOpts((prev) => ({ ...prev, [id]: value }));

  const loadExample = () => {
    setInput(tool.example.input);
    setStatus(null);
  };

  const clearAll = () => {
    setInput('');
    setStatus(null);
  };

  const copyOut = async () => {
    if (!result?.ok) return;
    try {
      await navigator.clipboard.writeText(result.output);
    } catch {
      const ta = document.getElementById('js-out') as HTMLTextAreaElement | null;
      ta?.select();
      document.execCommand('copy');
    }
    setStatus({ kind: 'ok', text: '✓ copied to clipboard' });
  };

  const downloadOut = () => {
    if (!result?.ok) return;
    const blob = new Blob([result.output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tool.slug}.${EXT[tool.outputLang] ?? 'txt'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus({ kind: 'ok', text: '✓ downloaded' });
  };

  const renderOption = (opt: OptionDef) => {
    const value = opts[opt.id];
    if (opt.type === 'select') {
      return (
        <label className="opt" key={opt.id}>
          {opt.label}
          <select value={String(value)} onChange={(e) => setOpt(opt.id, e.target.value)}>
            {opt.choices.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>
      );
    }
    if (opt.type === 'toggle') {
      return (
        <label className="opt" key={opt.id}>
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => setOpt(opt.id, e.target.checked)} />
          {opt.label}
        </label>
      );
    }
    return (
      <label className="opt" key={opt.id}>
        {opt.label}
        <input
          type="text"
          value={String(value ?? '')}
          placeholder={opt.placeholder ?? ''}
          onChange={(e) => setOpt(opt.id, e.target.value)}
        />
      </label>
    );
  };

  return (
    <section className="tool-app" id="tool-app">
      <div className="panes">
        <div className="pane">
          <div className="pane-head">
            <span className="lang">Input · {tool.inputLang}</span>
            <span className="count">{input.length.toLocaleString()} chars</span>
          </div>
          <textarea
            id="js-in"
            className="editor"
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            placeholder={`Paste your ${tool.inputLang.toUpperCase()} here… (Ctrl/Cmd+Enter to run)`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') setStatus(null);
            }}
          />
          {tool.fixAi && (
            <div className="options">
              <label className="opt">
                <input type="checkbox" checked={fixAi} onChange={(e) => setFixAi(e.target.checked)} /> Fix pasted
                AI/ChatGPT output (strip ``` fences)
              </label>
            </div>
          )}
          <div className="options">{tool.options.map(renderOption)}</div>
          <div className="toolbar">
            <button className="btn btn-ghost btn-sm" type="button" onClick={loadExample}>Load example</button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={clearAll}>Clear</button>
          </div>
        </div>

        <div className="pane">
          <div className="pane-head">
            <span className="lang">Output · {tool.outputLang}</span>
            <span className="count">{(result?.ok ? result.output.length : 0).toLocaleString()} chars</span>
          </div>
          <textarea id="js-out" className="editor" readOnly spellCheck={false} placeholder="Result appears here…"
            value={result?.ok ? result.output : ''} />
          <div className="toolbar">
            <button className="btn btn-primary btn-sm" type="button" onClick={copyOut} disabled={!result?.ok}>Copy</button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={downloadOut} disabled={!result?.ok}>Download</button>
          </div>
          <p className={`status ${result ? (result.ok ? 'ok' : 'err') : ''}`} role="status" aria-live="polite">
            {result ? (result.ok ? `✓ ${result.stats ?? 'done'}` : `✗ ${result.error}`) : (status?.text ?? '')}
          </p>
        </div>
      </div>

      <p className="privacy-note">
        🔒 <strong>100% private:</strong> this tool runs entirely in your browser. Your data is never uploaded,
        stored or logged anywhere.
      </p>
    </section>
  );
}
