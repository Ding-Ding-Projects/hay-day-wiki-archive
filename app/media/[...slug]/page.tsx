'use client';

import { useEffect, useState } from 'react';
import { ArchiveNav } from '@/components/archive-nav';
import { currentArchiveSegments, fetchArchiveJson, type MediaRecord } from '@/lib/archive';

export default function MediaRecordPage() {
  const slug = currentArchiveSegments('media');
  const route = `/media/${encodeURIComponent(slug.join('/'))}`;
  const [record, setRecord] = useState<MediaRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { void fetchArchiveJson<MediaRecord[]>('media-manifest.json').then((items) => setRecord(items.find((item) => item.route === route) ?? null)).catch(() => setRecord(null)).finally(() => setLoaded(true)); }, [route]);
  if (!record) return <main className="reader-shell"><ArchiveNav back="/media" /><section className="loading-state" aria-live="polite">{loaded ? 'Media record not found.' : 'Loading the media record…'}</section></main>;
  return <main className="simple-page reader-page">
    <ArchiveNav back="/media" />
    <section className="simple-hero"><p className="eyebrow">Media record</p><h1>{record.title}</h1><p>{record.reason}</p></section>
    <section className="media-record">
      <div className="media-placeholder"><strong>{record.verdict}</strong><span>No media bytes are reproduced on this page.</span></div>
      <dl><div><dt>Type</dt><dd>{record.mime ?? record.mediaType}</dd></div><div><dt>Dimensions</dt><dd>{record.width && record.height ? `${record.width} × ${record.height}` : 'Unavailable'}</dd></div><div><dt>File size</dt><dd>{record.size ? `${record.size.toLocaleString()} bytes` : 'Unavailable'}</dd></div><div><dt>Reuse verdict</dt><dd>{record.verdict}</dd></div></dl>
      {record.sourceUrl && <a className="source-media-link" href={record.sourceUrl}>Open the source record</a>}
    </section>
  </main>;
}
