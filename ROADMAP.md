# Roadmap

This checklist records the current state of the archive. A checked item means implemented and verified at the built-output level. Planning text does not count as completion.

## Foundation

- [ ] Create the execution-time MediaWiki snapshot manifest.
- [ ] Implement resumable page, category, template, module, redirect, and media enumeration.
- [ ] Add versioned `SnapshotManifestV1`, `ArticleRecordV1`, `MediaRecordV1`, `SearchDocumentV1`, and `RedirectRecordV1` schemas.
- [ ] Add deterministic import fixtures and interruption/resume verification.
- [ ] Add the complete public-safe documentation mirror and contributor policy.

## Reader

- [ ] Implement local article, category, media, all-pages, attribution, status, changelog, and settings routes.
- [ ] Render sanitized imported HTML with local internal-link rewriting.
- [ ] Add sharded local search across titles, aliases, headings, body text, categories, and media captions.
- [ ] Add redirects and explicit unavailable-source states.
- [ ] Add accessible empty, loading, error, and unavailable states.

## Media and publication

- [ ] Produce the per-file rights matrix from the execution manifest.
- [ ] Upload eligible original media to immutable Cheap LFS release assets in verified batches.
- [ ] Verify every copied media asset anonymously by status, content type, byte count, and SHA-256.
- [ ] Publish GitHub Pages from the validated static bundle.
- [ ] Add the release workflow, release timing evidence, manifests, hashes, and unsigned package evidence where applicable.

## Reader feature contract

- [ ] Implement the full universal feature inventory in `docs/architecture/feature-completeness.md`.
- [ ] Add a hand-written negative regression that fails when an inventory row, implementation link, documentation link, localization entry, test, built interaction, or capture is removed.
- [ ] Add Material Design reference files and deterministic parity captures. Current handoff: the Material Designer tool was unavailable in this session.
- [ ] Add the real built-reader capture matrix and a short built-reader screen recording.

## Documentation and handoff

- [ ] Add one article for every shipped feature and a suggested-articles section to each article.
- [ ] Keep the website, README, roadmap, changelog, and handoff current on every project-changing task.
- [ ] Record the final execution counts and rights decisions in the release manifest.
