# Hay Day Wiki Archive

An unofficial, read-only archive and reader for the reader-facing knowledge base at [Hay Day Wiki](https://hayday.fandom.com/wiki/Hay_Day_Wiki). The project is intended to preserve a reproducible snapshot with source revisions, attribution, media provenance, and a calm farm-guide reading experience.

> **Status:** The complete reader-facing snapshot and static archive are published. The repository contains 1,362 article records and 3,708 referenced media records. The Windows desktop package is implemented and locally packaged, but its built-interface capture remains unverified while the required headless service is unavailable.

## Start here

- [Archive scope and exclusions](docs/content/archive-scope.md)
- [Import and provenance model](docs/content/import-and-provenance.md)
- [Media rights and storage matrix](docs/media/media-rights-matrix.md)
- [Universal feature completeness inventory](docs/architecture/feature-completeness.md)
- [Material Design reference handoff](design/README.md)
- [Roadmap](ROADMAP.md)
- [Handoff](HANDOFF.md)

The public reader is <https://ding-ding-projects.github.io/hay-day-wiki-archive/>. It is a read-only documentation surface, not a replacement community site, not a game client, and not a place for accounts, editing, comments, or discussion records.

## Verified snapshot

The execution manifest records these published figures:

| Collection | Count | Meaning |
| --- | ---: | --- |
| Reader-facing included records | 1,362 | 994 main-namespace articles and redirects, 11 project records, 3 Help records, and 354 categories |
| Main-namespace articles and redirects | 994 | Reader-facing article records found during planning |
| Categories | 354 | Category routes and membership records found during planning |
| Help records | 3 | Help and project guidance records found during planning |
| Hay Day Wiki project records | 11 | Project-policy records found during planning |
| Referenced media records | 3,708 | Distinct media identities referenced by the frozen reader content |
| External embed records | 29 | Consent-gated provider references represented in the media ledger |
| File-namespace records | 4,682 | File namespace records reported during planning |
| All-images media records | 4,634 | All-images inventory records reported during planning, distinct from the file namespace |
| Original media volume | About 1.898 GiB | Source-reported original media volume |

The execution-time manifest is the source of truth. Its content digest is `05efa4bafc434ca566664ed1c07dfde80856f6d55b67fedd9d0a974ddd71b3c3`; its media digest is `9359ae3d389c0186e1234cc56640a221b2d72925a1ee0c513d7f474897505c61`.

## Attribution and rights

Imported community-authored text remains attributed to its original authors and source revision. Where source evidence establishes the applicable terms, the importer records the exact license identifier and version before publishing an adaptation. The planning audit points to CC BY-SA evidence, but the execution manifest must capture the exact version from the source rather than assume it. The article carries the original title, revision permalink, history link, import time, and transformation note.

Media rights are evaluated per file. A media record can be preserved without copying its bytes when reuse rights are not established. The archive never guesses a license, silently changes a file, or presents a source-hosted file as a local copy. See the [media rights matrix](docs/media/media-rights-matrix.md).

This project is unofficial and is not endorsed by Supercell. Hay Day and Supercell remain the property of their respective owners. The project is non-commercial, has no advertising or analytics, and does not provide public editing or community accounts. See [Supercell's Fan Content Policy](https://supercell.com/en/fan-content-policy/).

## Media storage

The public reader will keep the static application and manifests below the GitHub Pages published-size limit. Eligible, verified original media will use immutable release-backed Cheap LFS assets. Standard Git LFS is not used. External videos remain external references and are never presented as copied local media.

Every media record receives one terminal decision: `copied`, `external-embed`, `source-link-only`, or `missing-upstream`. The manifest stores the source identity, rights classification, digest, dimensions, MIME type, byte size, and immutable storage URL where applicable.

## Build and run

On Windows, run `build.bat /s` to install declared dependencies when needed, build the static reader, verify its 5,077-route output, and produce the unpacked desktop application. Run `build-installer.bat /s` to produce and verify the genuine unsigned Squirrel.Windows installer files. The installer is intentionally unsigned and may trigger an unknown-publisher warning.

The desktop reader bundles the same static snapshot as the public reader. It serves those files on an ephemeral loopback port, requires a launch-specific HttpOnly session cookie, prevents path traversal, applies a restrictive content security policy, keeps Node.js out of renderer pages, and opens only approved HTTPS source links externally. See [Desktop reader architecture](docs/architecture/desktop-reader.md).

The repository keeps a hand-written [feature completeness inventory](docs/architecture/feature-completeness.md). Rows marked `Unimplemented` are deliberate, factual placeholders. They are not a promise that a hidden route or sibling project satisfies the requirement.

## License

Implementation code is intended to use the MIT License. Imported text is handled under its source terms, with the exact license version recorded from source evidence. Media rights remain file-specific. See [LICENSE](LICENSE) and [docs/content/licensing-and-attribution.md](docs/content/licensing-and-attribution.md).
