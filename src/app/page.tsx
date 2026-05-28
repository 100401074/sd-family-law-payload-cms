import { redirect } from 'next/navigation';

/**
 * Root — redirects to the Payload admin. There's no public-facing front-end
 * here; the public site is the separate Astro project that consumes the API.
 */
export default function HomePage() {
  redirect('/admin');
}
