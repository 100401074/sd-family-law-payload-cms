import type { GlobalConfig } from 'payload';
import { triggerAstroRebuild } from '../hooks/triggerAstroRebuild';

/**
 * Attorney — singleton with the default reviewing attorney information.
 * Used by Byline + FootBlock when an article doesn't override reviewed_by.
 */
export const Attorney: GlobalConfig = {
  slug: 'attorney',
  admin: { group: 'Firm' },
  access: { read: () => true },
  hooks: { afterChange: [triggerAstroRebuild] },
  fields: [
    { name: 'name', type: 'text', required: true, defaultValue: 'Maria L. Castro' },
    { name: 'title', type: 'text', required: true, defaultValue: 'Senior Family Law Attorney' },
    { name: 'barState', type: 'text', required: true, defaultValue: 'CA', maxLength: 2 },
    { name: 'barNumber', type: 'text', required: true, defaultValue: '242042' },
    { name: 'admissionYear', type: 'text', defaultValue: '2005' },
    { name: 'stateBarProfileUrl', type: 'text', defaultValue: 'https://members.calbar.ca.gov/fal/Member/Detail/242042' },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    { name: 'bio', type: 'textarea', admin: { description: 'Used on About page and rich byline tooltips.' } },
  ],
};
