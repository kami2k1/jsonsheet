import type { Metadata } from 'next';
import { tools } from '@/data/tools';

export const metadata: Metadata = {
  title: { absolute: 'All Tools — JSON, CSV, Markdown, SQL & TypeScript Converters | JSONSheet' },
  description:
    'Browse every free JSONSheet tool: JSON↔CSV, Markdown tables, SQL inserts, TypeScript interfaces, JSON formatter, TSV converter and CSV utilities. 100% in-browser.',
  alternates: { canonical: '/tools/' },
};

export default function ToolsHubPage() {
  return (
    <>
      <nav className="crumbs container" aria-label="Breadcrumb">
        <a href="/">Home</a> › <span aria-current="page">Tools</span>
      </nav>

      <header className="tool-head container">
        <h1>All tools</h1>
        <p className="lede">
          {tools.length} free converters that run entirely in your browser — no upload, no signup, no limits.
        </p>
      </header>

      <section className="container pad">
        <div className="grid grid-3">
          {tools.map((t) => (
            <a className="card" key={t.slug} href={`/tools/${t.slug}/`}>
              <span className="tag">{t.inputLang.toUpperCase()} → {t.outputLang.toUpperCase()}</span>
              <h3>{t.name}</h3>
              <p>{t.description}</p>
            </a>
          ))}
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'All JSONSheet tools',
            url: 'https://jsonsheet.com/tools/',
            description: 'Every free in-browser data conversion tool on JSONSheet.',
          }),
        }}
      />
    </>
  );
}
