# Import and provenance

## Required process

The importer uses the source MediaWiki Action API. It first enumerates the complete included scope, then freezes an execution manifest. Pages are parsed by selected revision ID, not by a mutable title. The importer stores exact revision-bound source wikitext, sanitized rendered HTML, content hashes, links, versioned category membership, and media references. The namespace-6 catalog is built from both `allpages` and paginated `allimages` results, then joined with current File-page revisions.

The source MediaWiki parser resolves Template and Module dependencies for the selected page revision while producing rendered HTML. Exact offline Template and Module dependency freezing remains unimplemented and is listed separately on the roadmap; this snapshot does not claim it.

## Resumability and request safety

The importer uses bounded concurrency, a stable user agent, `429` and `Retry-After` handling, bounded retries for temporary server errors, and durable progress. Partial output is never treated as a complete release. An interrupted run resumes from the manifest without duplicating page, media, or upload records.

## Sanitization

Rendered HTML is passed through an allowlist. Semantic headings, tables, lists, infoboxes, galleries, captions, citations, and approved presentation classes are retained. Scripts, event handlers, unsafe URL schemes, trackers, external stylesheets, account links, edit links, forms, and executable embeds are removed. Internal links become local routes. External links remain labelled as external.

## Versioned records

The importer validates these public schemas:

| Schema | Required purpose | Current status |
| --- | --- | --- |
| `SnapshotManifestV2` | Source identity, timing, counts, hashes, category and media completeness | Implemented and audited |
| `ArticleRecordV2` | Revision-bound article content, wikitext, category membership, and relationships | Implemented and audited |
| `MediaRecordV2` | Rights evidence, File-page revision wikitext, provenance, bytes, dimensions, scope, and reference counts | Implemented and audited |
| `CategoryIndexV1` | Category membership edges, retained scope, and local routes | Implemented and audited |
| `SearchDocumentV1` | Sharded local retrieval index | Unimplemented |
| `RedirectRecordV1` | Local redirect resolution and loop checks | Unimplemented |

## Failure states

Missing records, duplicate IDs or slugs, unsafe object keys, invalid schema versions, digest mismatches, unresolved redirect loops, and incomplete imports stop publication. The release report names the exact record class and count without hiding a partial snapshot behind a green label.

## Current snapshot

The refreshed snapshot contains 1,363 article records and 4,807 media records, including the complete current namespace-6 union. Its content-manifest SHA-256 is `44179799480410772ae2188853abbde101a3e7c22e71a710346f0221c65f670b`; its media-manifest SHA-256 is `087c744f4c45485b83f3d03f1bdf00480f6f8a1585661705caa613b06392414c`. The audit found zero missing references, zero File-page inventory omissions, zero wikitext hash mismatches, and 1,097 valid unreferenced catalog records.

Refreshes re-enumerate the included namespaces and batch-query current revision IDs before fetching content. Only new, changed, or removed page IDs are invalidated. A full media refresh separately paginates namespace 6 `allimages` and reads current File-page revisions. This keeps the live delta small while ensuring the media catalog is complete.

## Suggested articles

- [Archive scope and exclusions](archive-scope.md)
- [Licensing and attribution](licensing-and-attribution.md)
- [Media rights and storage](../media/media-rights-matrix.md)
- [Verification plan](../verification/README.md)
