# Contributor instructions

This file is a sanitized mirror of the shared project instructions. It is a local project guide, not the canonical source. Keep the project factual, public-safe, reproducible, and respectful of source rights.

## Scope

- Preserve unrelated changes and review the current tree before editing.
- Do not commit credentials, private user data, generated build output, dependency directories, or source media whose reuse rights are not established.
- Use public records and ordinary professional language in repository files, issue comments, releases, and the published reader.
- Do not use private session vocabulary in public files.
- Keep imported text, source metadata, media metadata, and implementation code under separate licensing statements.

## Content and provenance

- Import from the source MediaWiki API with stable page and revision identifiers.
- Freeze a complete execution manifest before publication. Planning counts are historical planning notes only.
- Preserve redirects, source permalinks, history links, categories, citations, media references, and transformation notes.
- Exclude community conversations, user profiles, private-looking user material, and other non-reader namespaces unless a future written scope decision changes that boundary.
- Sanitize rendered HTML with an allowlist. Remove scripts, trackers, unsafe URLs, account controls, edit controls, and executable embeds.

## Media and releases

- Evaluate each media record independently. Never infer a license.
- Use immutable release-backed Cheap LFS storage for eligible large media. Do not use standard Git LFS.
- Verify source bytes, file signatures, MIME type, dimensions, byte size, and SHA-256 before publication.
- Keep the GitHub Pages bundle below its published-size limit. External video references remain external.
- Do not generate or vendor catalog photographs in this repository. Use the approved public dim-sum photo source for release metadata only.

## Reader quality

- User-facing routes must be keyboard accessible, responsive, readable, and honest about loading, empty, unavailable, and unverified states.
- Every required feature is tracked in the hand-written completeness inventory. `Unimplemented` means unshipped.
- Documentation describes behavior, configuration, failure modes, security boundaries, and verification evidence.
- Captures and comparisons must come from the built reader, not a design preview or mock.

## Verification

- Run the repository's documented checks locally before publication when the relevant implementation exists.
- Bind each result to the exact source commit and built output hash.
- A check that has not run is `unrun`, not passed. A route that has not been captured is not captured.
- Record blockers and missing external evidence in `HANDOFF.md` and the relevant feature article.
