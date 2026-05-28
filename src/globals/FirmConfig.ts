import type { GlobalConfig } from 'payload';
import { triggerAstroRebuild } from '../hooks/triggerAstroRebuild';

/**
 * FirmConfig — singleton holding all firm-level values that the Astro site
 * consumes. Edits here trigger a full Astro rebuild via afterChange hook.
 *
 * Maps 1:1 to the Astro template's firm.config.json.
 */
export const FirmConfig: GlobalConfig = {
  slug: 'firm-config',
  admin: { group: 'Firm' },
  access: { read: () => true },
  hooks: { afterChange: [triggerAstroRebuild] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Identity',
          fields: [
            { name: 'name', type: 'text', required: true, defaultValue: 'San Diego Family Law Advocates' },
            { name: 'shortName', type: 'text', required: true, defaultValue: 'SDFLA' },
            { name: 'tagline', type: 'textarea', required: true, defaultValue: 'Counsel without judgment. Family law guidance for the moments that matter most.' },
            { name: 'logo', type: 'upload', relationTo: 'media' },
            { name: 'url', type: 'text', defaultValue: 'https://sdfamilylawadvocates.com' },
          ],
        },
        {
          label: 'Contact',
          fields: [
            { name: 'phone', type: 'text', required: true, defaultValue: '858-888-8000', admin: { description: 'Machine-format for tel: links.' } },
            { name: 'phoneDisplay', type: 'text', required: true, defaultValue: '(858) 888-8000', admin: { description: 'Human-readable for display.' } },
            { name: 'hours', type: 'text', required: true, defaultValue: '7 days a week' },
            { name: 'consultationOffer', type: 'text', required: true, defaultValue: 'free, confidential consultation' },
            { name: 'intakeUrl', type: 'text', required: true, defaultValue: 'https://sdfamilylawadvocates.com/contact' },
          ],
        },
        {
          label: 'Address',
          fields: [
            {
              name: 'address',
              type: 'group',
              fields: [
                { name: 'street', type: 'text', defaultValue: '401 W A St, Suite 200' },
                { name: 'city', type: 'text', defaultValue: 'San Diego' },
                { name: 'state', type: 'text', defaultValue: 'CA' },
                { name: 'postalCode', type: 'text', defaultValue: '92101' },
              ],
            },
            { name: 'geoLat', type: 'number', defaultValue: 32.7157 },
            { name: 'geoLng', type: 'number', defaultValue: -117.1611 },
            {
              name: 'primaryAreasServed',
              type: 'array',
              fields: [{ name: 'name', type: 'text', required: true }],
              defaultValue: [
                { name: 'San Diego' },
                { name: 'Chula Vista' },
                { name: 'El Cajon' },
                { name: 'Escondido' },
                { name: 'Oceanside' },
                { name: 'Carlsbad' },
                { name: 'La Mesa' },
              ],
            },
          ],
        },
        {
          label: 'Navigation',
          fields: [
            {
              name: 'primary',
              type: 'array',
              labels: { singular: 'Nav item', plural: 'Nav items' },
              fields: [
                { name: 'label', type: 'text', required: true },
                { name: 'href', type: 'text', required: true },
              ],
              defaultValue: [
                { label: 'Practice Areas', href: '/practice-areas' },
                { label: 'Guides', href: '/guides' },
                { label: 'Calculators', href: '/calculators' },
                { label: 'About', href: '/about' },
                { label: 'Contact', href: '/contact' },
              ],
            },
          ],
        },
      ],
    },
  ],
};
