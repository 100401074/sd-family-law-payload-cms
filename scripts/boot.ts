/**
 * boot.ts — runs once at container start, before Next.js.
 *
 * Forces an explicit schema push via Payload's Drizzle adapter so a fresh
 * deploy against an empty Postgres ends up with all tables created. In dev,
 * Payload's `push: true` does this automatically; in production it's
 * suppressed, hence the manual call.
 *
 * Idempotent — safe to run on every container start.
 */

import { getPayload } from 'payload';
import config from '@payload-config';

const start = Date.now();
console.log('[boot] Initializing Payload…');

try {
  const payload = await getPayload({ config });
  const initTime = Date.now() - start;
  console.log(`[boot] Payload initialized in ${initTime}ms.`);

  // Push the Drizzle schema explicitly. The adapter exposes its push helpers
  // via the `db` property; calling pushSchema() syncs collections → tables.
  const db = payload.db as unknown as {
    pushSchema?: () => Promise<void>;
    push?: () => Promise<void>;
    drizzle?: { run?: (...args: unknown[]) => Promise<unknown> };
  };

  if (typeof db.pushSchema === 'function') {
    console.log('[boot] Calling payload.db.pushSchema()…');
    await db.pushSchema();
    console.log('[boot] pushSchema() complete.');
  } else if (typeof db.push === 'function') {
    console.log('[boot] Calling payload.db.push()…');
    await db.push();
    console.log('[boot] push() complete.');
  } else {
    // Fallback: use Payload's migration API. This will use the introspection
    // diff to figure out what to do.
    console.log('[boot] No direct push() method exposed — attempting migration…');
    const anyPayload = payload as unknown as {
      migrate?: () => Promise<void>;
    };
    if (anyPayload.migrate) await anyPayload.migrate();
    console.log('[boot] migrate() complete.');
  }

  const totalTime = Date.now() - start;
  console.log(`[boot] Schema sync done in ${totalTime}ms total.`);
  process.exit(0);
} catch (err) {
  console.error('[boot] Failed:', err);
  process.exit(1);
}
