# Reader completeness

## Redirects

Article records that carry `redirectTarget` are resolved against the frozen local article index. Resolution is title-normalized, bounded to 32 hops, and cycle-aware. A successful resolution renders the target article with a visible redirect chain and links to both the canonical local article and the source revision. Missing targets and cycles render an explicit recovery state instead of falling through to a blank page or navigating indefinitely.

## Categories

Category records are emitted at `/category/<encoded-title>-<page-id>`. Membership is read from the snapshot `category-index.json` when available, including included, out-of-scope, and file edges. The reader falls back to `categoryMembers` on a category record and then to imported article `categories` fields for schema-1 compatibility. Members with no safe local route remain visible as source-only or unavailable entries. The shared search field keeps large lists bounded inside a scrollable result region and supports ordinary text search before the local regular-expression builder is enabled.

## Unavailable source recovery

`/unavailable-source` preserves a requested article, media title, or external video reference that has no safe local record. The page offers a source-record link, source search, and a return path. External video links are consent-gated on this route and are limited to the approved HTTPS video hosts. No source request is made automatically.

## Media preview

Media detail pages display `sizeBytes`, dimensions, MIME information, the rights verdict, the source record, and the raw source URL when applicable. Image and audio previews are user-activated only, restricted to HTTPS `static.wikia.nocookie.net` records with an allowlisted MIME type, and use `no-referrer`. Before activation, the page explains that the third-party host may observe the request and IP address and that the archive sends no credentials. External video records never auto-load.

## Static publishing and desktop policy

The static exporter explicitly emits category detail routes and the unavailable-source route. Its generated 404 recovery searches article and media manifests, recognizes published tilde-normalized routes, safely handles malformed percent encoding, and checks category candidates before falling back to a direct path. The desktop loopback server permits the exact static media host in `img-src` and `media-src`; no wildcard host is used. All other network access remains refused by the content-security policy and desktop navigation allowlist.

## Verification

The focused route and server suite checks redirect and category registrations, unavailable-source recovery, size-field rendering, consent-gated preview controls, static category routes, 404 manifest recovery, and exact desktop CSP origins. The static build and output check must be run against the frozen snapshot before publication.

## Suggested articles

- [Reader architecture](reader-architecture.md)
- [Import and provenance](../content/import-and-provenance.md)
- [Media rights matrix](../media/media-rights-matrix.md)
- [Verification plan](../verification/verification-plan.md)
