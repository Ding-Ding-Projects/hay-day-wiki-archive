'use client';

import { useEffect, useState } from 'react';
import { ArchiveNav } from '@/components/archive-nav';
import { ArchiveSearch } from '@/components/archive-search';
import {
  categoryRoute,
  fetchArchiveValues,
  type ArticleIndexItem,
} from '@/lib/archive';

export default function CategoriesPage() {
  const [articles, setArticles] = useState<ArticleIndexItem[]>([]);
  useEffect(() => {
    void fetchArchiveValues<ArticleIndexItem>('articles.json')
      .then(setArticles)
      .catch(() => setArticles([]));
  }, []);
  const categories = articles.filter((item) => item.namespace === 14);
  return (
    <main className="simple-page reader-page">
      <ArchiveNav />
      <section className="simple-hero">
        <p className="eyebrow">Archive structure</p>
        <h1>Categories</h1>
        <p>
          Browse all imported category pages without losing their source
          revision evidence.
        </p>
      </section>
      <ArchiveSearch
        label="Search categories"
        items={categories.map((item) => ({
          title: item.title.replace(/^Category:/, ''),
          route: categoryRoute(item),
          detail: `Source revision ${item.revisionId}`,
        }))}
      />
    </main>
  );
}
