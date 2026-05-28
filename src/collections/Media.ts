import type { CollectionConfig } from 'payload';

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true },
  admin: { useAsTitle: 'filename' },
  upload: {
    staticDir: 'media',
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card',      width: 768, height: 512, position: 'centre' },
      { name: 'feature',   width: 1280, height: 720, position: 'centre' },
      { name: 'og',        width: 1200, height: 630, position: 'centre' },
    ],
    mimeTypes: ['image/*'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      admin: { description: 'Required for accessibility. Describe the image.' },
    },
    { name: 'caption', type: 'text' },
  ],
};
