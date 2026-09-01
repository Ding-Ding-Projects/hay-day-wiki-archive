# Import and provenance

## Required process

The importer uses the source MediaWiki Action API. It first enumerates the complete included scope, then freezes an execution manifest. Pages are parsed by selected revision ID, not by a mutable title. The importer stores source wikitext, sanitized rendered HTML, content hashes, links, categories, and media references.

Template and Module dependencies are inventoried before rendering. If those dependencies change during a snapshot, affected pages are rerendered or the snapshot remains unpublished until a coherent result is available.

## Resumability and request safety

The importer uses bounded concurrency, a stable user agent, `429` and `Retry-After` handling, bounded retries for temporary server errors, and durable progress. Partial output is never treated as a complete release. An interrupted run resumes from the manifest without duplicating page, media, or upload records.

## Sanitization

Rendered HTML is passed through an allowlist. Semantic headings, tables, lists, infoboxes, galleries, captions, citations, and approved presentation classes are retained. Scripts, event handlers, unsafe URL schemes, trackers, external stylesheets, account links, edit links, forms, and executable embeds are removed. Internal links become local routes. External links remain labelled as external.

## Versioned records

The importer will validate these public schemas:

| Schema | Required purpose | Current status |
| --- | --- | --- |
| `SnapshotManifestV1` | Source identity, timing, counts, hashes, completeness | Implemented and audited |
| `ArticleRecordV1` | Revision-bound article content and relationships | Implemented and audited |
| `MediaRecordV1` | Rights, provenance, bytes, dimensions, and storage | Implemented and audited |
| `SearchDocumentV1` | Sharded local retrieval index | Unimplemented |
| `RedirectRecordV1` | Local redirect resolution and loop checks | Unimplemented |

## Failure states

Missing records, duplicate IDs or slugs, unsafe object keys, invalid schema versions, digest mismatches, unresolved redirect loops, and incomplete imports stop publication. The release report names the exact record class and count without hiding a partial snapshot behind a green label.

## Current snapshot

The frozen snapshot contains 1,362 article records and 3,708 referenced media records. Its content-manifest SHA-256 is `05efa4bafc434ca566664ed1c07dfde80856f6d55b67fedd9d0a974ddd71b3c3`; its media-manifest SHA-256 is `9359ae3d389c0186e1234cc56640a221b2d72925a1ee0c513d7f474897505c61`. The audit found zero unreferenced media records and zero missing references.

## Suggested articles

- [Archive scope and exclusions](archive-scope.md)
- [Licensing and attribution](licensing-and-attribution.md)
- [Media rights and storage](../media/media-rights-matrix.md)
- [Verification plan](../verification/README.md)
