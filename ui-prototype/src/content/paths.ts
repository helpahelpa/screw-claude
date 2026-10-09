/* Mount-point helpers.
 *
 * The app is served from the domain root in development and from a project
 * subdirectory on GitHub Pages (`/screw-claude/`). Every runtime URL is derived
 * from the page's own location, so one build works at either mount point; the
 * configured base is only used for absolute metadata such as canonical links.
 */

const LOCALE_SEGMENTS = new Set(['zh', 'ru']);
const FILE_SEGMENT = /\.[a-z0-9]+$/i;

/** Normalize a mount point to `/` or `/segment/`. */
export function normalizeBase(base: string | undefined | null): string {
  const trimmed = (base ?? '').trim();
  if (!trimmed || trimmed === '/') return '/';
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}/`;
}

/**
 * Mount point of the running page, derived from its pathname. The locale
 * segment marks the app root, so `/zh/`, `/ru/page.html` and
 * `/screw-claude/zh/` all resolve to the directory the app is mounted at.
 */
export function basePathFrom(pathname: string): string {
  const segments = (pathname || '/').split('/').filter(Boolean);
  // Ignore a trailing file name; `/index.html` is the directory index.
  const last = segments.at(-1);
  if (last && FILE_SEGMENT.test(last)) segments.pop();
  const localeIndex = segments.findIndex(segment => LOCALE_SEGMENTS.has(segment));
  const mount = localeIndex >= 0 ? segments.slice(0, localeIndex) : segments;
  return normalizeBase(mount.join('/'));
}
