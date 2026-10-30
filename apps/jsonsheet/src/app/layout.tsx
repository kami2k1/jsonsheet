import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export const metadata: Metadata = {
  metadataBase: new URL('https://jsonsheet.com'),
  title: {
    default: 'JSONSheet — Free JSON, CSV, Markdown & SQL Converters (In-Browser)',
    template: '%s',
  },
  description:
    'Convert JSON to CSV, CSV to JSON, Markdown tables, SQL inserts and TypeScript interfaces — free, instant, 100% in your browser. No signup, no upload.',
  openGraph: {
    type: 'website',
    siteName: 'JSONSheet',
  },
  twitter: { card: 'summary' },
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
            </Script>
          </>
        )}
        <header className="site-header">
          <div className="container header-inner">
            <a href="/" className="brand">
              JSON<span>Sheet</span>
            </a>
            <nav>
              <a href="/tools/">All tools</a>
              <a href="/#why">Why us</a>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="site-footer">
          <div className="container">
            <p>
              <strong>JSONSheet</strong> — free data conversion tools that run 100% in your browser.
            </p>
            <p className="muted small">Your data never leaves your device. No signup, no upload, no limits.</p>
            <nav>
              <a href="/tools/">All tools</a>
              <a href="https://github.com/kami2k1/jsonsheet" target="_blank" rel="noopener noreferrer">Open source</a>
              <a href="/">Home</a>
            </nav>
            <p className="muted small">© {new Date().getFullYear()} JSONSheet</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
