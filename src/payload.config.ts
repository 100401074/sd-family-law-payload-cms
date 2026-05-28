import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import path from 'path';
import { buildConfig } from 'payload';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

import { Users } from './collections/Users';
import { Media } from './collections/Media';
import { Articles } from './collections/Articles';
import { PracticeAreas } from './collections/PracticeAreas';
import { Credentials } from './collections/Credentials';
import { FirmConfig } from './globals/FirmConfig';
import { Attorney } from './globals/Attorney';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      title: 'SD Family Law CMS',
      description: 'Content management for San Diego Family Law Advocates.',
    },
  },
  editor: lexicalEditor(),
  collections: [Users, Media, Articles, PracticeAreas, Credentials],
  globals: [FirmConfig, Attorney],
  secret: process.env.PAYLOAD_SECRET || 'development-secret-change-in-production',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    // Auto-sync schema with collection definitions. Set to false once you
    // start using explicit migrations (recommended for long-term production).
    push: process.env.PAYLOAD_DB_PUSH !== 'false',
  }),
  sharp,
  cors: process.env.CORS_ORIGINS?.split(',').map((s) => s.trim()) ?? '*',
  csrf: process.env.CSRF_ORIGINS?.split(',').map((s) => s.trim()) ?? [],
  plugins: [],
});
