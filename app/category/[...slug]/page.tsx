'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArchiveNav } from '@/components/archive-nav';
import { ArchiveSearch } from '@/components/archive-search';
import {
  categoryMembersFor,
  categoryIndexMembersFor,
  type CategoryIndex,
  currentArchiveSegments,
  fetchArchiveJson,
  fetchArchiveValues,
  pageIdFromSegments,
  type ArticleRecord,
} from '@/lib/archive';

export default function CategoryDetailPage() {
  const pathname = useSyncExternalStore(
    (notify) => {
      window.addEventListener('popstate', notify);
      return () => window.removeEventListener('popstate', notify);
    },
    () => window.location.pathname,
    () => '',
  );
  const segments = pathname ? currentArchiveSegments('category') : [];
  const pageId = pageIdFromSegments(segments);
  const [records, setRecords] = useState<ArticleRecord[]>([]);
  const [categoryIndex, setCategoryIndex] = useState<CategoryIndex | null>(
    null,
  );
  const [error, setError] = useState('');
  useEffect(() => {
    void fetchArchiveValues<ArticleRecord>('articles.json')
      .then(setRecords)
      .catch((reason) => setError(String(reason)));
  }, []);
  useEffect(() => {
    void fetchArchiveJson<CategoryIndex>('category-index.json')
      .then((index) => setCategoryIndex(index))
      .catch(() => setCategoryIndex(null));
  }, []);
  const category =
    records.find((item) => item.pageId === pageId && item.namespace === 14) ??
    records.find(
      (item) =>
        item.namespace === 14 &&
        item.title.replace(/^Category:/i, '').toLocaleLowerCase() ===
          segments[0]?.replace(/-\d+$/, '').toLocaleLowerCase(),
    );
  if (!category)
    return (
      <main className="reader-shell">
        <ArchiveNav back="/category" />
        <section className="loading-state" aria-live="polite">
          {error || 'Loading the category snapshot…'}
        </section>
      </main>
    );
  const membership = categoryIndex
    ? categoryIndexMembersFor(category, categoryIndex)
    : categoryMembersFor(category, records);
  const items = membership.members.map((member) => {
    const record = member.pageId
      ? records.find((item) => item.pageId === member.pageId)
      : records.find((item) => item.title === member.title);
    const localRoute =
      member.route && /^(?:\/wiki\/|\/media\/|\/category\/)/.test(member.route)
        ? member.route
        : record?.route;
    return {
      title: member.title,
      route:
        localRoute ??
        `/unavailable-source?title=${encodeURIComponent(member.title)}`,
      detail:
        [
          member.type,
          member.scope,
          member.revisionId ? `Revision ${member.revisionId}` : null,
        ]
          .filter(Boolean)
          .join(' · ') ||
        (member.route ? 'Source-only member record' : 'Imported member record'),
    };
  });
  return (
    <main className="simple-page reader-page">
      <ArchiveNav back="/category" />
      <section className="simple-hero">
        <p className="eyebrow">Category membership</p>
        <h1>{category.title.replace(/^Category:/i, '')}</h1>
        <p>
          Source revision {category.revisionId}. Membership comes from{' '}
          {membership.source === 'explicit'
            ? 'the frozen category-member records'
            : membership.source === 'derived'
              ? 'the imported article category fields'
              : 'no member records in this snapshot'}
          .
        </p>
      </section>
      {items.length ? (
        <ArchiveSearch label="Search category members" items={items} />
      ) : (
        <section className="empty-state category-empty">
          <strong>No local members recorded</strong>
          <span>
            This category remains available with its source provenance, but the
            frozen snapshot does not include member records.
          </span>
          <a
            href={category.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open the source category
          </a>
        </section>
      )}
    </main>
  );
}
