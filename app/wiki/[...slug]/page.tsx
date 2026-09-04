'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArchiveNav } from '@/components/archive-nav';
import {
  currentArchiveSegments,
  fetchArchiveJson,
  fetchArchiveValues,
  pageIdFromSegments,
  publicRoute,
  resolveRedirect,
  rewriteArchiveHtml,
  type ArticleRecord,
} from '@/lib/archive';

export default function ArticlePage() {
  const pathname = useSyncExternalStore(
    (notify) => {
      window.addEventListener('popstate', notify);
      return () => window.removeEventListener('popstate', notify);
    },
    () => window.location.pathname,
    () => '',
  );
  const slug = pathname ? currentArchiveSegments('wiki') : [];
  const pageId = pageIdFromSegments(slug);
  const [article, setArticle] = useState<ArticleRecord | null>(null);
  const [index, setIndex] = useState<ArticleRecord[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!pageId) return;
    void fetchArchiveJson<ArticleRecord>(`articles/${pageId}.json`)
      .then(setArticle)
      .catch((reason) => setError(String(reason)));
  }, [pageId]);
  useEffect(() => {
    if (!article?.redirectTarget) return;
    void fetchArchiveValues<ArticleRecord>('articles.json')
      .then(setIndex)
      .catch((reason) => setError(String(reason)));
  }, [article?.redirectTarget]);
  const resolution = article
    ? article.redirectTarget
      ? resolveRedirect(article, index)
      : { record: article, chain: [article.title], status: 'direct' as const }
    : null;
  if (
    !article ||
    !resolution ||
    (article.redirectTarget && index.length === 0 && !error)
  )
    return (
      <main className="reader-shell">
        <ArchiveNav back="/all-pages" />
        <section className="loading-state" aria-live="polite">
          {pathname && !pageId
            ? 'This route has no source page identifier.'
            : error || 'Loading the frozen article…'}
        </section>
      </main>
    );
  const resolvedArticle = resolution.record;
  if (!resolvedArticle)
    return (
      <main className="reader-shell">
        <ArchiveNav back="/all-pages" />
        <article className="reader-article">
          <section className="unavailable-state" role="alert">
            <p className="eyebrow">Redirect recovery</p>
            <h1>{article.title}</h1>
            <p>
              This preserved redirect points to{' '}
              <strong>{resolution.chain.at(-1)}</strong>, but the local snapshot
              has no safe target for it.
            </p>
            <p>Redirect chain: {resolution.chain.join(' → ')}</p>
            <div className="source-links">
              <a href={article.sourceUrl}>Open the source record</a>
              <Link
                href={publicRoute(
                  '/unavailable-source?title=' +
                    encodeURIComponent(
                      resolution.chain.at(-1) ?? article.title,
                    ),
                )}
              >
                Source recovery
              </Link>
            </div>
          </section>
        </article>
      </main>
    );
  return (
    <main className="reader-shell">
      <ArchiveNav back="/all-pages" />
      <article className="reader-article">
        <header className="article-title">
          <p className="eyebrow">Frozen reader snapshot</p>
          <h1>{resolvedArticle.title}</h1>
          <p>
            Source revision {resolvedArticle.revisionId} from{' '}
            {new Date(resolvedArticle.revisionTimestamp).toLocaleString(
              'en-CA',
              { timeZone: 'UTC', timeZoneName: 'short' },
            )}
          </p>
        </header>
        {resolution.status === 'resolved' && (
          <aside className="redirect-notice" aria-live="polite">
            <strong>Preserved redirect</strong>
            <span>
              {article.title} → {resolution.chain.slice(1).join(' → ')}
            </span>
            <Link href={publicRoute(resolvedArticle.route)}>
              Open the canonical local article
            </Link>
            <small>
              Redirect source revision {article.revisionId} ·{' '}
              <a href={article.sourceUrl}>source record</a>
            </small>
          </aside>
        )}
        <section
          className="article-body"
          dangerouslySetInnerHTML={{
            __html: rewriteArchiveHtml(resolvedArticle.html),
          }}
        />
        <footer className="attribution-box">
          <strong>Source and attribution</strong>
          <p>
            Community text: {resolvedArticle.attribution.textLicense.label}. The
            exact license version was not exposed by the source API, so this
            archive does not guess one.
          </p>
          <div className="source-links">
            <a href={resolvedArticle.attribution.sourcePermalink}>
              Exact source revision
            </a>
            <a href={resolvedArticle.historyUrl}>Revision history</a>
            <Link href={publicRoute('/about/attribution')}>
              Archive attribution policy
            </Link>
          </div>
        </footer>
      </article>
    </main>
  );
}
