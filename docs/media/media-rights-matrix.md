# Media rights and storage matrix

## Per-file decision table

The execution importer writes one `MediaRecordV1` for every distinct media record referenced by included content. The `rightsDecision` field must be exactly one of these values:

| Decision | Bytes copied? | Public display | Required evidence |
| --- | --- | --- | --- |
| `copied` | Yes | Immutable local release asset | Source identity, reusable-rights record, signature, MIME type, dimensions, byte size, SHA-256, upload verification |
| `external-embed` | No | Consent-to-load external video or labelled external link | Source URL, provider, activation state, privacy note |
| `source-link-only` | No | Description, attribution, and source link only | Source identity, rights uncertainty, reason bytes were not copied |
| `missing-upstream` | No | Explicit unavailable-source state | Failed upstream lookup, source title, import timestamp, retry note |

## Planning inventory

The planning audit identified 3,707 distinct referenced media records, 452 external video records, 4,634 total source media records, and about 1.898 GiB of original media. These values are not frozen release counts. The execution manifest must account for every selected media title exactly once, including records that move from one decision to another after rights review.

## Required metadata

Each record includes stable media title, original source URL, file-description URL, revision identity, MIME type, media type, byte size, dimensions, source SHA-1 where available, local SHA-256, immutable storage URL, rights classification, attribution, copy or link-only verdict, and transformation notes. The importer must not silently mutate bytes or metadata.

## Video handling

External YouTube and Vimeo references remain external references. They are not copied into release assets and are not described as local video. Embedded playback requires explicit visitor activation and must not load third-party content on initial page load.

## Suggested articles

- [Cheap LFS and digest verification](cheap-lfs.md)
- [Import and provenance](../content/import-and-provenance.md)
- [Verification plan](../verification/README.md)
