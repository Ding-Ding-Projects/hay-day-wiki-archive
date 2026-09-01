'use client';

import { useEffect, useState } from 'react';
import { ArchiveNav } from '@/components/archive-nav';
import { ArchiveSearch } from '@/components/archive-search';
import { fetchArchiveValues, type MediaRecord } from '@/lib/archive';

export default function MediaPage() {
  const [media, setMedia] = useState<MediaRecord[]>([]);
  useEffect(() => { void fetchArchiveValues<MediaRecord>('media-manifest.json').then(setMedia).catch(() => setMedia([])); }, []);
  return <main className="simple-page reader-page">
    <ArchiveNav />
    <section className="simple-hero"><p className="eyebrow">Rights-aware media ledger</p><h1>Media</h1><p>Every referenced media identity is represented. Unknown or restricted rights remain source-link-only.</p></section>
    <ArchiveSearch label="Search media records" items={media.map((item) => ({ title: item.title, route: item.route, detail: `${item.verdict} · ${item.mime ?? item.mediaType}` }))} />
  </main>;
}
