import type { CollectionConfig } from 'payload';
import { triggerAstroRebuild } from '../hooks/triggerAstroRebuild';

export const Credentials: CollectionConfig = {
  slug: 'credentials',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'order'],
    group: 'Firm',
  },
  access: { read: () => true },
  hooks: { afterChange: [triggerAstroRebuild], afterDelete: [triggerAstroRebuild] },
  fields: [
    { name: 'label', type: 'text', required: true, admin: { description: 'e.g., "California State Bar", "Super Lawyers"' } },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    { name: 'href', type: 'text', admin: { description: 'External link to credential source (optional).' } },
    { name: 'order', type: 'number', defaultValue: 100, admin: { position: 'sidebar' } },
  ],
};
