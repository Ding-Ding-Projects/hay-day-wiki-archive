# Security policy

## Scope

This project is a read-only archive and static reader. It does not provide accounts, public editing, comments, community messaging, payments, analytics, or user-uploaded server content.

## Reporting a security issue

Please do not include credentials, private files, personal data, or exploit payloads in a public issue. Use the repository's private security contact when one is configured. If no private channel is available, open a minimal public issue containing only a safe description and the affected version, without sensitive details.

## Security boundaries

- Imported HTML is sanitized through an explicit allowlist before it reaches the reader.
- Scripts, event handlers, unsafe URL schemes, trackers, account controls, edit controls, and executable embeds are removed.
- External videos are inactive until the reader explicitly requests them.
- The importer uses bounded concurrency, bounded response sizes, retry limits, and resumable state.
- Media is verified by source identity, signature, type, size, dimensions, and digest before storage.
- No credentials are stored in the repository, manifests, logs, captures, releases, or published pages.
- Large media uses immutable release-backed Cheap LFS assets. Standard Git LFS is not used.
- The static reader does not send analytics or user data.

## Supply chain

Build tools and packages must come from their canonical upstream sources and remain pinned by the project manifests. Published output must be tied to a source commit and a generated manifest digest. A missing or stale provenance record is an unavailable state, not a guessed release.
