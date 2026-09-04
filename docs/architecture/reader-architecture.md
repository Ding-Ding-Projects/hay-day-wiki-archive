# Reader architecture

## Planned routes

| Route                 | Purpose                                                | Status                           |
| --------------------- | ------------------------------------------------------ | -------------------------------- |
| `/`                   | Home, snapshot status, search, and major categories    | Preview only                     |
| `/wiki/<slug>`        | Article and redirect reader                            | Implemented and locally verified |
| `/category/<slug>`    | Category membership                                    | Implemented and locally verified |
| `/media/<slug>`       | Media description, rights, and provenance              | Implemented and locally verified |
| `/all-pages`          | Complete included title index                          | Unimplemented                    |
| `/media`              | Included media library                                 | Unimplemented                    |
| `/about/attribution`  | Source, licenses, exclusions, and unofficiality notice | Unimplemented                    |
| `/settings`           | Local presentation and accessibility settings          | Unimplemented                    |
| `/changelog`          | Snapshot and release history                           | Unimplemented                    |
| `/status`             | Current imported snapshot evidence                     | Unimplemented                    |
| `/unavailable-source` | Source and external-video recovery                     | Implemented and locally verified |

## Data flow

Source MediaWiki API records are enumerated into an immutable manifest, parsed by revision identity, sanitized, validated against versioned records, indexed into shards, and emitted as static routes. Redirects resolve only against the local frozen index. Category routes use explicit member records when present and imported article category fields as a fallback. Media references resolve through the media manifest and are loaded only after a user activates a bounded preview or a consent-gated external link.

## Privacy

Visitor settings and presentation preferences are local-only. The public reader does not collect accounts, analytics, comments, or user content. External video content is consent-gated.

## Current preview boundary

The reader-completeness slice proves the route and source-recovery behavior described above against the current frozen snapshot. It does not claim that the universal feature inventory is complete, and unknown media rights remain source-link-only.

## Suggested articles

- [Universal feature completeness](feature-completeness.md)
- [Reader completeness](reader-completeness.md)
- [Archive scope](../content/archive-scope.md)
- [Verification plan](../verification/README.md)
