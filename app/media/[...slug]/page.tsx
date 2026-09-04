/* oxlint-disable next/no-img-element, jsx-a11y/media-has-caption */
'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArchiveNav } from '@/components/archive-nav';
import {
  currentArchiveSegments,
  fetchArchiveValues,
  publishedRoute,
  type MediaRecord,
} from '@/lib/archive';

export default function MediaRecordPage() {
  const pathname = useSyncExternalStore(
    (notify) => {
      window.addEventListener('popstate', notify);
      return () => window.removeEventListener('popstate', notify);
    },
    () => window.location.pathname,
    () => '',
  );
  const slug = pathname ? currentArchiveSegments('media') : [];
  const route = `/media/${slug.join('/')}`;
  const [record, setRecord] = useState<MediaRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [previewRequested, setPreviewRequested] = useState(false);
  const [videoConsent, setVideoConsent] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  useEffect(() => {
    void fetchArchiveValues<MediaRecord>('media-manifest.json')
      .then((items) =>
        setRecord(
          items.find((item) => publishedRoute(item.route) === route) ?? null,
        ),
      )
      .catch(() => setRecord(null))
      .finally(() => setLoaded(true));
  }, [route]);
  if (!record)
    return (
      <main className="reader-shell">
        <ArchiveNav back="/media" />
        <section className="loading-state" aria-live="polite">
          {loaded && pathname
            ? 'Media record not found.'
            : 'Loading the media record…'}
        </section>
      </main>
    );
  return (
    <main className="simple-page reader-page">
      <ArchiveNav back="/media" />
      <section className="simple-hero">
        <p className="eyebrow">Media record</p>
        <h1>{record.title}</h1>
        <p>
          {record.reason ??
            record.transformation ??
            (record.verdict === 'missing-upstream'
              ? 'The source did not provide downloadable media information.'
              : 'The archive preserves this source record without copying its bytes.')}
        </p>
      </section>
      <section className="media-record">
        {previewRequested &&
          record.sourceUrl &&
          !previewError &&
          (isImage(record.mime) ? (
            <img
              className="source-preview"
              src={record.sourceUrl}
              alt={`Preview of ${record.title}`}
              referrerPolicy="no-referrer"
              onError={() => setPreviewError(true)}
            />
          ) : isAudio(record.mime) ? (
            <audio
              className="source-audio"
              controls
              preload="none"
              src={record.sourceUrl}
              onError={() => setPreviewError(true)}
            >
              <track
                kind="captions"
                label="Source captions"
                srcLang="en"
                src="data:text/vtt,WEBVTT%0A"
              />
            </audio>
          ) : null)}
        {!previewRequested && (
          <div className="media-placeholder">
            <strong>{record.verdict}</strong>
            <span>No media bytes are fetched automatically.</span>
          </div>
        )}
        {previewError && (
          <p className="load-error" role="alert">
            The source preview could not be loaded. The source record remains
            available.
          </p>
        )}
        <dl>
          <div>
            <dt>Type</dt>
            <dd>{record.mime ?? record.mediaType ?? 'Unavailable'}</dd>
          </div>
          <div>
            <dt>Dimensions</dt>
            <dd>
              {record.width && record.height
                ? `${record.width} × ${record.height}`
                : 'Unavailable'}
            </dd>
          </div>
          <div>
            <dt>File size</dt>
            <dd>
              {typeof record.sizeBytes === 'number'
                ? `${record.sizeBytes.toLocaleString()} bytes`
                : 'Unavailable'}
            </dd>
          </div>
          <div>
            <dt>Reuse verdict</dt>
            <dd>{record.verdict}</dd>
          </div>
        </dl>
        {canPreview(record) && !previewRequested && (
          <div className="preview-action">
            <p>
              This preview asks your browser to fetch bytes from{' '}
              <code>static.wikia.nocookie.net</code>. The host may see your
              request and IP address. The archive sends no credentials and does
              not fetch until you activate this control.
            </p>
            <button
              type="button"
              className="home-action outline"
              onClick={() => {
                setPreviewError(false);
                setPreviewRequested(true);
              }}
            >
              Load source preview
            </button>
          </div>
        )}
        {record.verdict === 'external-embed' && (
          <div className="preview-action">
            <p>
              This is an external video. It is consent-gated and never
              auto-loaded.
            </p>
            {!videoConsent ? (
              <button
                type="button"
                className="home-action outline"
                onClick={() => setVideoConsent(true)}
              >
                I understand, show external video link
              </button>
            ) : verifiedProviderUrl(record.originalUrl) ? (
              <a
                className="source-media-link"
                href={verifiedProviderUrl(record.originalUrl) ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open verified external video after consent
              </a>
            ) : (
              <a
                className="source-media-link"
                href={record.descriptionUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open source record after consent
              </a>
            )}
          </div>
        )}
        <div className="source-links">
          <a
            className="source-media-link"
            href={record.descriptionUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open the source record
          </a>
          {record.sourceUrl && record.verdict !== 'external-embed' && (
            <a
              className="source-media-link"
              href={record.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open raw source URL
            </a>
          )}
        </div>
      </section>
    </main>
  );
}

function isImage(mime: string | null | undefined): boolean {
  return Boolean(
    mime && /^image\/(?:png|jpe?g|gif|webp|avif|svg\+xml|bmp)$/i.test(mime),
  );
}
function isAudio(mime: string | null | undefined): boolean {
  return Boolean(
    mime && /^audio\/(?:mpeg|mp4|ogg|wav|webm|aac|flac)$/i.test(mime),
  );
}
function canPreview(record: MediaRecord): boolean {
  if (
    !record.sourceUrl ||
    record.verdict === 'external-embed' ||
    record.verdict === 'missing-upstream'
  )
    return false;
  try {
    const url = new URL(record.sourceUrl);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'static.wikia.nocookie.net' &&
      (isImage(record.mime) || isAudio(record.mime))
    );
  } catch {
    return false;
  }
}

function verifiedProviderUrl(value: string | null): string | null {
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
