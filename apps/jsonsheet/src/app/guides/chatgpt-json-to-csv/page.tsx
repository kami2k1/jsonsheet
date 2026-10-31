import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Convert ChatGPT / Claude Output to CSV & Tables (the Clean Way) | JSONSheet' },
  description:
    'AI assistants wrap JSON in code fences and prose. Here is the fastest way to turn ChatGPT or Claude output into CSV, Markdown tables, SQL or spreadsheets — without manual cleanup.',
  alternates: { canonical: '/guides/chatgpt-json-to-csv/' },
};

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Convert ChatGPT / Claude output to CSV, tables and SQL (the clean way)',
    author: { '@type': 'Organization', name: 'JSONSheet' },
    publisher: { '@type': 'Organization', name: 'JSONSheet' },
    datePublished: '2026-10-31',
    description:
      'The fastest way to turn AI assistant output into CSV, Markdown tables or SQL — without manual cleanup.',
  },
];

export default function ChatGptJsonToCsvGuide() {
  return (
    <>
      <nav className="crumbs container" aria-label="Breadcrumb">
        <a href="/">Home</a> › <a href="/guides/">Guides</a> › <span aria-current="page">AI output to CSV</span>
      </nav>

      <header className="tool-head container">
        <h1>Convert ChatGPT / Claude output to CSV &amp; tables (the clean way)</h1>
        <p className="lede">
          You asked an AI for data. It answered politely — with a sentence, a code fence, and some JSON inside.
          Here is how to turn that into a spreadsheet-ready file in one step.
        </p>
      </header>

      <article className="container prose">
        <h2>Why AI output is &quot;almost JSON&quot;</h2>
        <p>
          When ChatGPT or Claude gives you structured data, it usually looks like this:
        </p>
        <p>
          <code>```json<br />
          [&#123; &quot;name&quot;: &quot;Ada&quot;, &quot;role&quot;: &quot;engineer&quot; &#125;]<br />
          ```</code>
        </p>
        <p>
          Three things get in your way: the <strong>markdown fences</strong> (```json), sometimes a friendly
          <strong> intro sentence</strong> (&quot;Here is the data you asked for:&quot;), and occasionally a trailing
          remark. Paste that into a strict converter and it fails — so most people start hand-deleting lines.
        </p>

        <h2>The one-step method</h2>
        <ol>
          <li>
            Copy the AI&apos;s entire answer — fences, prose and all.
          </li>
          <li>
            Open the <a href="/tools/json-to-csv/">JSON to CSV converter</a>. The <strong>“Fix pasted AI output”</strong>{' '}
            option (on by default) strips fences and stray prose automatically, then converts.
          </li>
          <li>
            Copy the CSV or download it — it opens cleanly in Excel, Google Sheets, pandas or R.
          </li>
        </ol>
        <p>
          The same trick works across the whole toolkit: <a href="/tools/json-to-markdown/">JSON → Markdown table</a> for
          READMEs and Notion, <a href="/tools/json-to-sql/">JSON → SQL</a> for seeding a database,{' '}
          <a href="/tools/csv-to-html/">CSV → HTML table</a> for email templates and pages.
        </p>

        <h2>Going the other way: table → AI-ready JSON</h2>
        <p>
          Sometimes you have the spreadsheet and want JSON for an API call. Copy the cells straight out of Excel or
          Google Sheets and paste into <a href="/tools/tsv-to-json/">TSV → JSON</a> — spreadsheets copy as tab-separated
          values, so there is no export step. If you already have a CSV file, use{' '}
          <a href="/tools/csv-to-json/">CSV → JSON</a> instead.
        </p>

        <h2>Common gotchas</h2>
        <ul>
          <li>
            <strong>Single objects vs arrays.</strong> If the AI returned one object but you expected a list, wrap it in
            <code>[ ]</code> — or just paste it: the converter handles both.
          </li>
          <li>
            <strong>Numbers as strings.</strong> AI output like <code>&quot;price&quot;: &quot;9.99&quot;</code> keeps
            prices as text. For SQL, the generators infer column types from the data — check the CREATE TABLE before
            running it.
          </li>
          <li>
            <strong>Huge tables.</strong> For big results, ask the AI for compact JSON (no pretty printing), then format
            here with <a href="/tools/json-formatter/">JSON Formatter</a>.
          </li>
          <li>
            <strong>Secrets.</strong> Everything on JSONSheet runs in your browser — but as a rule, strip credentials
            from any data before pasting it anywhere.
          </li>
        </ul>

        <h2>TL;DR</h2>
        <p>
          Paste the whole AI answer into <a href="/tools/json-to-csv/">JSON → CSV</a>, keep &quot;Fix AI output&quot;
          checked, download. Ten seconds, zero manual cleanup — and your data never left your machine.
        </p>

        <h2>Related tools</h2>
      </article>

      <section className="container pad">
        <div className="grid grid-4">
          <a className="card" href="/tools/json-to-csv/"><span className="tag">JSON → CSV</span><h3>JSON to CSV</h3><p>Spreadsheet-ready CSV from any JSON array.</p></a>
          <a className="card" href="/tools/json-to-markdown/"><span className="tag">JSON → MD</span><h3>JSON to Markdown</h3><p>GitHub-ready tables for READMEs and docs.</p></a>
          <a className="card" href="/tools/json-to-sql/"><span className="tag">JSON → SQL</span><h3>JSON to SQL</h3><p>INSERT statements with CREATE TABLE.</p></a>
          <a className="card" href="/tools/tsv-to-json/"><span className="tag">TSV → JSON</span><h3>TSV to JSON</h3><p>Paste straight from Excel or Sheets.</p></a>
          <a className="card" href="/tools/json-to-yaml/"><span className="tag">JSON → YAML</span><h3>JSON to YAML</h3><p>Config-file friendly output, quotes done right.</p></a>
          <a className="card" href="/tools/base64-text/"><span className="tag">BASE64</span><h3>Base64 Encode/Decode</h3><p>UTF-8 safe text encoding in one click.</p></a>
        </div>
      </section>

      {jsonLd.map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />
      ))}
    </>
  );
}
