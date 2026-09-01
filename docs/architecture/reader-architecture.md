# Reader architecture

## Planned routes

| Route | Purpose | Status |
| --- | --- | --- |
| `/` | Home, snapshot status, search, and major categories | Preview only |
| `/wiki/<slug>` | Article and redirect reader | Unimplemented |
| `/category/<slug>` | Category membership | Unimplemented |
| `/media/<slug>` | Media description, rights, and provenance | Unimplemented |
| `/all-pages` | Complete included title index | Unimplemented |
| `/media` | Included media library | Unimplemented |
| `/about/attribution` | Source, licenses, exclusions, and unofficiality notice | Unimplemented |
| `/settings` | Local presentation and accessibility settings | Unimplemented |
| `/changelog` | Snapshot and release history | Unimplemented |
| `/status` | Current imported snapshot evidence | Unimplemented |

## Data flow

Source MediaWiki API records are enumerated into an immutable manifest, parsed by revision identity, sanitized, validated against versioned records, indexed into shards, and emitted as static routes. Media references resolve through the media manifest and are lazy-loaded only after the reader has a verified immutable URL.

## Privacy

Visitor settings and presentation preferences are local-only. The public reader does not collect accounts, analytics, comments, or user content. External video content is consent-gated.

## Current preview boundary

The existing home preview demonstrates the intended visual direction and planning counts. It does not prove complete routes, live search, source fidelity, media availability, or feature-contract completion.

## Suggested articles

- [Universal feature completeness](feature-completeness.md)
- [Archive scope](../content/archive-scope.md)
- [Verification plan](../verification/README.md)
