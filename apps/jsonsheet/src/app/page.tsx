import type { Metadata } from 'next';
import { tools } from '@/data/tools';

export const metadata: Metadata = {
  title: { absolute: 'JSONSheet — Free JSON, CSV, Markdown & SQL Converters (In-Browser)' },
  description:
    'Convert JSON to CSV, CSV to JSON, Markdown tables, SQL inserts and TypeScript interfaces — free, instant, 100% in your browser. No signup, no upload.',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <>
      <section className="hero container">
        <span className="badge">100% IN-BROWSER · NO UPLOAD · FREE</span>
        <h1>
          Convert data between <span className="grad">JSON, CSV, Markdown, SQL &amp; TypeScript</span> — instantly
        </h1>
        <p>
          Paste messy output straight from ChatGPT or Claude — JSONSheet fixes and converts it in one step.
          Everything runs locally in your browser: your data never leaves your device.
        </p>
        <a className="btn btn-primary" href="/tools/">Browse all {tools.length} tools</a>
      </section>

      <section className="container pad" id="tools">
        <h2 className="sec">All tools</h2>
        <div className="grid grid-4">
          {tools.map((t) => (
            <a className="card" key={t.slug} href={`/tools/${t.slug}/`}>
              <span className="tag">{t.inputLang.toUpperCase()} → {t.outputLang.toUpperCase()}</span>
              <h3>{t.name}</h3>
              <p>{t.title.split('—')[0].trim()}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="container pad" id="why">
        <h2 className="sec">Why JSONSheet</h2>
        <div className="grid grid-3">
          <div className="card">
            <h3>🔒 Private by design</h3>
            <p>
              Every conversion runs in your browser with plain JavaScript. Nothing is uploaded, stored or logged —
              safe for customer data, internal exports and everything sensitive.
            </p>
          </div>
          <div className="card">
            <h3>🤖 AI-ready input</h3>
            <p>
              Paste JSON wrapped in markdown fences or preceded by prose from ChatGPT / Claude — the tool cleans it
              automatically before converting.
            </p>
          </div>
          <div className="card">
            <h3>⚡ Instant &amp; unlimited</h3>
            <p>No signup, no queues, no file-size games. Results update as you type, with copy and one-click download.</p>
          </div>
        </div>
      </section>

      <section className="container pad" id="learn">
        <h2 className="sec">Learn</h2>
        <div className="grid grid-3">
          <a className="card" href="/guides/chatgpt-json-to-csv/">
            <span className="tag">GUIDE</span>
            <h3>AI output → CSV, the clean way</h3>
            <p>Turn ChatGPT / Claude answers into spreadsheets without manual cleanup.</p>
          </a>
          <a className="card" href="/guides/">
            <span className="tag">HUB</span>
            <h3>All guides</h3>
            <p>Practical data-conversion walkthroughs, updated regularly.</p>
          </a>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'JSONSheet',
            url: 'https://jsonsheet.com/',
            description: 'Free online tools to convert JSON, CSV, Markdown, SQL and TypeScript — fast, private, 100% in your browser.',
          }),
        }}
      />
    </>
  );
}
