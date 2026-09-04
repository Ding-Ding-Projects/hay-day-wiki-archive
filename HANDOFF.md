# Handoff

## Current state

The repository contains a complete execution-time metadata snapshot and a built archive reader. The snapshot holds 1,362 reader-facing records and 3,708 unique referenced media records. It records 3,559 source-link-only decisions, 120 missing-upstream decisions, and 29 external-embed decisions. No third-party media bytes have been copied.

## Source planning audit

Planning identified 1,362 reader-facing records: 994 main-namespace articles and redirects, 354 categories, 3 Help records, and 11 Hay Day Wiki project records. Execution preserved all 1,362 records and resolved the actual article reference graph to 3,708 unique media identities. The broader source inventory still includes 4,634 all-images records and about 1.898 GiB of original media. Those broader records are not claimed as reader references.

## Execution evidence

- Snapshot manifest: `content/final/snapshot-manifest.json`
- Content manifest SHA-256: `05efa4bafc434ca566664ed1c07dfde80856f6d55b67fedd9d0a974ddd71b3c3`
- Media manifest SHA-256: `9359ae3d389c0186e1234cc56640a221b2d72925a1ee0c513d7f474897505c61`
- Snapshot audit: 1,362 article files, 3,708 media files, zero unreferenced media records, and zero missing referenced-media records
- Importer tests: 9 passed
- Reader checks: lint passed, TypeScript passed, and the production build passed
- Static output check: 5,077 routes, 10,174 files, 150,919,711 bytes
- Public deployment: commit `ba4d276a874e6ff10bbc850a6091fb3eb4c6260a`, GitHub Actions run `33471110541`, successful
- Public record availability: 1,362 article JSON files and 3,708 media JSON files returned HTTP 200
- Desktop server and security tests: 2 passed
- Complete local test set: 13 passed
- Desktop package: genuine Squirrel.Windows `Setup.exe`, `RELEASES`, and full `.nupkg`; setup PE certificate table absent
- Final desktop candidate commit: `f2f8df109084f6985785c01125eced55647a9c88`
- Final setup: 166,192,128 bytes, SHA-256 `65e9de04959d0abce09af6d986b4788a3785edd8c8b24ee8f98b42b344c2e597`, unsigned
- Packaged runtime: Home, all-pages, and article navigation verified; 1,362 rows rendered; attribution present; maximize and restore state verified; zero body overflow, runtime exceptions, error logs, failed requests, or HTTP error responses
- Built capture: `docs/captures/desktop-article-f2f8df1.png`, SHA-256 `a7dedc3c192545ce56db9a350352d36d5e1b56d3a288aef4110eb8638639297a`
- Published release: `v0.1.0`, target `db5fb72fa280da86d7a0f65eda460c5e981d4a7e`, non-draft and non-prerelease
- Published setup: 166,193,664 bytes, SHA-256 `a0c4b90f06adc716151c800a6a0beb1891e91d5e5269bb6b8d42deb499777f1c`, anonymously downloadable with HTTP 200
- Published full package: 165,621,027 bytes, SHA-256 `c8f2f9048618365f606e946d19ddf7f70a1c981e22d04d76b786303bd40e348f`
- Published release index: 91 bytes, SHA-256 `d88f8bab7ab4a666dca1ff8574757586af29349dab2520a52ca2031d28ab71f7`

## Documentation lane

This lane adds:

- public scope and exclusion rules;
- import and provenance requirements;
- licensing and attribution guidance;
- per-file media rights and storage decisions;
- Cheap LFS and digest verification rules;
- a complete universal-feature inventory with unimplemented rows;
- categorized documentation indexes;
- a checklist roadmap;
- a design handoff that records Material Designer unavailability;
- public contributor, security, conduct, and license records.

## Verification

The documentation files were reviewed for public-safe wording and the absence of private session vocabulary. Import execution, static route generation, GitHub Pages publication, the Windows desktop shell, unsigned installer packaging, focused built-reader interaction, and release `v0.1.0` are complete. Copied-media transfer, the full UI capture matrix, screen recording, and automatic release workflow remain open.

## Next owner

The next owner should preserve the frozen manifests and copy only media whose reusable rights are proven. Unknown and restricted media must stay source-link-only. Expand the built-interface capture matrix, record the required screen recording, and reconcile the automatic release workflow without weakening the unsigned-artifact warning.
