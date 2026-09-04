'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArchiveNav } from '@/components/archive-nav';
import { publicRoute } from '@/lib/archive';

export default function UnavailableSourcePage() {
  const params = useSearchParams();
  const media = params.get('media');
  const video = params.get('video');
  const requested =
    params.get('title') ??
    media ??
    (video ? 'External video source' : 'the requested source record');
  const sourceTitle = media
    ? `File:${media.replace(/^File:/i, '')}`
    : requested;
  const sourcePath = sourceTitle
    .replace(/^File:/i, 'File:')
    .replaceAll(' ', '_');
  const sourceUrl = `https://hayday.fandom.com/wiki/${encodeURIComponent(sourcePath)}`;
  const searchUrl = `https://hayday.fandom.com/wiki/Special:Search?search=${encodeURIComponent(requested)}`;
  const videoTarget = safeVideoUrl(video);
  return (
    <main className="simple-page reader-page">
      <ArchiveNav back={media ? '/media' : '/all-pages'} />
      <section className="simple-hero unavailable-state">
        <p className="eyebrow">Source recovery</p>
        <h1>{requested}</h1>
        <p>
          This requested record is not present in the frozen reader snapshot.
          Its title is retained so you can recover the source without the reader
          pretending that missing data exists locally.
        </p>
        {videoTarget && <VideoConsent target={videoTarget} />}
        <div className="source-links">
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
            Open source record
          </a>
          <a href={searchUrl} target="_blank" rel="noopener noreferrer">
            Search the source
          </a>
          <Link href={publicRoute(media ? '/media' : '/all-pages')}>
            Return to the archive
          </Link>
        </div>
      </section>
      <section className="evidence-card">
        <h2>Why this is unavailable</h2>
        <p>
          The source reference was preserved, but no safe local target or
          downloadable record was available at import time. No source request is
          made automatically from this page.
        </p>
        <p>
          {video
            ? 'This external video remains consent-gated. Choosing the control above opens the approved source in a separate browser surface.'
            : 'For media, the separate source record is the provenance route. If the source later exposes a reusable file, it can be reviewed and imported without changing this reader’s frozen revision evidence.'}
        </p>
      </section>
    </main>
  );
}

function safeVideoUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      /^(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com)$/i.test(
        url.hostname,
      )
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function VideoConsent({ target }: { target: string }) {
  const [consent, setConsent] = useState(false);
  return (
    <div className="preview-action">
      <p>
        This external video is not loaded automatically. The approved provider
        may see your request and IP address. The archive sends no credentials.
      </p>
      {consent ? (
        <a
          className="source-media-link"
          href={target}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open consented external video
        </a>
      ) : (
        <button
          type="button"
          className="home-action outline"
          onClick={() => setConsent(true)}
        >
          I understand, show external video
        </button>
      )}
    </div>
  );
}
