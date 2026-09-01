import { canonicalRoute, sha256 } from './schemas.mjs';

const SAFE_TAGS = new Set([
  'a',
  'abbr',
  'article',
  'b',
  'blockquote',
  'br',
  'caption',
  'code',
  'col',
  'colgroup',
  'dd',
  'del',
  'details',
  'div',
  'dl',
  'dt',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'li',
  'mark',
  'ol',
  'p',
  'pre',
  'q',
  's',
  'section',
  'small',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
  'video',
]);
const SAFE_ATTRS = new Set([
  'alt',
  'class',
  'colspan',
  'height',
  'href',
  'loading',
  'loop',
  'muted',
  'poster',
  'rel',
  'rowspan',
  'src',
  'target',
  'title',
  'width',
]);
const EXTERNAL_VIDEO_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'vimeo.com',
  'www.vimeo.com',
  'player.vimeo.com',
]);

export function sanitizeHtml(
  html,
  {
    sourceBaseUrl = 'https://hayday.fandom.com/wiki/',
    pagesByTitle = new Map(),
    mediaByTitle = new Map(),
    sourceRevisionId,
  } = {},
) {
  const mediaIds = new Set();
  const externalVideos = extractExternalVideos(html);
  const withoutDangerousBlocks = String(html ?? '')
    .replace(
      /<\s*(script|style|iframe|object|embed|form|link|meta|base)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      '',
    )
    .replace(
      /<\s*(script|style|iframe|object|embed|form|link|meta|base)\b[^>]*\/?>/gi,
      '',
    );
  const sanitized = withoutDangerousBlocks.replace(
    /<([/]?)([A-Za-z][\w:-]*)([^>]*)>/g,
    (full, closing, rawTag, rawAttrs) => {
      const tag = rawTag.toLowerCase();
      if (!SAFE_TAGS.has(tag)) return '';
      if (closing) return `</${tag}>`;
      const attrs = [];
      for (const match of rawAttrs.matchAll(
        /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g,
      )) {
        const name = match[1].toLowerCase();
        const value = match[2] ?? match[3] ?? match[4] ?? '';
        if (!SAFE_ATTRS.has(name)) continue;
        if (name === 'href' || name === 'src' || name === 'poster') {
          const rewritten = rewriteUrl(value, {
            sourceBaseUrl,
            pagesByTitle,
            mediaByTitle,
            mediaIds,
            externalVideos,
          });
          if (!rewritten) continue;
          attrs.push(`${name}="${escapeAttr(rewritten)}"`);
        } else if (name === 'class') {
          const safeClasses = value
            .split(/\s+/)
            .filter((item) => /^[A-Za-z0-9_-]+$/.test(item))
            .slice(0, 20)
            .join(' ');
          if (safeClasses) attrs.push(`class="${escapeAttr(safeClasses)}"`);
        } else {
          attrs.push(`${name}="${escapeAttr(value.slice(0, 2000))}"`);
        }
      }
      if (tag === 'img') attrs.push('loading="lazy"');
      if (tag === 'a')
        attrs.push('rel="noopener noreferrer"', 'target="_blank"');
      return `<${tag}${attrs.length ? ` ${attrs.join(' ')}` : ''}>`;
    },
  );
  return {
    html: sanitized,
    htmlHash: sha256(sanitized),
    referencedMediaIds: [...mediaIds].sort((a, b) => a.localeCompare(b)),
    externalVideos: dedupeVideos(externalVideos),
    sourceRevisionId,
  };
}

function rewriteUrl(value, context) {
  const raw = decodeHtmlEntities(value.trim());
  if (
    !raw ||
    raw.startsWith('#') ||
    /^javascript:/i.test(raw) ||
    /^data:/i.test(raw) ||
    /^vbscript:/i.test(raw)
  )
    return null;
  let url;
  try {
    url = new URL(raw, context.sourceBaseUrl);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (EXTERNAL_VIDEO_HOSTS.has(host)) {
    context.externalVideos.push({
      provider: host.includes('vimeo') ? 'vimeo' : 'youtube',
      url: url.href,
      verdict: 'external-embed',
      consentRequired: true,
      embedMode: 'consent-gated',
    });
    return url.href;
  }
  if (
    url.pathname.toLowerCase().includes('/wiki/file:') ||
    /^File:/i.test(raw)
  ) {
    const pathTitle = decodeURIComponent(url.pathname.split('/wiki/')[1] ?? '');
    const title = /^File:/i.test(raw)
      ? raw.replace(/^\/*/, '')
      : /^File:/i.test(pathTitle)
        ? pathTitle
        : `File:${pathTitle}`;
    const media =
      context.mediaByTitle.get(title) ??
      context.mediaByTitle.get(title.replace(/^File:/i, 'File:'));
    if (media) {
      context.mediaIds.add(media.mediaId);
      return `/media/${encodeURIComponent(media.mediaId)}`;
    }
    return `/unavailable-source?media=${encodeURIComponent(title)}`;
  }
  if (url.origin === new URL(context.sourceBaseUrl).origin) {
    const title = titleFromWikiUrl(url);
    const page = title && context.pagesByTitle.get(title);
    if (page) return canonicalRoute(page.title, page.namespace, page.pageid);
    if (title) return `/unavailable-source?title=${encodeURIComponent(title)}`;
  }
  return url.href;
}

function titleFromWikiUrl(url) {
  const marker = '/wiki/';
  const index = url.pathname.indexOf(marker);
  if (index < 0) return null;
  return decodeURIComponent(
    url.pathname.slice(index + marker.length),
  ).replaceAll('_', ' ');
}

function dedupeVideos(videos) {
  return [...new Map(videos.map((video) => [video.url, video])).values()].sort(
    (a, b) => a.url.localeCompare(b.url),
  );
}

function extractExternalVideos(html) {
  const videos = [];
  for (const match of String(html ?? '').matchAll(
    /(?:href|src)\s*=\s*["']([^"']+)["']/gi,
  )) {
    let url;
    try {
      url = new URL(
        decodeHtmlEntities(match[1]),
        'https://hayday.fandom.com/wiki/',
      );
    } catch {
      continue;
    }
    const host = url.hostname.toLowerCase();
    if (!EXTERNAL_VIDEO_HOSTS.has(host)) continue;
    videos.push({
      provider: host.includes('vimeo') ? 'vimeo' : 'youtube',
      url: url.href,
      verdict: 'external-embed',
      consentRequired: true,
      embedMode: 'consent-gated',
    });
  }
  return dedupeVideos(videos);
}

function decodeHtmlEntities(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function escapeAttr(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
