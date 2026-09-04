export type ArticleIndexItem = {
  pageId: number;
  title: string;
  namespace: number;
  route: string;
  revisionId: number;
  revisionTimestamp: string;
  redirectTarget?: string | null;
  categories?: string[];
  categoryMembers?: CategoryMember[] | { members?: CategoryMember[] } | null;
};

export type CategoryMember = {
  pageId?: number;
  title: string;
  route?: string | null;
  namespace?: number;
  revisionId?: number;
  type?: string;
  scope?: string;
};

export type CategoryIndex = {
  schemaVersion: number;
  source?: string;
  fetchedAt?: string;
  categories: Record<string, CategoryMember[]>;
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
  redirectTarget?: string | null;
  categoryMembers?: CategoryMember[] | { members?: CategoryMember[] } | null;
  internalLinks?: Array<{ title: string; route: string | null }>;
  externalVideos?: Array<{
    provider: string;
    url: string;
    consentRequired: boolean;
    embedMode: string;
  }>;
};

export type MediaRecord = {
  schemaVersion: number;
  mediaId: string;
  title: string;
  route: string;
  mediaType: string;
  descriptionUrl: string;
  sourceUrl: string | null;
  originalUrl: string | null;
  mime: string | null;
  size?: number | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  verdict:
    | 'source-link-only'
    | 'missing-upstream'
    | 'external-embed'
    | 'copied';
  reason?: string;
  transformation?: string;
  consentRequired?: boolean;
  attribution: Record<string, unknown>;
};

export function pageIdFromSegments(segments: string[]): number | null {
  const joined = segments.join('/');
  const match = joined.match(/-(\d+)$/);
  return match ? Number(match[1]) : null;
}

export function categoryRoute(
  item: Pick<ArticleIndexItem, 'title' | 'pageId'>,
): string {
  const title = item.title.replace(/^Category:/i, '').trim();
  return `/category/${encodeURIComponent(title)}-${item.pageId}`;
}

export function archiveAsset(path: string): string {
  if (typeof window === 'undefined') return `/archive/${path}`;
  const base = window.location.pathname.startsWith('/hay-day-wiki-archive/')
    ? '/hay-day-wiki-archive'
    : '';
  return `${base}/archive/${path}`;
}

export function publicRoute(route: string): string {
  if (typeof window === 'undefined') return route;
  const base = window.location.pathname.startsWith('/hay-day-wiki-archive/')
    ? '/hay-day-wiki-archive'
    : '';
  return `${base}${publishedRoute(route)}`;
}

export function publishedRoute(route: string): string {
  return route.replaceAll('%', '~');
}

export function currentArchiveSegments(
  prefix: 'wiki' | 'media' | 'category',
): string[] {
  if (typeof window === 'undefined') return [];
  const pathname = window.location.pathname.replace(
    /^\/hay-day-wiki-archive/,
    '',
  );
  const value = pathname
    .replace(new RegExp(`^/${prefix}/?`), '')
    .replace(/\/index\.html$/, '');
  const segments = value.split('/').filter(Boolean);
  try {
    return segments.map((segment) => decodeURIComponent(segment));
  } catch {
    return [];
  }
}

function normalizedTitle(value: string): string {
  return String(value).replaceAll('_', ' ').trim().toLocaleLowerCase();
}

function normalizedCategoryTitle(value: string): string {
  return normalizedTitle(value)
    .replace(/^category:/, '')
    .trim();
}

function redirectTitle(value: string): string {
  const raw = String(value).trim();
  try {
    const decoded = decodeURIComponent(raw);
    const wiki = decoded.match(/\/wiki\/(.+)$/i);
    return (wiki ? wiki[1] : decoded).replaceAll('_', ' ').replace(/^\/+/, '');
  } catch {
    return raw.replaceAll('_', ' ').replace(/^\/+/, '');
  }
}

function redirectIdentity(record: ArticleRecord): string {
  return Number.isInteger(record.pageId)
    ? `page:${record.pageId}`
    : `title:${record.title}`;
}

export type RedirectResolution = {
  record: ArticleRecord | null;
  chain: string[];
  status: 'direct' | 'resolved' | 'missing-target' | 'loop';
};

/** Resolve only against the frozen local index, with a bounded cycle detector. */
export function resolveRedirect(
  record: ArticleRecord,
  records: ArticleRecord[],
): RedirectResolution {
  const byTitle = new Map<string, ArticleRecord>();
  for (const item of records) {
    const key = normalizedTitle(item.title);
    const existing = byTitle.get(key);
    // Prefer a canonical record when malformed or future snapshots contain a
    // duplicate title alongside its redirect record.
    if (!existing || (existing.redirectTarget && !item.redirectTarget))
      byTitle.set(key, item);
  }
  const chain = [record.title];
  const seen = new Set([redirectIdentity(record)]);
  let current = record;
  while (current.redirectTarget) {
    const targetTitle = redirectTitle(current.redirectTarget);
    const key = normalizedTitle(targetTitle);
    const next = byTitle.get(key);
    if (!next)
      return {
        record: null,
        chain: [...chain, targetTitle],
        status: 'missing-target',
      };
    const identity = redirectIdentity(next);
    if (seen.has(identity))
      return { record: null, chain: [...chain, targetTitle], status: 'loop' };
    seen.add(identity);
    chain.push(next.title);
    current = next;
    if (chain.length > 32) return { record: null, chain, status: 'loop' };
  }
  return {
    record: current,
    chain,
    status: chain.length > 1 ? 'resolved' : 'direct',
  };
}

export function categoryMembersFor(
  category: ArticleRecord,
  records: ArticleRecord[],
): { members: CategoryMember[]; source: 'explicit' | 'derived' | 'none' } {
  const explicit = Array.isArray(category.categoryMembers)
    ? category.categoryMembers
    : category.categoryMembers?.members;
  if (Array.isArray(explicit)) {
    return {
      members: (explicit as Array<CategoryMember | string>).flatMap((item) => {
        if (typeof item === 'string') return [{ title: item, route: null }];
        return item && typeof item.title === 'string'
          ? [{ ...item, route: item.route ?? null }]
          : [];
      }),
      source: 'explicit',
    };
  }
  const title = normalizedCategoryTitle(category.title);
  const members = records
    .filter(
      (item) =>
        item.pageId !== category.pageId &&
        Array.isArray(item.categories) &&
        item.categories.some(
          (value) => normalizedCategoryTitle(value) === title,
        ),
    )
    .map((item) => ({
      pageId: item.pageId,
      title: item.title,
      route: item.route,
      namespace: item.namespace,
      revisionId: item.revisionId,
    }));
  return { members, source: members.length ? 'derived' : 'none' };
}

export function categoryIndexMembersFor(
  category: ArticleRecord,
  index: CategoryIndex,
): { members: CategoryMember[]; source: 'explicit' | 'none' } {
  const key = Object.keys(index.categories ?? {}).find(
    (candidate) =>
      normalizedCategoryTitle(candidate) ===
      normalizedCategoryTitle(category.title),
  );
  if (!key) return { members: [], source: 'none' };
  const members = index.categories[key];
  return {
    members: Array.isArray(members)
      ? members
          .filter((item) => item && typeof item.title === 'string')
          .map((item) => ({ ...item, route: item.route ?? null }))
      : [],
    source: 'explicit',
  };
}

export function categoryMemberRoute(
  member: CategoryMember,
  records: ArticleRecord[],
): string {
  const record = member.pageId
    ? records.find((item) => item.pageId === member.pageId)
    : records.find((item) => item.title === member.title);
  const localRoute =
    member.route && /^(?:\/wiki\/|\/media\/|\/category\/)/.test(member.route)
      ? member.route
      : record?.route;
  return localRoute
    ? publishedRoute(localRoute)
    : `/unavailable-source?title=${encodeURIComponent(member.title)}`;
}

export function rewriteArchiveHtml(html: string): string {
  const base =
    typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/hay-day-wiki-archive/')
      ? '/hay-day-wiki-archive'
      : '';
  const withoutRemoteImages = html.replace(/<img\b[^>]*>/gi, (tag) => {
    const alt =
      tag
        .match(/\balt=(?:"([^"]*)"|'([^']*)')/i)
        ?.slice(1)
        .find(Boolean) ?? 'Referenced media';
    return `<span class="archived-media-placeholder" role="img" aria-label="${alt.replace(/[&<>"']/g, '')}">${alt.replace(/[&<>]/g, '')}</span>`;
  });
  const withStaticRoutes = withoutRemoteImages.replace(
    /href="(\/(?:wiki|media)\/[^"#?]+)([^" ]*)"/gi,
    (_match, route, suffix) => `href="${publishedRoute(route)}${suffix}"`,
  );
  const consentGatedVideos = withStaticRoutes.replace(
    /href="(https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com)\/[^" ]*)"/gi,
    (_match, url) =>
      `href="/unavailable-source?video=${encodeURIComponent(url)}"`,
  );
  return base
    ? consentGatedVideos.replace(/href="\/(?!\/)/g, `href="${base}/`)
    : consentGatedVideos;
}

export async function fetchArchiveJson<T>(path: string): Promise<T> {
  const response = await fetch(archiveAsset(path));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

export async function fetchArchiveValues<T>(path: string): Promise<T[]> {
  const payload = await fetchArchiveJson<T[] | Record<string, T>>(path);
  return Array.isArray(payload) ? payload : Object.values(payload);
}
