# Hay Day Wiki Archive

An unofficial, read-only archive and reader for the reader-facing knowledge base at [Hay Day Wiki](https://hayday.fandom.com/wiki/Hay_Day_Wiki). The project is intended to preserve a reproducible snapshot with source revisions, attribution, media provenance, and a calm farm-guide reading experience.

> **Status: planning and preview only.** The current repository contains a visual reader preview. The complete import, media ledger, local routes, search index, and release process described here are not yet implemented.

## Start here

- [Archive scope and exclusions](docs/content/archive-scope.md)
- [Import and provenance model](docs/content/import-and-provenance.md)
- [Media rights and storage matrix](docs/media/media-rights-matrix.md)
- [Universal feature completeness inventory](docs/architecture/feature-completeness.md)
- [Material Design reference handoff](design/README.md)
- [Roadmap](ROADMAP.md)
- [Handoff](HANDOFF.md)

The planned public reader is `https://ding-ding-projects.github.io/hay-day-wiki-archive/`. It is a read-only documentation surface, not a replacement community site, not a game client, and not a place for accounts, editing, comments, or discussion records.

## Planning audit

The planning audit recorded these source figures:

| Collection | Planning count | Meaning |
| --- | ---: | --- |
| Reader-facing included records | 1,362 | 994 main-namespace articles and redirects, 11 project records, 3 Help records, and 354 categories |
| Main-namespace articles and redirects | 994 | Reader-facing article records found during planning |
| Categories | 354 | Category routes and membership records found during planning |
| Help records | 3 | Help and project guidance records found during planning |
| Hay Day Wiki project records | 11 | Project-policy records found during planning |
| Referenced media records | 3,699 | Distinct media records referenced by included reader content |
| External video records | 452 | External video references, mostly YouTube links |
| File-namespace records | 4,682 | File namespace records reported during planning |
| All-images media records | 4,634 | All-images inventory records reported during planning, distinct from the file namespace |
| Original media volume | About 1.898 GiB | Source-reported original media volume |

These figures are planning values, not a claim about the final snapshot. The execution importer must create an immutable manifest after enumeration. That execution manifest is the source of truth for the release, including any source changes between planning and import, redirects, omitted namespaces, missing upstream records, and media rights decisions.

## Attribution and rights

Imported community-authored text remains attributed to its original authors and source revision. Where source evidence establishes the applicable terms, the importer records the exact license identifier and version before publishing an adaptation. The planning audit points to CC BY-SA evidence, but the execution manifest must capture the exact version from the source rather than assume it. The article carries the original title, revision permalink, history link, import time, and transformation note.

Media rights are evaluated per file. A media record can be preserved without copying its bytes when reuse rights are not established. The archive never guesses a license, silently changes a file, or presents a source-hosted file as a local copy. See the [media rights matrix](docs/media/media-rights-matrix.md).

This project is unofficial and is not endorsed by Supercell. Hay Day and Supercell remain the property of their respective owners. The project is non-commercial, has no advertising or analytics, and does not provide public editing or community accounts. See [Supercell's Fan Content Policy](https://supercell.com/en/fan-content-policy/).

## Media storage

The public reader will keep the static application and manifests below the GitHub Pages published-size limit. Eligible, verified original media will use immutable release-backed Cheap LFS assets. Standard Git LFS is not used. External videos remain external references and are never presented as copied local media.

Every media record receives one terminal decision: `copied`, `external-embed`, `source-link-only`, or `missing-upstream`. The manifest stores the source identity, rights classification, digest, dimensions, MIME type, byte size, and immutable storage URL where applicable.

## Development status

The current preview is built with React, Vite, and the Sites-compatible toolchain. It is not evidence that the full archive exists. Build and release details will be added as the importer, schemas, static routes, local search, verification harness, and publication workflow land.

The repository keeps a hand-written [feature completeness inventory](docs/architecture/feature-completeness.md). Rows marked `Unimplemented` are deliberate, factual placeholders. They are not a promise that a hidden route or sibling project satisfies the requirement.

## License

Implementation code is intended to use the MIT License. Imported text is handled under its source terms, with the exact license version recorded from source evidence. Media rights remain file-specific. See [LICENSE](LICENSE) and [docs/content/licensing-and-attribution.md](docs/content/licensing-and-attribution.md).
