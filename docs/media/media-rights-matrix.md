# Media rights and storage matrix

## Per-file decision table

The execution importer writes one `MediaRecordV2` for every distinct title in the union of referenced media, namespace-6 File pages, and paginated allimages records. The `verdict` field remains a terminal handling decision, while `rightsEvidence.verdict` records only what the current File-page revision explicitly supports.

| Decision | Bytes copied? | Public display | Required evidence |
| --- | --- | --- | --- |
| `copied` | Yes | Immutable local release asset | Source identity, reusable-rights record, signature, MIME type, dimensions, byte size, SHA-256, upload verification |
| `external-embed` | No | Consent-to-load external video or labelled external link | Source URL, provider, activation state, privacy note |
| `source-link-only` | No | Description, attribution, and source link only | Source identity, rights uncertainty, reason bytes were not copied |
| `missing-upstream` | No | Explicit unavailable-source state | Failed upstream lookup, source title, import timestamp, retry note |

## Planning inventory

The current execution manifest identifies 3,710 referenced media records, 452 external-provider records, 4,697 File-page records, 4,649 allimages records, and 4,807 union records. The file-page and allimages inventories are different source views. The manifest accounts for every selected title exactly once, including 39 File pages without an allimages byte record and 107 referenced titles without a current downloadable record.

## Required metadata

Each record includes a stable media title, original source URL, File-description URL, File-page revision ID, timestamp, SHA-1, exact File-page wikitext, wikitext hash, MIME type, media type, byte size, dimensions, source SHA-1 where available, local SHA-256 when bytes are deliberately stored, immutable storage URL, rights evidence, attribution, reference count, catalog scope, handling verdict, and transformation notes. The importer must not silently mutate bytes or metadata.

Rights evidence is fail-closed. Recognized File-page templates are mapped to `conditional-supercell-policy`, `fair-use`, `permission-unverified`, `self-authored-unlicensed`, or `standard-license-pending-provenance`. A File page with no recognized rights signal is `no-file-page-evidence`; an external video/provider classification is derived from the actual media provider or MIME, not incidental words in wikitext. Every current handling verdict remains `source-link-only`, `external-embed`, or `missing-upstream`; no media bytes were copied.

## Video handling

External YouTube and Vimeo references remain external references. They are not copied into release assets and are not described as local video. Embedded playback requires explicit visitor activation and must not load third-party content on initial page load.

## Suggested articles

- [Cheap LFS and digest verification](cheap-lfs.md)
- [Import and provenance](../content/import-and-provenance.md)
- [Verification plan](../verification/README.md)
