import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Guides — Working with JSON, CSV & AI Output | JSONSheet' },
  description:
    'Practical guides for converting data: JSON, CSV, YAML, SQL and cleaning up ChatGPT/Claude output. All free, all doable in your browser.',
  alternates: { canonical: '/guides/' },
};

const guides = [
  {
    slug: 'chatgpt-json-to-csv',
    title: 'Convert ChatGPT / Claude output to CSV, tables and SQL (the clean way)',
    description:
      'Why AI assistants wrap JSON in code fences and prose, and the fastest way to turn that output into CSV, Markdown tables, SQL or spreadsheets — without manual cleanup.',
  },
];

export default function GuidesHubPage() {
  return (
    <>
      <nav className="crumbs container" aria-label="Breadcrumb">
        <a href="/">Home</a> › <span aria-current="page">Guides</span>
      </nav>

      <header className="tool-head container">
        <h1>Guides</h1>
        <p className="lede">
          Practical, no-fluff guides for converting data between JSON, CSV, YAML, SQL — and for making AI output usable.
        </p>
      </header>

      <section className="container pad">
        <div className="grid grid-3">
          {guides.map((g) => (
            <a className="card" key={g.slug} href={`/guides/${g.slug}/`}>
              <span className="tag">GUIDE</span>
              <h3>{g.title}</h3>
              <p>{g.description}</p>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
