'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArchiveNav } from '@/components/archive-nav';
import { currentArchiveSegments, fetchArchiveJson, pageIdFromSegments, publicRoute, rewriteArchiveHtml, type ArticleRecord } from '@/lib/archive';

export default function ArticlePage() {
  const slug = currentArchiveSegments('wiki');
  const pageId = pageIdFromSegments(slug);
  const [article, setArticle] = useState<ArticleRecord | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!pageId) return;
    void fetchArchiveJson<ArticleRecord>(`articles/${pageId}.json`).then(setArticle).catch((reason) => setError(String(reason)));
  }, [pageId]);
  if (!article) return <main className="reader-shell"><ArchiveNav back="/all-pages" /><section className="loading-state" aria-live="polite">{!pageId ? 'This route has no source page identifier.' : error || 'Loading the frozen article…'}</section></main>;
  return <main className="reader-shell">
    <ArchiveNav back="/all-pages" />
    <article className="reader-article">
      <header className="article-title"><p className="eyebrow">Frozen reader snapshot</p><h1>{article.title}</h1><p>Source revision {article.revisionId} from {new Date(article.revisionTimestamp).toLocaleString('en-CA', { timeZone: 'UTC', timeZoneName: 'short' })}</p></header>
      <section className="article-body" dangerouslySetInnerHTML={{ __html: rewriteArchiveHtml(article.html) }} />
      <footer className="attribution-box">
        <strong>Source and attribution</strong>
        <p>Community text: {article.attribution.textLicense.label}. The exact license version was not exposed by the source API, so this archive does not guess one.</p>
        <div className="source-links"><a href={article.attribution.sourcePermalink}>Exact source revision</a><a href={article.historyUrl}>Revision history</a><Link href={publicRoute('/about/attribution')}>Archive attribution policy</Link></div>
      </footer>
    </article>
  </main>;
}
