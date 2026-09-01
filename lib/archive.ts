export type ArticleIndexItem = {
  pageId: number;
  title: string;
  namespace: number;
  route: string;
  revisionId: number;
  revisionTimestamp: string;
};

export type ArticleRecord = ArticleIndexItem & {
  schemaVersion: number;
  sourceUrl: string;
  historyUrl: string;
  html: string;
  headings: Array<{ level: number; text: string; anchor: string }>;
  categories: string[];
  referencedMediaIds: string[];
  attribution: {
    sourcePermalink: string;
    sourceRevisionId: number;
    sourceTitle: string;
    textLicense: { label: string; url: string; version: string | null };
    transformation: string;
  };
};

export type MediaRecord = {
  schemaVersion: number;
  mediaId: string;
  title: string;
  route: string;
  mediaType: string;
  sourceUrl: string | null;
  originalUrl: string | null;
  mime: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  verdict: 'source-link-only' | 'missing-upstream' | 'external-embed' | 'copied';
  reason: string;
  attribution: Record<string, unknown>;
};

export function pageIdFromSegments(segments: string[]): number | null {
  const joined = segments.join('/');
  const match = joined.match(/-(\d+)$/);
  return match ? Number(match[1]) : null;
}

export function archiveAsset(path: string): string {
  if (typeof window === 'undefined') return `/archive/${path}`;
  const base = window.location.pathname.startsWith('/hay-day-wiki-archive/') ? '/hay-day-wiki-archive' : '';
  return `${base}/archive/${path}`;
}

export function publicRoute(route: string): string {
  if (typeof window === 'undefined') return route;
  const base = window.location.pathname.startsWith('/hay-day-wiki-archive/') ? '/hay-day-wiki-archive' : '';
  return `${base}${route}`;
}

export function currentArchiveSegments(prefix: 'wiki' | 'media'): string[] {
  if (typeof window === 'undefined') return [];
  const pathname = window.location.pathname.replace(/^\/hay-day-wiki-archive/, '');
  const value = pathname.replace(new RegExp(`^/${prefix}/?`), '').replace(/\/index\.html$/, '');
  return value.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment));
}

export function rewriteArchiveHtml(html: string): string {
  const base = typeof window !== 'undefined' && window.location.pathname.startsWith('/hay-day-wiki-archive/') ? '/hay-day-wiki-archive' : '';
  const withoutRemoteImages = html.replace(/<img\b[^>]*>/gi, (tag) => {
    const alt = tag.match(/\balt=(?:"([^"]*)"|'([^']*)')/i)?.slice(1).find(Boolean) ?? 'Referenced media';
    return `<span class="archived-media-placeholder" role="img" aria-label="${alt.replace(/[&<>"']/g, '')}">${alt.replace(/[&<>]/g, '')}</span>`;
  });
  return base ? withoutRemoteImages.replace(/href="\/(?!\/)/g, `href="${base}/`) : withoutRemoteImages;
}

export async function fetchArchiveJson<T>(path: string): Promise<T> {
  const response = await fetch(archiveAsset(path));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}
