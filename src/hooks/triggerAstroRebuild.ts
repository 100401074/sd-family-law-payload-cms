import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload';

/**
 * triggerAstroRebuild — fires the Coolify deploy webhook when any content
 * change happens. Set ASTRO_REBUILD_WEBHOOK in env.
 *
 * Debounces by collection slug + 5s — multiple saves in quick succession
 * collapse to a single rebuild trigger.
 */

const pendingTimers = new Map<string, NodeJS.Timeout>();

async function fire(reason: string): Promise<void> {
  const url = process.env.ASTRO_REBUILD_WEBHOOK;
  if (!url) {
    console.warn(`[rebuild] ASTRO_REBUILD_WEBHOOK not set; skipping rebuild for ${reason}`);
    return;
  }

  try {
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      console.error(`[rebuild] webhook returned ${res.status} for ${reason}`);
    } else {
      console.log(`[rebuild] triggered for ${reason}`);
    }
  } catch (err) {
    console.error(`[rebuild] failed for ${reason}:`, err);
  }
}

function debounce(key: string, reason: string): void {
  const existing = pendingTimers.get(key);
  if (existing) clearTimeout(existing);
  pendingTimers.set(
    key,
    setTimeout(() => {
      pendingTimers.delete(key);
      fire(reason).catch((err) => console.error('[rebuild] uncaught:', err));
    }, 5000)
  );
}

type AnyHook = CollectionAfterChangeHook & CollectionAfterDeleteHook & GlobalAfterChangeHook;

export const triggerAstroRebuild: AnyHook = (...args: unknown[]) => {
  // Args shape varies between collection/global hooks; we only need the
  // collection or global slug as the debounce key.
  const arg0 = args[0] as { collection?: { slug?: string }; global?: { slug?: string }; req?: { collection?: { slug?: string }; global?: { slug?: string } } };
  const slug =
    arg0?.collection?.slug ??
    arg0?.global?.slug ??
    arg0?.req?.collection?.slug ??
    arg0?.req?.global?.slug ??
    'unknown';
  debounce(slug, slug);
  // Hook needs to return the doc for chaining
  return (arg0 as { doc?: unknown })?.doc ?? null;
};
