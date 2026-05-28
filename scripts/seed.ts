/**
 * seed.ts — populate Payload with the 6 sample articles from the Astro repo.
 *
 * Use case: after you've created the first admin user in Payload's UI, run this
 * to drop in the sample content so the live site has something to render. The
 * script is idempotent — running it twice updates instead of duplicating
 * (matched by slug).
 *
 * Usage (from the Payload repo root):
 *   PAYLOAD_API_URL=https://sdfla-cms.kallada.me \
 *   PAYLOAD_API_KEY=<your-api-key> \
 *   ASTRO_REPO_PATH=../sd-family-law-astro-template \
 *   npx tsx scripts/seed.ts
 *
 * Notes:
 *   - PAYLOAD_API_KEY is generated via Payload UI: Users → your user → Generate API Key.
 *   - The script reads markdown files from $ASTRO_REPO_PATH/src/content/articles/*.md,
 *     parses the YAML frontmatter, converts the body to a basic Lexical tree
 *     (paragraphs only — for richer formatting, edit in the Payload UI), and
 *     POSTs each to the articles collection.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PAYLOAD_API_URL = process.env.PAYLOAD_API_URL || 'http://localhost:3000';
const PAYLOAD_API_KEY = process.env.PAYLOAD_API_KEY;
const ASTRO_REPO_PATH =
  process.env.ASTRO_REPO_PATH || path.resolve(__dirname, '../../sd-family-law-astro-template');

if (!PAYLOAD_API_KEY) {
  console.error(
    'ERROR: PAYLOAD_API_KEY must be set. Generate one in Payload UI:\n' +
      '  1. Visit ' + PAYLOAD_API_URL + '/admin\n' +
      '  2. Users → your user → "Enable API Key" → save → copy the generated key\n'
  );
  process.exit(1);
}

const authHeader = `users API-Key ${PAYLOAD_API_KEY}`;

// ─── Frontmatter parser (minimal YAML, handles flat key/values + arrays) ──

function parseFrontmatter(md: string): { data: Record<string, unknown>; body: string } {
  if (!md.startsWith('---')) return { data: {}, body: md };
  const end = md.indexOf('\n---', 4);
  if (end === -1) return { data: {}, body: md };

  const fm = md.slice(4, end).trim();
  const body = md.slice(end + 4).trim();

  const data: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let currentArray: unknown[] | null = null;
  let currentObject: Record<string, unknown> | null = null;

  for (const rawLine of fm.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;

    // Top-level key: value
    const topMatch = line.match(/^(\w[\w_]*)\s*:\s*(.*)$/);
    if (topMatch && !line.startsWith(' ')) {
      const [, key, valueRaw] = topMatch;
      currentKey = key!;
      currentArray = null;
      currentObject = null;
      const value = (valueRaw ?? '').trim();
      if (value === '') {
        // multiline array or object follows
        data[key!] = null;
      } else {
        data[key!] = parseScalar(value);
      }
      continue;
    }

    // Array item: starts with "- "
    if (line.trim().startsWith('- ')) {
      const itemRaw = line.trim().slice(2).trim();
      if (currentKey === null) continue;

      if (!Array.isArray(data[currentKey])) {
        data[currentKey] = [];
        currentArray = data[currentKey] as unknown[];
      } else {
        currentArray = data[currentKey] as unknown[];
      }

      // Object item: "- key: value" — but we only support simple scalar + nested keys
      const objMatch = itemRaw.match(/^(\w[\w_]*)\s*:\s*(.*)$/);
      if (objMatch) {
        const [, subKey, subVal] = objMatch;
        currentObject = { [subKey!]: parseScalar((subVal ?? '').trim()) };
        currentArray.push(currentObject);
      } else {
        currentArray.push(parseScalar(itemRaw));
        currentObject = null;
      }
      continue;
    }

    // Nested key inside the last object item: "  key: value"
    const nestedMatch = line.match(/^\s+(\w[\w_]*)\s*:\s*(.*)$/);
    if (nestedMatch && currentObject) {
      const [, k, v] = nestedMatch;
      currentObject[k!] = parseScalar((v ?? '').trim());
      continue;
    }
  }

  return { data, body };
}

function parseScalar(raw: string): unknown {
  if (raw === '') return '';
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null') return null;
  if (/^-?\d+$/.test(raw)) return parseInt(raw, 10);
  if (/^-?\d*\.\d+$/.test(raw)) return parseFloat(raw);
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  if (raw.startsWith('[') && raw.endsWith(']')) {
    // Simple flow-style array of strings
    return raw
      .slice(1, -1)
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }
  return raw;
}

// ─── Markdown → minimal Lexical ───────────────────────────────────────────

/** Build a tiny Lexical tree from markdown — only paragraphs + headings. */
function markdownToLexical(md: string): Record<string, unknown> {
  const blocks = md.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);

  const children: Array<Record<string, unknown>> = [];
  for (const block of blocks) {
    const hMatch = block.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      const level = hMatch[1]!.length;
      const text = hMatch[2]!.trim();
      children.push({
        type: 'heading',
        tag: `h${level}`,
        version: 1,
        format: '',
        indent: 0,
        direction: 'ltr',
        children: [{ type: 'text', text, format: 0, version: 1, mode: 'normal', style: '', detail: 0 }],
      });
      continue;
    }
    // Plain paragraph
    children.push({
      type: 'paragraph',
      version: 1,
      format: '',
      indent: 0,
      direction: 'ltr',
      children: [{ type: 'text', text: block.replace(/\n/g, ' '), format: 0, version: 1, mode: 'normal', style: '', detail: 0 }],
    });
  }

  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children,
    },
  };
}

// ─── Field shape transforms (Astro frontmatter → Payload payload) ─────────

function toPayloadShape(frontmatter: Record<string, unknown>, body: string): Record<string, unknown> {
  const fm = frontmatter;
  const out: Record<string, unknown> = {
    title: fm.title,
    slug: fm.slug,
    description: fm.description,
    page_type: fm.page_type,
    status: 'published',
    order: fm.order ?? 100,
    body: markdownToLexical(body),
    reviewed_by: fm.reviewed_by,
    date_published: fm.date_published,
    date_reviewed: fm.date_reviewed,
    ai_assisted: fm.ai_assisted ?? true,
    schema_types: fm.schema_types,
    geographic_focus: fm.geographic_focus,
    jurisdiction: fm.jurisdiction,
    is_pillar: fm.is_pillar ?? false,
    statutes_cited: fm.statutes_cited,
  };

  if (fm.faq_items) out.faq_items = fm.faq_items;
  if (fm.process_steps) out.process_steps = fm.process_steps;

  // Comparison frontmatter has a nested structure; whenItFits needs the {item:} wrapper
  if (fm.comparison && typeof fm.comparison === 'object') {
    const c = fm.comparison as Record<string, Record<string, unknown>>;
    out.comparison = {
      a: {
        ...c.a,
        whenItFits: Array.isArray(c.a?.whenItFits)
          ? (c.a.whenItFits as string[]).map((item) => ({ item }))
          : undefined,
      },
      b: {
        ...c.b,
        whenItFits: Array.isArray(c.b?.whenItFits)
          ? (c.b.whenItFits as string[]).map((item) => ({ item }))
          : undefined,
      },
    };
  }

  // Speakable selectors need {selector:} wrapper
  if (Array.isArray(fm.speakable_selectors)) {
    out.speakable_selectors = (fm.speakable_selectors as string[]).map((selector) => ({ selector }));
  }

  // Drop undefined
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];

  return out;
}

// ─── Find-or-create by slug ───────────────────────────────────────────────

async function findBySlug(slug: string): Promise<{ id: string | number } | null> {
  const url = new URL('/api/articles', PAYLOAD_API_URL);
  url.searchParams.set('where[slug][equals]', slug);
  url.searchParams.set('limit', '1');
  const res = await fetch(url.toString(), { headers: { Authorization: authHeader } });
  if (!res.ok) throw new Error(`Find failed: ${res.status} ${res.statusText}`);
  const json = (await res.json()) as { docs: Array<{ id: string | number }> };
  return json.docs[0] ?? null;
}

async function upsertArticle(payload: Record<string, unknown>): Promise<void> {
  const slug = payload.slug as string;
  const existing = await findBySlug(slug);

  if (existing) {
    const res = await fetch(`${PAYLOAD_API_URL}/api/articles/${existing.id}`, {
      method: 'PATCH',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`PATCH ${slug} failed: ${res.status} ${txt.slice(0, 300)}`);
    }
    console.log(`  ↻ updated ${slug}`);
  } else {
    const res = await fetch(`${PAYLOAD_API_URL}/api/articles`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`POST ${slug} failed: ${res.status} ${txt.slice(0, 300)}`);
    }
    console.log(`  + created ${slug}`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  const articlesDir = path.join(ASTRO_REPO_PATH, 'src', 'content', 'articles');
  console.log(`Reading from ${articlesDir}`);

  const files = (await fs.readdir(articlesDir)).filter((f) => f.endsWith('.md'));
  console.log(`Found ${files.length} markdown files. Seeding to ${PAYLOAD_API_URL}…\n`);

  for (const file of files) {
    const raw = await fs.readFile(path.join(articlesDir, file), 'utf-8');
    const { data, body } = parseFrontmatter(raw);
    const payload = toPayloadShape(data, body);
    try {
      await upsertArticle(payload);
    } catch (err) {
      console.error(`  ✗ ${file}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
