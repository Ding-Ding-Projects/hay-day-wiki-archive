# Handoff

## Current state

The repository contains a complete execution-time metadata snapshot and a built archive reader. The refreshed snapshot holds 1,363 reader-facing records, 4,697 namespace-6 File-page records, 4,649 paginated allimages records, 3,710 referenced media identities, and a 4,807-title media union. It records 4,209 source-link-only decisions, 146 missing-upstream decisions, and 452 external-embed decisions. No third-party media bytes have been copied.

## Source planning audit

The refreshed live inventory contains 995 main-namespace articles and redirects, 354 categories, 3 Help records, and 11 Hay Day Wiki project records. Execution preserved all 1,363 records, resolved 3,710 referenced media identities, and retained 354 category titles with 8,124 membership edges. The media union distinguishes 3,601 File-page-and-referenced records, 1,096 File-page-only records, 109 referenced-only records, and 1 downloadable-only record. The six genuinely empty categories remain present.

## Execution evidence

- Snapshot manifest: `content/final/snapshot-manifest.json`
- Content manifest SHA-256: `44179799480410772ae2188853abbde101a3e7c22e71a710346f0221c65f670b`
- Media manifest SHA-256: `087c744f4c45485b83f3d03f1bdf00480f6f8a1585661705caa613b06392414c`
- Snapshot audit: 1,363 article files, 4,807 media files, 4,697 File-page records, 354 category titles, 8,124 category edges, zero missing references, zero File-page omissions, zero wikitext hash mismatches, and 1,097 valid unreferenced catalog records
- Importer tests: 15 passed
- Reader checks: lint passed, TypeScript passed, and the production build passed
- Static output check: 5,077 routes, 10,174 files, 150,919,711 bytes before this metadata refresh; rebuild required for the new category index and exact wikitext records
- Public deployment: commit `ba4d276a874e6ff10bbc850a6091fb3eb4c6260a`, GitHub Actions run `33471110541`, successful
- Current published `v0.1.0` availability: 1,362 article JSON files and 3,708 media JSON files returned HTTP 200; the refreshed 1,363/4,807 snapshot is not claimed deployed until the next release
- Desktop server and security tests: 2 passed
- Complete local test set before this lane: 13 passed; this lane's focused importer suite is 15 passed
- Desktop package: genuine Squirrel.Windows `Setup.exe`, `RELEASES`, and full `.nupkg`; setup PE certificate table absent
- Final desktop candidate commit: `f2f8df109084f6985785c01125eced55647a9c88`
- Final setup: 166,192,128 bytes, SHA-256 `65e9de04959d0abce09af6d986b4788a3785edd8c8b24ee8f98b42b344c2e597`, unsigned
- Published `v0.1.0` packaged runtime: Home, all-pages, and article navigation verified; 1,362 rows rendered; attribution present; maximize and restore state verified; zero body overflow, runtime exceptions, error logs, failed requests, or HTTP error responses
- Built capture: `docs/captures/desktop-article-f2f8df1.png`, SHA-256 `a7dedc3c192545ce56db9a350352d36d5e1b56d3a288aef4110eb8638639297a`
- Published release: `v0.1.0`, target `db5fb72fa280da86d7a0f65eda460c5e981d4a7e`, non-draft and non-prerelease
- Published setup: 166,193,664 bytes, SHA-256 `a0c4b90f06adc716151c800a6a0beb1891e91d5e5269bb6b8d42deb499777f1c`, anonymously downloadable with HTTP 200
- Published full package: 165,621,027 bytes, SHA-256 `c8f2f9048618365f606e946d19ddf7f70a1c981e22d04d76b786303bd40e348f`
- Published release index: 91 bytes, SHA-256 `d88f8bab7ab4a666dca1ff8574757586af29349dab2520a52ca2031d28ab71f7`
- Published-home capture: `docs/captures/pages-home-download-6d35d36.png`, 1,440 × 1,000 pixels, 467,657 bytes, SHA-256 `f0cb0567d1e52605759a4962c39dfcbc3a0dec037973cbff2d89505f255aea90`
- Published download interaction: control visible and keyboard-addressable at 390 × 844 with no horizontal overflow; exact release URL returned HTTP 200 and 166,193,664 bytes

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
