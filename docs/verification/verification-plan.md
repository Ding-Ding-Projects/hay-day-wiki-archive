# Verification plan

## Import checks

- Enumerate every included page and excluded namespace exactly.
- Validate revision IDs, titles, slugs, redirects, categories, hashes, and source links.
- Run the importer twice against the same fixture and require byte-identical manifests.
- Interrupt and resume at page, media, and upload boundaries.
- Reject duplicate IDs, duplicate slugs, missing records, digest mismatches, invalid schemas, and redirect loops.

## Media checks

- Account for every referenced media title with one terminal rights decision.
- Verify source signature, MIME type, dimensions, size, digest, pointer, release inventory, public download, and browser rendering for copied files.
- Verify external video consent behavior and source-link-only rendering.
- Verify rollover buckets and historical URLs.

## Reader checks

- Exercise home, article, redirect, category, media, all-pages, attribution, settings, status, and changelog routes.
- Check keyboard operation, visible focus, screen-reader names, contrast, reduced motion, narrow layouts, and high text scale.
- Verify no analytics, advertisements, third-party fonts, unsafe embeds, or unexpected network requests.
- Verify all empty, loading, error, unavailable, and unverified states.

## Evidence

Real captures and recordings must come from the built reader at a known commit. Capture manifests record viewport, scale, theme, language mode, source SHA, output hash, route, and privacy verdict. A source preview or filename-only list is not evidence.

## Current status

The complete verification suite, built-output interaction ledger, and real capture matrix are unimplemented. This plan is the acceptance contract for future work.

## Suggested articles

- [Security and sanitization checks](security-checks.md)
- [Universal feature completeness](../architecture/feature-completeness.md)
- [Cheap LFS verification](../media/cheap-lfs.md)
