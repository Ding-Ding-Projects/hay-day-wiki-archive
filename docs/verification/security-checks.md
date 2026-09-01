# Security and sanitization checks

## HTML fixtures

The sanitizer test set must include scripts, event handlers, unsafe schemes, hostile inline styles, malformed markup, oversized input, executable embeds, tracker URLs, forms, account controls, and edit controls. The expected result retains semantic article content and removes executable or tracking behavior.

## Link checks

Internal links must resolve to local routes or an explicit unavailable-source state. External links retain their exact target and receive an external label. Redirects must resolve once and never loop.

## Media checks

File bytes are checked independently from filename extensions and source claims. A digest mismatch, unsupported signature, unknown rights state, or incomplete public upload keeps the record out of local byte storage.

## Privacy checks

The built reader must not send analytics, visitor settings, search terms, local vocabulary, private paths, credentials, or raw imported payloads to a server. External videos load only after explicit activation.

## Current status

These fixtures and checks are unimplemented. The existing preview is not a security verdict.

## Suggested articles

- [Import and provenance](../content/import-and-provenance.md)
- [Security policy](../../SECURITY.md)
- [Verification plan](verification-plan.md)
