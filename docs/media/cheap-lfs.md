# Cheap LFS and digest verification

## Storage model

The static reader and GitHub Pages bundle remain small. Eligible original media is uploaded to immutable release-backed Cheap LFS assets in batches below the transfer ceiling. The repository commits only small pointers and manifests. Standard Git LFS is not used.

Release buckets roll over before the 1,000-asset boundary. Existing asset URLs are never overwritten or deleted. A later refresh adds new immutable assets and leaves historical pointers valid.

## Verification sequence

1. Download the source bytes once.
2. Verify the file signature, claimed and observed MIME type, dimensions, and byte count.
3. Compute local SHA-256 and compare the source digest where supplied.
4. Upload one bounded release batch.
5. Read every uploaded asset back anonymously.
6. Verify status, redirect chain, content type, byte count, and SHA-256.
7. Commit the pointer and manifest only after the external check succeeds.

Mutation between hashing and upload invalidates the record. A pointer without an independently verified public asset is incomplete.

## Rights boundary

Rights uncertainty prevents byte duplication. The media record is still preserved with description, attribution, source link, and a `source-link-only` decision. No license is guessed from a filename, page appearance, or neighboring file.

## Current status

The Cheap LFS upload, rollover, anonymous-download, historical-restoration, and failure-recovery paths are unimplemented. This article is a contract and verification plan, not evidence that media has been uploaded.

## Suggested articles

- [Media rights and storage matrix](media-rights-matrix.md)
- [Import and provenance](../content/import-and-provenance.md)
- [Security policy](../../SECURITY.md)
