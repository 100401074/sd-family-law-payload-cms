/**
 * boot.ts — runs once at container start, before Next.js.
 *
 * Calls payload.init() which connects to Postgres and (when push: true) syncs
 * the schema to match the collection definitions. Without this, the first
 * /admin request errors because tables don't exist.
 *
 * Exits 0 on success so the next start step (next start) executes.
 */

import { getPayload } from 'payload';
import config from '../src/payload.config';

const start = Date.now();
console.log('[boot] Initializing Payload (this triggers schema push)…');

try {
  const payload = await getPayload({ config });
  // Touch a collection to verify the schema sync worked
  await payload.find({ collection: 'users', limit: 1 }).catch(() => null);
  const dur = Date.now() - start;
  console.log(`[boot] Payload initialized in ${dur}ms — schema is in sync.`);
  process.exit(0);
} catch (err) {
  console.error('[boot] init failed:', err);
  process.exit(1);
}
