import type { CollectionConfig } from 'payload';
import { triggerAstroRebuild } from '../hooks/triggerAstroRebuild';

export const PracticeAreas: CollectionConfig = {
  slug: 'practice-areas',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'order'],
    group: 'Firm',
  },
  access: { read: () => true },
  hooks: { afterChange: [triggerAstroRebuild], afterDelete: [triggerAstroRebuild] },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'summary', type: 'textarea', required: true, admin: { description: 'One sentence shown in the practice-area card.' } },
    { name: 'icon', type: 'upload', relationTo: 'media' },
    { name: 'order', type: 'number', defaultValue: 100, admin: { position: 'sidebar' } },
    { name: 'show_on_landing', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
  ],
};
