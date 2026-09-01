# Roadmap

This checklist records the current state of the archive. A checked item means implemented and verified at the built-output level. Planning text does not count as completion.

## Foundation

- [x] Create the execution-time MediaWiki snapshot manifest.
- [x] Implement resumable page, category, redirect, and referenced-media enumeration. Template and module dependency freezing remains open.
- [ ] Add every planned versioned schema. `SnapshotManifestV1`, `ArticleRecordV1`, and `MediaRecordV1` are verified; dedicated search and redirect records remain open.
- [x] Add deterministic import fixtures and interruption/resume verification.
- [x] Add the public-safe documentation foundation and contributor policy.

## Reader

- [ ] Implement every planned local route. Article, category, media, all-pages, attribution, status, and settings routes are built; changelog remains open.
- [x] Render sanitized imported HTML with local internal-link rewriting and remote-image suppression.
- [ ] Add sharded local search across titles, aliases, headings, body text, categories, and media captions.
- [ ] Add redirects and explicit unavailable-source states.
- [x] Add accessible empty, loading, error, and unavailable states for the implemented reader routes.

## Media and publication

- [x] Produce the per-file rights matrix from the execution manifest.
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
- [x] Record the final execution counts and rights decisions in the snapshot manifest.
