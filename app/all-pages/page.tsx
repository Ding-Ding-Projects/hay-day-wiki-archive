'use client';

import { useEffect, useState } from 'react';
import { ArchiveNav } from '@/components/archive-nav';
import { ArchiveSearch } from '@/components/archive-search';
import { fetchArchiveValues, type ArticleIndexItem } from '@/lib/archive';

export default function AllPages() {
  const [articles, setArticles] = useState<ArticleIndexItem[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { void fetchArchiveValues<ArticleIndexItem>('articles.json').then(setArticles).catch((reason) => setError(String(reason))); }, []);
  return <main className="simple-page reader-page">
    <ArchiveNav />
    <section className="simple-hero"><p className="eyebrow">Complete reader inventory</p><h1>All articles</h1><p>Every imported reader-facing page is listed here with its frozen revision.</p></section>
    {error ? <p className="load-error">The article index could not load: {error}</p> : <ArchiveSearch label="Search all articles" items={articles.map((item) => ({ title: item.title, route: item.route, detail: `Revision ${item.revisionId} · ${new Date(item.revisionTimestamp).toLocaleDateString('en-CA')}` }))} />}
  </main>;
}
