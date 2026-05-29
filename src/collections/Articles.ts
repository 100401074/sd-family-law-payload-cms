import type { CollectionConfig } from 'payload';
import { triggerAstroRebuild } from '../hooks/triggerAstroRebuild';

/**
 * Articles collection — the heart of the CMS. Each article maps 1:1 to an
 * Astro article at /articles/{slug}. The schema mirrors the Astro
 * content.config.ts schema exactly so the Astro loader can consume the
 * Payload REST/GraphQL output without transformation.
 *
 * Editor flow:
 *   1. Author drafts the article in Payload's Lexical rich-text editor.
 *   2. Attorney reviewer approves (changes status to "published").
 *   3. afterChange hook fires; Astro rebuild is triggered via Coolify webhook.
 *   4. Live site updates within ~30 seconds.
 */

const pageTypeOptions = [
  { label: 'Cost Article',   value: 'cost-article' },
  { label: 'Explainer',      value: 'explainer' },
  { label: 'FAQ',            value: 'faq' },
  { label: 'Comparison',     value: 'comparison' },
  { label: 'Process Guide',  value: 'process-guide' },
  { label: 'City Page',      value: 'city-page' },
  { label: 'Landing',        value: 'landing' },
  { label: 'Pillar Guide',   value: 'pillar' },
];

const schemaTypeOptions = [
  { label: 'Article (always)',           value: 'Article' },
  { label: 'FAQPage',                    value: 'FAQPage' },
  { label: 'LegalService',               value: 'LegalService' },
  { label: 'LocalBusiness',              value: 'LocalBusiness' },
  { label: 'SpeakableSpecification',     value: 'SpeakableSpecification' },
  { label: 'HowTo (process guides)',     value: 'HowTo' },
];

export const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'page_type', 'status', 'date_reviewed'],
    group: 'Content',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  hooks: {
    afterChange: [triggerAstroRebuild],
    afterDelete: [triggerAstroRebuild],
  },
  fields: [
    // ────────────────────────────────────────────────────────────────────
    // Identity & status
    // ────────────────────────────────────────────────────────────────────
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Article',
          fields: [
            { name: 'title', type: 'text', required: true },
            {
              name: 'slug',
              type: 'text',
              required: true,
              unique: true,
              index: true,
              admin: { description: 'URL slug — kebab-case, no slashes.' },
            },
            { name: 'description', type: 'textarea', required: true, admin: { description: 'Meta description (~155 chars).' } },
            {
              name: 'page_type',
              type: 'select',
              required: true,
              options: pageTypeOptions,
              admin: { description: 'Determines which Astro layout renders this article.' },
            },
            {
              name: 'status',
              type: 'select',
              defaultValue: 'draft',
              options: [
                { label: 'Draft',      value: 'draft' },
                { label: 'In Review',  value: 'review' },
                { label: 'Published',  value: 'published' },
              ],
              admin: { position: 'sidebar' },
            },
            {
              name: 'order',
              type: 'number',
              defaultValue: 100,
              admin: { description: 'Lower numbers appear first on the index page.', position: 'sidebar' },
            },

            // Body
            {
              name: 'body',
              type: 'richText',
              required: false,
              admin: { description: 'Article body. Use H2/H3 for sections. Inline statute callouts via the toolbar.' },
            },
          ],
        },

        // ────────────────────────────────────────────────────────────────
        // SEO
        // ────────────────────────────────────────────────────────────────
        {
          label: 'SEO',
          fields: [
            { name: 'og_title', type: 'text', admin: { description: 'Defaults to title if blank.' } },
            { name: 'og_description', type: 'text', admin: { description: 'Defaults to description if blank.' } },
            { name: 'og_image', type: 'upload', relationTo: 'media' },
            { name: 'featured_image', type: 'upload', relationTo: 'media' },
            {
              name: 'schema_types',
              type: 'select',
              hasMany: true,
              defaultValue: ['Article'],
              options: schemaTypeOptions,
              admin: { description: 'Which JSON-LD schemas to emit in <head>.' },
            },
            {
              name: 'speakable_selectors',
              type: 'array',
              admin: { description: 'CSS selectors for SpeakableSpecification (voice-assistant extraction).' },
              fields: [{ name: 'selector', type: 'text', required: true }],
            },
          ],
        },

        // ────────────────────────────────────────────────────────────────
        // Authorship & dates
        // ────────────────────────────────────────────────────────────────
        {
          label: 'Authorship',
          fields: [
            { name: 'reviewed_by', type: 'text', admin: { description: '"Maria L. Castro, CA Bar No. 242042"' } },
            { name: 'date_published', type: 'date' },
            { name: 'date_reviewed', type: 'date' },
            {
              name: 'ai_assisted',
              type: 'checkbox',
              defaultValue: true,
              admin: { description: 'Article was prepared with AI assistance and reviewed by the named attorney.' },
            },
            { name: 'ai_assisted_disclosure', type: 'textarea' },
          ],
        },

        // ────────────────────────────────────────────────────────────────
        // Jurisdiction
        // ────────────────────────────────────────────────────────────────
        {
          label: 'Jurisdiction',
          fields: [
            { name: 'geographic_focus', type: 'text', defaultValue: 'San Diego County, California' },
            { name: 'jurisdiction', type: 'text', defaultValue: 'CA' },
            { name: 'is_pillar', type: 'checkbox', defaultValue: false, admin: { description: 'Marks long-form pillar guides.' } },
            {
              name: 'statutes_cited',
              type: 'array',
              labels: { singular: 'Statute', plural: 'Statutes' },
              admin: { description: 'Cited statutes appear in the Sources section.' },
              fields: [
                { name: 'citation', type: 'text', required: true },
                { name: 'url', type: 'text' },
                { name: 'last_verified', type: 'date' },
              ],
            },
          ],
        },

        // ────────────────────────────────────────────────────────────────
        // FAQ structured data
        // ────────────────────────────────────────────────────────────────
        {
          label: 'FAQ',
          description: 'Used when page_type = "faq". Rendered as an accordion + FAQPage schema.',
          fields: [
            {
              name: 'faq_items',
              type: 'array',
              labels: { singular: 'Q&A', plural: 'Q&As' },
              fields: [
                { name: 'question', type: 'text', required: true },
                { name: 'answer', type: 'textarea', required: true, admin: { description: 'HTML allowed.' } },
              ],
            },
          ],
        },

        // ────────────────────────────────────────────────────────────────
        // Comparison structured data
        // ────────────────────────────────────────────────────────────────
        {
          label: 'Comparison',
          description: 'Used when page_type = "comparison". Renders the split-spread. Fields optional so non-comparison articles validate.',
          fields: [
            {
              name: 'comparison',
              type: 'group',
              fields: [
                {
                  name: 'a',
                  type: 'group',
                  label: 'Option A',
                  fields: [
                    { name: 'kicker', type: 'text' },
                    { name: 'name', type: 'text' },
                    { name: 'statuteBasis', type: 'text' },
                    { name: 'summary', type: 'textarea' },
                    {
                      name: 'whenItFits',
                      type: 'array',
                      fields: [{ name: 'item', type: 'text' }],
                    },
                  ],
                },
                {
                  name: 'b',
                  type: 'group',
                  label: 'Option B',
                  fields: [
                    { name: 'kicker', type: 'text' },
                    { name: 'name', type: 'text' },
                    { name: 'statuteBasis', type: 'text' },
                    { name: 'summary', type: 'textarea' },
                    {
                      name: 'whenItFits',
                      type: 'array',
                      fields: [{ name: 'item', type: 'text' }],
                    },
                  ],
                },
              ],
            },
          ],
        },

        // ────────────────────────────────────────────────────────────────
        // Process Steps structured data
        // ────────────────────────────────────────────────────────────────
        {
          label: 'Process Steps',
          description: 'Used when page_type = "process-guide". Renders the timeline + HowTo schema.',
          fields: [
            {
              name: 'process_steps',
              type: 'array',
              labels: { singular: 'Step', plural: 'Steps' },
              fields: [
                { name: 'title', type: 'text' },
                { name: 'body', type: 'textarea', admin: { description: 'HTML allowed.' } },
                { name: 'duration', type: 'text', admin: { description: 'e.g., "6-12 weeks"' } },
                { name: 'form', type: 'text', admin: { description: 'e.g., "FL-100"' } },
                { name: 'cost', type: 'text', admin: { description: 'e.g., "$435 (waivable)"' } },
              ],
            },
          ],
        },
      ],
    },
  ],
};
