# JSONSheet

**Free, private, in-browser data conversion tools** — live at [jsonsheet.com](https://jsonsheet.com)

Convert between JSON, CSV, Markdown, SQL and TypeScript without uploading anything. Every conversion runs
100% client-side: your data never leaves your browser.

## Tools (12)

| | | |
|---|---|---|
| JSON → CSV | CSV → JSON | JSON → Markdown |
| Markdown → CSV | CSV → Markdown | JSON → TypeScript |
| CSV → SQL | JSON → SQL | JSON Formatter |
| TSV → JSON | CSV Dedupe | CSV Transpose |

**Highlights**

- 🤖 **AI-ready input** — paste output straight from ChatGPT/Claude (markdown fences, stray prose) and it gets cleaned automatically
- 🔒 **Private by design** — no server-side processing, no storage, no tracking of your data
- ⚡ **Instant** — results update as you type; copy or download in one click
- Proper RFC 4180 CSV parsing (quoted fields, embedded delimiters/newlines/escaped quotes)

## Tech

- [Next.js 16](https://nextjs.org) (static export) + React 19 + TypeScript — zero UI dependencies
- Converters are pure TypeScript (`apps/jsonsheet/src/lib/`), covered by unit tests (`npm test`)
- Served as static files by nginx; SEO: per-page metadata, canonical URLs, JSON-LD (SoftwareApplication,
  FAQPage, BreadcrumbList), sitemap, robots

## Development

```bash
cd apps/jsonsheet
npm install
npm run dev     # dev server
npm test        # 34 converter unit tests
npm run build   # static export to out/
```

Deploy is a plain script (build locally, upload, atomic symlink switch) — see `deploy/deploy.sh`.
No CI/CD by design.

## License

MIT
