/**
 * Tool registry — single source of truth for pages, navigation and SEO.
 */

export type OptionDef =
  | { id: string; label: string; type: 'select'; choices: { value: string; label: string }[]; default: string }
  | { id: string; label: string; type: 'toggle'; default: boolean }
  | { id: string; label: string; type: 'text'; default: string; placeholder?: string };

export interface Faq {
  q: string;
  a: string;
}

export interface ToolDef {
  slug: string;
  name: string; // short card label
  title: string; // <title> + H1
  description: string; // meta description
  inputLang: 'json' | 'csv' | 'markdown' | 'tsv' | 'text' | 'yaml';
  outputLang: 'csv' | 'json' | 'markdown' | 'sql' | 'ts' | 'text' | 'yaml' | 'html' | 'xml' | 'jsonl';
  fn: string;
  fixAi: boolean; // offer "fix AI output" preprocessing
  options: OptionDef[];
  example: { input: string };
  howto: string[];
  faqs: Faq[];
}

export const tools: ToolDef[] = [
  {
    slug: 'json-to-csv',
    name: 'JSON → CSV',
    title: 'JSON to CSV Converter — Free, Instant, In-Browser',
    description:
      'Convert JSON to CSV online, free and instantly. Handles nested objects with dot-notation flattening, quoted fields and AI-pasted JSON. 100% client-side.',
    inputLang: 'json',
    outputLang: 'csv',
    fn: 'jsonToCsv',
    fixAi: true,
    options: [
      {
        id: 'delimiter',
        label: 'Delimiter',
        type: 'select',
        choices: [
          { value: ',', label: 'Comma ,' },
          { value: ';', label: 'Semicolon ;' },
          { value: '\\t', label: 'Tab' },
          { value: '|', label: 'Pipe |' },
        ],
        default: ',',
      },
      { id: 'flatten', label: 'Flatten nested objects (dot notation)', type: 'toggle', default: true },
      { id: 'includeHeader', label: 'Include header row', type: 'toggle', default: true },
    ],
    example: {
      input: `[
  { "id": 1, "name": "Ada Lovelace", "role": "engineer", "active": true },
  { "id": 2, "name": "Grace Hopper", "role": "admiral", "active": true },
  { "id": 3, "name": "Alan Turing", "role": null, "active": false }
]`,
    },
    howto: [
      'Paste your JSON (an array of objects works best) into the left box.',
      'Pick a delimiter and whether to flatten nested objects — output updates instantly.',
      'Copy the CSV or download it as a .csv file for Excel, Sheets or pandas.',
    ],
    faqs: [
      {
        q: 'Is my JSON data uploaded to a server?',
        a: 'No. The conversion runs entirely in your browser with JavaScript. Nothing is sent over the network, stored, or logged.',
      },
      {
        q: 'How are nested JSON objects converted?',
        a: 'By default nested objects are flattened using dot notation, e.g. user.address.city becomes a column named "user.address.city". Turn the option off to keep values as-is.',
      },
      {
        q: 'Can I paste JSON directly from ChatGPT or Claude?',
        a: 'Yes. Keep "Fix AI output" checked — it strips markdown code fences and stray prose around the JSON before converting.',
      },
    ],
  },
  {
    slug: 'csv-to-json',
    name: 'CSV → JSON',
    title: 'CSV to JSON Converter — Free, Instant, In-Browser',
    description:
      'Convert CSV to JSON online for free. Proper RFC 4180 parsing of quoted fields, auto number/boolean typing, any delimiter. Runs 100% in your browser.',
    inputLang: 'csv',
    outputLang: 'json',
    fn: 'csvToJson',
    fixAi: true,
    options: [
      {
        id: 'delimiter',
        label: 'Delimiter',
        type: 'select',
        choices: [
          { value: ',', label: 'Comma ,' },
          { value: ';', label: 'Semicolon ;' },
          { value: '\\t', label: 'Tab' },
          { value: '|', label: 'Pipe |' },
        ],
        default: ',',
      },
      { id: 'hasHeader', label: 'First row is header', type: 'toggle', default: true },
      { id: 'parseNumbers', label: 'Auto-detect numbers & booleans', type: 'toggle', default: true },
    ],
    example: {
      input: `id,name,role,active
1,Ada Lovelace,engineer,true
2,Grace Hopper,admiral,true
3,Alan Turing,,false`,
    },
    howto: [
      'Paste your CSV — from a file, Excel export or API response.',
      'Choose the delimiter and whether the first row is a header.',
      'Copy the JSON array or download it as a .json file.',
    ],
    faqs: [
      {
        q: 'Does it handle quoted fields with commas inside?',
        a: 'Yes. Fields quoted with double quotes may contain commas, tabs, newlines and escaped quotes ("") — all parsed correctly per RFC 4180.',
      },
      {
        q: 'Why are some values numbers and others strings?',
        a: 'With "Auto-detect" enabled, values that look like numbers or true/false become JSON numbers and booleans. Turn the option off to keep everything as strings.',
      },
      {
        q: 'What if my CSV has no header row?',
        a: 'Uncheck "First row is header" — keys become col1, col2, … matching the column order.',
      },
    ],
  },
  {
    slug: 'json-to-markdown',
    name: 'JSON → Markdown',
    title: 'JSON to Markdown Table Converter — Free & In-Browser',
    description:
      'Turn JSON arrays into clean Markdown tables online. Perfect for README files, Notion, GitHub issues and docs. Free, instant, 100% client-side.',
    inputLang: 'json',
    outputLang: 'markdown',
    fn: 'jsonToMarkdown',
    fixAi: true,
    options: [
      { id: 'flatten', label: 'Flatten nested objects (dot notation)', type: 'toggle', default: true },
      { id: 'includeHeader', label: 'Include header row', type: 'toggle', default: true },
    ],
    example: {
      input: `[
  { "feature": "Client-side", "jsonsheet": true, "tool X": false },
  { "feature": "Free unlimited", "jsonsheet": true, "tool X": false },
  { "feature": "AI-paste fix", "jsonsheet": true, "tool X": false }
]`,
    },
    howto: [
      'Paste a JSON array of objects.',
      'The Markdown table appears on the right, ready for GitHub, Notion or any Markdown editor.',
      'Copy it or download as .md.',
    ],
    faqs: [
      {
        q: 'Will the table render on GitHub?',
        a: 'Yes — output uses standard GitHub-Flavored Markdown pipe tables that render on GitHub, GitLab, Notion, Obsidian and most Markdown editors.',
      },
      {
        q: 'How are pipes inside values handled?',
        a: 'Pipe characters inside values would break the table. Replace them (e.g. with /) in your data before converting.',
      },
      {
        q: 'Can I convert a single JSON object?',
        a: 'Yes — it becomes a one-row table (key columns from the object properties).',
      },
    ],
  },
  {
    slug: 'markdown-to-csv',
    name: 'Markdown → CSV',
    title: 'Markdown Table to CSV Converter — Free & In-Browser',
    description:
      'Convert Markdown tables to CSV online. Paste a GitHub/Notion table, get clean CSV instantly. Free, no signup, runs 100% in your browser.',
    inputLang: 'markdown',
    outputLang: 'csv',
    fn: 'markdownToCsv',
    fixAi: true,
    options: [
      {
        id: 'delimiter',
        label: 'Delimiter',
        type: 'select',
        choices: [
          { value: ',', label: 'Comma ,' },
          { value: ';', label: 'Semicolon ;' },
          { value: '\\t', label: 'Tab' },
        ],
        default: ',',
      },
    ],
    example: {
      input: `| name | score |
| --- | --- |
| Ada | 99 |
| Grace | 98 |`,
    },
    howto: [
      'Paste a Markdown table (rows starting with |).',
      'The separator row (---) is detected and removed automatically.',
      'Copy or download the CSV.',
    ],
    faqs: [
      {
        q: 'Does it remove the alignment row (--- | ---)?',
        a: 'Yes, separator rows are detected by their dash/colon pattern and skipped automatically.',
      },
      {
        q: 'Can I convert several tables at once?',
        a: 'Currently one table per conversion. Split multiple tables first.',
      },
      {
        q: 'Are cell values trimmed?',
        a: 'Yes — surrounding spaces around each cell are trimmed, matching how Markdown renders.',
      },
    ],
  },
  {
    slug: 'csv-to-markdown',
    name: 'CSV → Markdown',
    title: 'CSV to Markdown Table Converter — Free & In-Browser',
    description:
      'Convert CSV data to a Markdown table online for READMEs, docs and Notion. Handles quoted CSV, any delimiter. Free and 100% client-side.',
    inputLang: 'csv',
    outputLang: 'markdown',
    fn: 'csvToMarkdown',
    fixAi: true,
    options: [
      {
        id: 'delimiter',
        label: 'Delimiter',
        type: 'select',
        choices: [
          { value: ',', label: 'Comma ,' },
          { value: ';', label: 'Semicolon ;' },
          { value: '\\t', label: 'Tab' },
        ],
        default: ',',
      },
    ],
    example: {
      input: `name,dept,start_year
Ada,engineering,1843
Grace,navy,1943`,
    },
    howto: [
      'Paste CSV data (with or without a header row).',
      'Get a GitHub-ready Markdown table instantly.',
      'Copy or download as .md.',
    ],
    faqs: [
      {
        q: 'Are empty cells supported?',
        a: 'Yes — empty cells become empty table cells in the Markdown output.',
      },
      {
        q: 'How many columns can I convert?',
        a: 'There is no hard limit; very wide tables are fine technically, but check that they remain readable where you paste them.',
      },
      {
        q: 'Is my CSV uploaded anywhere?',
        a: 'No. Parsing and rendering happen entirely in your browser.',
      },
    ],
  },
  {
    slug: 'json-to-typescript',
    name: 'JSON → TypeScript',
    title: 'JSON to TypeScript Interface Generator — Free & In-Browser',
    description:
      'Generate TypeScript interfaces & types from JSON online. Nested objects become named interfaces, arrays become typed arrays. Free, instant, client-side.',
    inputLang: 'json',
    outputLang: 'ts',
    fn: 'jsonToTs',
    fixAi: true,
    options: [{ id: 'rootName', label: 'Root type name', type: 'text', default: 'Root', placeholder: 'Root' }],
    example: {
      input: `{
  "id": 1,
  "user": { "name": "Ada", "tags": ["math", "pioneer"] },
  "score": 99.5,
  "verified": true,
  "note": null
}`,
    },
    howto: [
      'Paste a JSON sample that represents your data shape.',
      'Get a TypeScript root type plus one interface per nested object.',
      'Copy into your .ts file and adjust optional fields as needed.',
    ],
    faqs: [
      {
        q: 'How are nested objects named?',
        a: 'Interfaces are named after their key path in PascalCase (user → User). Collisions get numeric suffixes.',
      },
      {
        q: 'How are null values typed?',
        a: 'null becomes unknown in the generated type — adjust to your exact union (e.g. string | null) where needed.',
      },
      {
        q: 'Does it generate zod or class validators?',
        a: 'Not yet — output is plain TypeScript types and interfaces you can feed into any validator.',
      },
    ],
  },
  {
    slug: 'csv-to-sql',
    name: 'CSV → SQL',
    title: 'CSV to SQL INSERT Statements Generator — Free & In-Browser',
    description:
      'Convert CSV to SQL INSERT statements (PostgreSQL or MySQL) with CREATE TABLE. Type inference, safe quoting. Free, instant, 100% client-side.',
    inputLang: 'csv',
    outputLang: 'sql',
    fn: 'csvToSql',
    fixAi: true,
    options: [
      { id: 'table', label: 'Table name', type: 'text', default: 'my_table', placeholder: 'my_table' },
      {
        id: 'dialect',
        label: 'Dialect',
        type: 'select',
        choices: [
          { value: 'postgres', label: 'PostgreSQL' },
          { value: 'mysql', label: 'MySQL' },
        ],
        default: 'postgres',
      },
      { id: 'createTable', label: 'Include CREATE TABLE', type: 'toggle', default: true },
    ],
    example: {
      input: `id,name,salary,active
1,Ada Lovelace,95000,true
2,Grace Hopper,88000,true
3,Alan Turing,,false`,
    },
    howto: [
      'Paste CSV with a header row.',
      'Set the table name and SQL dialect.',
      'Copy the CREATE TABLE + INSERT statements into your migration or seed file.',
    ],
    faqs: [
      {
        q: 'How are SQL types chosen in CREATE TABLE?',
        a: 'Columns whose values are all numeric get NUMERIC; boolean columns get BOOLEAN (MySQL: TINYINT(1)); everything else TEXT.',
      },
      {
        q: 'Are quotes and special characters escaped?',
        a: 'Yes — string values are single-quote escaped ("" doubling) and identifiers are quoted per dialect.',
      },
      {
        q: 'Is it safe to paste production data?',
        a: 'Nothing leaves your browser — conversion is local. Still, avoid pasting secrets into any online tool as good practice.',
      },
    ],
  },
  {
    slug: 'json-to-sql',
    name: 'JSON → SQL',
    title: 'JSON to SQL INSERT Generator — Free & In-Browser',
    description:
      'Convert JSON arrays to SQL INSERT statements for PostgreSQL or MySQL. Optional CREATE TABLE, safe escaping, instant. Free and 100% client-side.',
    inputLang: 'json',
    outputLang: 'sql',
    fn: 'jsonToSql',
    fixAi: true,
    options: [
      { id: 'table', label: 'Table name', type: 'text', default: 'my_table', placeholder: 'my_table' },
      {
        id: 'dialect',
        label: 'Dialect',
        type: 'select',
        choices: [
          { value: 'postgres', label: 'PostgreSQL' },
          { value: 'mysql', label: 'MySQL' },
        ],
        default: 'postgres',
      },
      { id: 'createTable', label: 'Include CREATE TABLE', type: 'toggle', default: true },
    ],
    example: {
      input: `[
  { "id": 1, "name": "Ada Lovelace", "salary": 95000, "active": true },
  { "id": 2, "name": "Grace Hopper", "salary": 88000, "active": true }
]`,
    },
    howto: [
      'Paste a JSON array of objects (one object = one row).',
      'Set table name and dialect.',
      'Copy the generated SQL.',
    ],
    faqs: [
      {
        q: 'How are missing keys handled?',
        a: 'The column list is the union of all object keys; missing values insert as NULL.',
      },
      {
        q: 'Are nested objects supported?',
        a: 'Nested objects serialize to their JSON text for JSON/JSONB columns — cast after import if needed.',
      },
      {
        q: 'Which databases are supported?',
        a: 'PostgreSQL and MySQL quoting out of the box; the output is also compatible with SQLite for simple cases.',
      },
    ],
  },
  {
    slug: 'json-formatter',
    name: 'JSON Formatter',
    title: 'JSON Formatter & Validator — Free, Instant, In-Browser',
    description:
      'Format, validate and minify JSON online. Pretty-print with 2 or 4 spaces, sort keys, get exact error line on invalid JSON. Free, 100% client-side.',
    inputLang: 'json',
    outputLang: 'json',
    fn: 'formatJson',
    fixAi: true,
    options: [
      {
        id: 'mode',
        label: 'Mode',
        type: 'select',
        choices: [
          { value: 'pretty2', label: 'Pretty (2 spaces)' },
          { value: 'pretty4', label: 'Pretty (4 spaces)' },
          { value: 'minify', label: 'Minify' },
        ],
        default: 'pretty2',
      },
      { id: 'sortKeys', label: 'Sort keys alphabetically', type: 'toggle', default: false },
    ],
    example: {
      input: `{"b":2,"a":{"y":1,"x":[3,1,{"k":null}]},"c":true}`,
    },
    howto: [
      'Paste JSON — formatted output appears instantly.',
      'Invalid JSON? You get the exact line number of the error.',
      'Switch between pretty (2/4 spaces) and minified output.',
    ],
    faqs: [
      {
        q: 'Does formatting change my data?',
        a: 'Never — only whitespace and key order (if you enable sorting). Values are untouched.',
      },
      {
        q: 'How precise is the error message?',
        a: 'The parser reports the message from the JSON engine plus the computed line number of the failure point.',
      },
      {
        q: 'Can it handle large files?',
        a: 'Yes, comfortably up to several MB — limited mainly by your device memory, since everything runs locally.',
      },
    ],
  },
  {
    slug: 'tsv-to-json',
    name: 'TSV → JSON',
    title: 'TSV to JSON Converter — Free & In-Browser',
    description:
      'Convert TSV (tab-separated, e.g. from Excel or Google Sheets) to JSON online. Auto type detection, header support. Free, instant, client-side.',
    inputLang: 'tsv',
    outputLang: 'json',
    fn: 'tsvToJson',
    fixAi: true,
    options: [
      { id: 'hasHeader', label: 'First row is header', type: 'toggle', default: true },
      { id: 'parseNumbers', label: 'Auto-detect numbers & booleans', type: 'toggle', default: true },
    ],
    example: {
      input: `id\tname\tscore
1\tAda\t99
2\tGrace\t98`,
    },
    howto: [
      'Copy data from Excel/Sheets (which uses tabs) and paste it here.',
      'Toggle header and type detection as needed.',
      'Copy or download the JSON.',
    ],
    faqs: [
      {
        q: 'Why TSV instead of CSV from spreadsheets?',
        a: 'Excel and Google Sheets copy selected cells as tab-separated values — pasting directly here preserves columns without a CSV export step.',
      },
      {
        q: 'What if my values contain tabs?',
        a: 'Quoted fields may contain tabs; unquoted embedded tabs will split the cell — avoid raw tabs inside values.',
      },
      {
        q: 'Can I get an array of arrays instead of objects?',
        a: 'Uncheck "First row is header" to get arrays with col1, col2… keys per row.',
      },
    ],
  },
  {
    slug: 'csv-dedupe',
    name: 'CSV Dedupe',
    title: 'Remove Duplicate Rows from CSV Online — Free & In-Browser',
    description:
      'Remove duplicate rows from CSV/TSV data online instantly. Exact-row matching, works with any delimiter, keeps original order. Free, 100% client-side.',
    inputLang: 'csv',
    outputLang: 'csv',
    fn: 'csvDedupe',
    fixAi: false,
    options: [
      {
        id: 'delimiter',
        label: 'Delimiter',
        type: 'select',
        choices: [
          { value: ',', label: 'Comma ,' },
          { value: ';', label: 'Semicolon ;' },
          { value: '\\t', label: 'Tab' },
        ],
        default: ',',
      },
    ],
    example: {
      input: `name,city
Ada,London
Grace,New York
Ada,London
Alan,London`,
    },
    howto: [
      'Paste CSV data.',
      'Duplicate rows are removed immediately — first occurrence kept, order preserved.',
      'Copy or download the cleaned CSV.',
    ],
    faqs: [
      {
        q: 'How is a duplicate detected?',
        a: 'Rows are compared on their exact cell values (after CSV parsing), not raw text — so "a,b" and "\"a\",\"b\"" dedupe correctly.',
      },
      {
        q: 'Is the header row protected?',
        a: 'The header is just row 1 — it is kept, and it participates in dedupe only if a data row were identical to it (rare).',
      },
      {
        q: 'Can I dedupe by one column only?',
        a: 'Not yet — currently whole-row matching. Column-based dedupe is on the roadmap.',
      },
    ],
  },
  {
    slug: 'json-to-yaml',
    name: 'JSON → YAML',
    title: 'JSON to YAML Converter — Free & In-Browser',
    description:
      'Convert JSON to YAML online instantly. Clean block-style output, correct quoting of ambiguous values. Free, no signup, 100% in your browser.',
    inputLang: 'json',
    outputLang: 'yaml',
    fn: 'jsonToYaml',
    fixAi: true,
    options: [],
    example: {
      input: `{
  "service": "api",
  "replicas": 3,
  "ports": [80, 443],
  "tls": true,
  "labels": { "env": "prod" }
}`,
    },
    howto: [
      'Paste your JSON object or array.',
      'Get clean block-style YAML instantly — Kubernetes-ready formatting.',
      'Copy or download the .yaml file.',
    ],
    faqs: [
      {
        q: 'Is the output valid for Kubernetes / Docker Compose?',
        a: 'Yes — output is standard block-style YAML. Values that would be ambiguous (numbers-as-strings, special characters) are quoted correctly.',
      },
      {
        q: 'How are nulls and booleans handled?',
        a: 'null becomes null, booleans stay true/false, numbers stay unquoted numbers — types are preserved.',
      },
      {
        q: 'Does it run on my data safely?',
        a: 'Yes — conversion is 100% local in your browser; nothing is uploaded.',
      },
    ],
  },
  {
    slug: 'yaml-to-json',
    name: 'YAML → JSON',
    title: 'YAML to JSON Converter — Free & In-Browser',
    description:
      'Convert YAML to JSON online — block style, lists of maps, inline flow [a, b] and {k: v}, comments stripped. Free and 100% in-browser.',
    inputLang: 'yaml',
    outputLang: 'json',
    fn: 'yamlToJson',
    fixAi: true,
    options: [],
    example: {
      input: `service: api
replicas: 3
ports:
  - 80
  - 443
tls: true
labels: # inline comments are fine
  env: prod`,
    },
    howto: [
      'Paste your YAML (block style, lists of maps, or inline flow style).',
      'JSON appears instantly with types inferred (numbers, booleans, null).',
      'Copy or download the .json file.',
    ],
    faqs: [
      {
        q: 'Which YAML features are supported?',
        a: 'Block mappings and sequences, lists of maps, inline comments, quoted strings, flow style ([a, b], {k: v}) and anchors-free documents. Multi-document (---) files take the first document.',
      },
      {
        q: 'Are comments removed?',
        a: 'Yes — full-line and inline comments are stripped automatically.',
      },
      {
        q: 'Is my YAML sent anywhere?',
        a: 'No. Parsing happens entirely in your browser.',
      },
    ],
  },
  {
    slug: 'flatten-json',
    name: 'Flatten JSON',
    title: 'Flatten Nested JSON Online (and Unflatten) — Free',
    description:
      'Flatten nested JSON to dot-notation keys or unflatten back to nested — arrays use index paths. Free, instant, 100% in your browser.',
    inputLang: 'json',
    outputLang: 'json',
    fn: 'flattenJson',
    fixAi: true,
    options: [
      {
        id: 'mode',
        label: 'Mode',
        type: 'select',
        choices: [
          { value: 'flatten', label: 'Flatten (nested → a.b.c)' },
          { value: 'unflatten', label: 'Unflatten (a.b.c → nested)' },
        ],
        default: 'flatten',
      },
    ],
    example: {
      input: `{
  "user": { "name": "Ada", "address": { "city": "London" } },
  "tags": ["x", "y"]
}`,
    },
    howto: [
      'Paste nested JSON and press nothing — output is instant.',
      'Switch to Unflatten mode to rebuild nested structure from dot keys.',
      'Copy or download the result.',
    ],
    faqs: [
      {
        q: 'How are arrays flattened?',
        a: 'Array elements become index paths: tags.0, tags.1, … Unflatten reconstructs them as arrays only when keys are numeric — otherwise plain objects.',
      },
      {
        q: 'What about empty objects?',
        a: 'Empty objects become a key with {} value; unflatten restores them as empty objects.',
      },
      {
        q: 'Why flatten JSON at all?',
        a: 'Flattened rows feed perfectly into CSV/spreadsheets, search indexing, and analytics pipelines that expect flat records.',
      },
    ],
  },
  {
    slug: 'json-escape',
    name: 'JSON Escape',
    title: 'JSON Escape / Unescape String Online — Free & Instant',
    description:
      'Escape text for embedding in JSON strings (\\n, \\", \\\\, \\uXXXX) or unescape back to raw text. Free, instant, 100% in your browser.',
    inputLang: 'text',
    outputLang: 'text',
    fn: 'jsonEscape',
    fixAi: false,
    options: [
      {
        id: 'mode',
        label: 'Mode',
        type: 'select',
        choices: [
          { value: 'escape', label: 'Escape (text → JSON string)' },
          { value: 'unescape', label: 'Unescape (JSON string → text)' },
        ],
        default: 'escape',
      },
    ],
    example: {
      input: `He said "hi"
new line here`,
    },
    howto: [
      'Paste raw text, get the escaped JSON string (quotes included).',
      'Switch to Unescape and paste a JSON string to get raw text back.',
      'Copy the result — ready to paste into code or config.',
    ],
    faqs: [
      {
        q: 'What gets escaped?',
        a: 'Exactly what JSON requires: ", \\, control characters (\\n, \\t, \\r, …) and non-ASCII control codepoints.',
      },
      {
        q: 'Does escape include the surrounding quotes?',
        a: 'Yes — output is a complete, valid JSON string literal you can paste directly into code.',
      },
      {
        q: 'Can I unescape a bare (unquoted) string?',
        a: 'Yes — unescape mode accepts both a quoted JSON string and a bare escaped string like a\\nb.',
      },
    ],
  },
  {
    slug: 'csv-to-html',
    name: 'CSV → HTML',
    title: 'CSV to HTML Table Converter Online — Free & In-Browser',
    description:
      'Convert CSV to an HTML table online — thead/tbody, custom CSS class, fully escaped output. Free, instant, 100% in your browser.',
    inputLang: 'csv',
    outputLang: 'html',
    fn: 'csvToHtml',
    fixAi: false,
    options: [
      { id: 'hasHeader', label: 'First row is header (thead)', type: 'toggle', default: true },
      { id: 'cssClass', label: 'CSS class', type: 'text', default: '', placeholder: 'e.g. table table-striped' },
    ],
    example: {
      input: `name,role
Ada,engineer
Grace,admiral`,
    },
    howto: [
      'Paste CSV data with or without a header row.',
      'Optionally set a CSS class for styling.',
      'Copy the HTML and paste into any page or email template.',
    ],
    faqs: [
      {
        q: 'Is the output XSS-safe?',
        a: 'All cell content, including your CSS class, is HTML-escaped (& < > "), so the generated markup is safe to embed.',
      },
      {
        q: 'Does it support semicolon-separated CSV?',
        a: 'Currently comma-separated; save your sheet as standard CSV first.',
      },
      {
        q: 'Are empty cells supported?',
        a: 'Yes — they become empty <td> elements.',
      },
    ],
  },
  {
    slug: 'json-to-query-string',
    name: 'JSON → Query',
    title: 'JSON to URL Query String Converter — Free & In-Browser',
    description:
      'Convert JSON objects to URL query strings online — proper percent-encoding, arrays as repeated keys, nested objects as JSON values. 100% in-browser.',
    inputLang: 'json',
    outputLang: 'text',
    fn: 'jsonToQueryString',
    fixAi: true,
    options: [{ id: 'sortKeys', label: 'Sort keys alphabetically', type: 'toggle', default: false }],
    example: {
      input: `{
  "q": "hello world",
  "page": 2,
  "tags": ["a", "b"],
  "lang": "vi"
}`,
    },
    howto: [
      'Paste a JSON object — keys become parameters.',
      'Arrays become repeated keys (tags=a&tags=b); nested objects are JSON-encoded.',
      'Copy the query string and append it to your URL after a ?.',
    ],
    faqs: [
      {
        q: 'How are arrays encoded?',
        a: 'As repeated keys: tags=a&tags=b — the most widely supported convention (PHP, Rails, Express with qs).',
      },
      {
        q: 'How are nested objects handled?',
        a: 'They are percent-encoded as JSON text — parse with JSON.parse on the server, or switch to dot-notation via Flatten JSON first.',
      },
      {
        q: 'Is the encoding RFC 3986 compliant?',
        a: 'Yes — encodeURIComponent semantics: reserved characters are percent-encoded.',
      },
    ],
  },
  {
    slug: 'csv-transpose',
    name: 'CSV Transpose',
    title: 'Transpose CSV Online — Swap Rows and Columns — Free',
    description:
      'Transpose CSV data online — swap rows and columns instantly. Works with any delimiter and quoted fields. Free, no signup, 100% in your browser.',
    inputLang: 'csv',
    outputLang: 'csv',
    fn: 'csvTranspose',
    fixAi: false,
    options: [
      {
        id: 'delimiter',
        label: 'Delimiter',
        type: 'select',
        choices: [
          { value: ',', label: 'Comma ,' },
          { value: ';', label: 'Semicolon ;' },
          { value: '\\t', label: 'Tab' },
        ],
        default: ',',
      },
    ],
    example: {
      input: `name,Ada,Grace
city,London,New York
score,99,98`,
    },
    howto: [
      'Paste CSV data.',
      'Rows become columns and columns become rows, instantly.',
      'Copy or download the transposed CSV.',
    ],
    faqs: [
      {
        q: 'What happens with ragged rows?',
        a: 'Short rows are padded with empty cells so the transposed table stays rectangular.',
      },
      {
        q: 'Will quoting be preserved?',
        a: 'Values are preserved; quoting is re-applied only where the output requires it.',
      },
      {
        q: 'Is there a size limit?',
        a: 'No fixed limit — transposition is memory-bound on your device.',
      },
    ],
  },
  {
    slug: 'json-to-xml',
    name: 'JSON → XML',
    title: 'JSON to XML Converter Online — Free & In-Browser',
    description:
      'Convert JSON to XML online — clean indented output, invalid-key sanitizing, XML-escaped values, custom root element. Free, 100% in your browser.',
    inputLang: 'json',
    outputLang: 'xml',
    fn: 'jsonToXml',
    fixAi: true,
    options: [{ id: 'rootName', label: 'Root element', type: 'text', default: 'root', placeholder: 'root' }],
    example: {
      input: `{
  "catalog": {
    "book": [
      { "title": "Atlas Shrugged", "year": 1957 },
      { "title": "Structure & Interpretation", "year": 1985 }
    ]
  }
}`,
    },
    howto: [
      'Paste JSON — arrays become repeated <item> elements.',
      'Optionally rename the root element.',
      'Copy or download the .xml file.',
    ],
    faqs: [
      {
        q: 'How are invalid XML tag names handled?',
        a: 'Keys are sanitized (spaces/symbols → underscore, leading digit prefixed) so the output is always well-formed XML.',
      },
      {
        q: 'Are special characters escaped?',
        a: 'Yes — & < > " \' are escaped to entities automatically.',
      },
      {
        q: 'How are nulls represented?',
        a: 'As self-closing elements, e.g. <role />.',
      },
    ],
  },
  {
    slug: 'json-to-jsonl',
    name: 'JSON → JSONL',
    title: 'JSON to JSONL (JSON Lines) Converter — Free & In-Browser',
    description:
      'Convert a JSON array to JSON Lines (NDJSON) online — one compact JSON object per line, ready for LLM training data, logs and ETL pipelines. 100% in-browser.',
    inputLang: 'json',
    outputLang: 'jsonl',
    fn: 'jsonToJsonl',
    fixAi: true,
    options: [],
    example: {
      input: `[
  { "prompt": "Hi", "response": "Hello!" },
  { "prompt": "Bye", "response": "See you" }
]`,
    },
    howto: [
      'Paste a JSON array — each element becomes one compact line.',
      'Use it for fine-tuning datasets, log pipelines or streaming formats.',
      'Copy or download the .jsonl file.',
    ],
    faqs: [
      {
        q: 'What is JSONL used for?',
        a: 'JSON Lines is the standard for line-delimited records: OpenAI fine-tuning datasets, log shipping, big-data pipelines — one valid JSON value per line, easy to stream.',
      },
      {
        q: 'What if my input is a single object?',
        a: 'It becomes a single line — still valid JSONL.',
      },
      {
        q: 'Is whitespace inside objects preserved?',
        a: 'No — each record is minified to one line, which is what the format requires.',
      },
    ],
  },
  {
    slug: 'url-params-to-json',
    name: 'URL Params → JSON',
    title: 'URL Query String to JSON Converter — Free & In-Browser',
    description:
      'Convert URL query strings to JSON online — decodes percent-encoding and +, repeated keys become arrays, numbers and booleans typed. 100% in-browser.',
    inputLang: 'text',
    outputLang: 'json',
    fn: 'urlParamsToJson',
    fixAi: false,
    options: [{ id: 'parseNumbers', label: 'Auto-detect numbers & booleans', type: 'toggle', default: true }],
    example: {
      input: `?q=json+converter&page=2&tag=a&tag=b&active=true`,
    },
    howto: [
      'Paste a full URL or just the query part (?a=1&b=2).',
      'Keys become JSON fields — repeated keys become arrays.',
      'Copy or download the JSON.',
    ],
    faqs: [
      {
        q: 'Does it handle the full URL?',
        a: 'Yes — paste the whole URL and only the query part is parsed.',
      },
      {
        q: 'How are + and %20 handled?',
        a: 'Both decode to spaces, per URL conventions.',
      },
      {
        q: 'Can I keep everything as strings?',
        a: 'Turn off "Auto-detect" — useful when values like version numbers must stay textual.',
      },
    ],
  },
  {
    slug: 'base64-text',
    name: 'Base64 Text',
    title: 'Base64 Encode / Decode Text Online — Free & UTF-8 Safe',
    description:
      'Encode text to Base64 or decode Base64 to text online — full UTF-8/Unicode support, instant, 100% in your browser. No upload, no limits.',
    inputLang: 'text',
    outputLang: 'text',
    fn: 'base64Text',
    fixAi: false,
    options: [
      {
        id: 'mode',
        label: 'Mode',
        type: 'select',
        choices: [
          { value: 'encode', label: 'Encode (text → Base64)' },
          { value: 'decode', label: 'Decode (Base64 → text)' },
        ],
        default: 'encode',
      },
    ],
    example: {
      input: `Xin chào — this is a UTF-8 test 🎉`,
    },
    howto: [
      'Paste text, get Base64 instantly (full UTF-8/emoji support).',
      'Switch to Decode and paste Base64 to get text back.',
      'Copy the result.',
    ],
    faqs: [
      {
        q: 'Does it support Vietnamese and emoji?',
        a: 'Yes — encoding is proper UTF-8, not the latin1 many simple tools get wrong.',
      },
      {
        q: 'Is Base64 encryption?',
        a: 'No — it is an encoding, trivially reversible. Never use it to hide secrets.',
      },
      {
        q: 'Are line breaks in the Base64 input OK?',
        a: 'Yes — whitespace is ignored when decoding.',
      },
    ],
  },
];

export const getTool = (slug: string): ToolDef | undefined => tools.find((t) => t.slug === slug);

export const relatedTools = (slug: string, count = 4): ToolDef[] => {
  const idx = tools.findIndex((t) => t.slug === slug);
  const others = tools.filter((t) => t.slug !== slug);
  // Prefer tools adjacent in the registry, then wrap around
  const ordered = [...others.slice(Math.max(0, idx - 1)), ...others.slice(0, Math.max(0, idx - 1))];
  return ordered.slice(0, count);
};
