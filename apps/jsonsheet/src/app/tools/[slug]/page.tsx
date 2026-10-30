import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ToolClient from '@/components/ToolClient';
import { tools, relatedTools, type ToolDef } from '@/data/tools';

export function generateStaticParams() {
  return tools.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = tools.find((t) => t.slug === slug);
  if (!tool) return {};
  return {
    title: { absolute: tool.title },
    description: tool.description,
    alternates: { canonical: `/tools/${tool.slug}/` },
    openGraph: { title: tool.title, description: tool.description },
  };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = tools.find((t) => t.slug === slug);
  if (!tool) notFound();
  const related = relatedTools(tool.slug);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: tool.title,
      url: `https://jsonsheet.com/tools/${tool.slug}/`,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (web browser)',
      description: tool.description,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: tool.faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://jsonsheet.com/' },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://jsonsheet.com/tools/' },
        { '@type': 'ListItem', position: 3, name: tool.name },
      ],
    },
  ];

  return (
    <>
      <nav className="crumbs container" aria-label="Breadcrumb">
        <a href="/">Home</a> › <a href="/tools/">Tools</a> › <span aria-current="page">{tool.name}</span>
      </nav>

      <header className="tool-head container">
        <h1>{tool.title.split('—')[0].trim()}</h1>
        <p className="lede">{tool.description}</p>
      </header>

      <div className="container">
        <ToolClient tool={tool} />
      </div>

      <section className="container prose">
        <h2>How to {tool.name.toLowerCase()}</h2>
        <ol>
          {tool.howto.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>

        <h2>FAQ</h2>
        {tool.faqs.map((f, i) => (
          <details className="faq" key={i}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}

        <h2>Related tools</h2>
      </section>

      <section className="container pad">
        <div className="grid grid-4">
          {related.map((t) => (
            <a className="card" key={t.slug} href={`/tools/${t.slug}/`}>
              <span className="tag">{t.inputLang.toUpperCase()} → {t.outputLang.toUpperCase()}</span>
              <h3>{t.name}</h3>
              <p>{t.title.split('—')[0].trim()}</p>
            </a>
          ))}
        </div>
      </section>

      {jsonLd.map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />
      ))}
    </>
  );
}
