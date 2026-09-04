# Category membership and reader scope

The snapshot stores category relationships as a versioned `CategoryIndexV1`. Each retained category title has one member list, and every member keeps its source page ID, title, namespace, membership type, scope, and local route when the page is in the reader scope.

## Behavior

The importer enumerates all retained namespace-14 category pages, then reads each category through the MediaWiki `categorymembers` API with continuation. It does not infer membership from article wikitext alone. Six retained categories are currently empty and remain present with empty arrays. Members outside the reader namespaces remain in the index with `scope: out-of-scope` and `route: null`; they are not silently discarded.

Article records also keep their direct category titles in `categoryMembership`, with `schemaVersion: 1`, so the reader can render local category links without loading the full index. The full edge list is available at `content/final/category-index.json` and is included in the snapshot manifest.

## Current evidence

The refreshed snapshot contains 354 retained category titles and 8,124 membership edges. The audit found 6 empty categories, 2,598 in-scope members, 5,526 out-of-scope members, zero category-title omissions, zero malformed members, and zero count mismatches.

## Failure and security boundaries

Category API failures, malformed continuation data, or an invalid index schema stop publication. Source titles and page IDs are preserved as received, while local routes are created only from the frozen page inventory. The reader never executes provider-authored category markup.

## Verification

Run `npm run test:wiki` for the focused importer checks, then run `node scripts/audit-snapshot.mjs content/final`. The audit independently checks category title coverage, edge counts, empty-category retention, member scope and route boundaries, exact article wikitext hashes, exact File-page wikitext hashes, media scope counts, and both manifest digests.

## Suggested articles

- [Archive scope and exclusions](archive-scope.md)
- [Import and provenance](import-and-provenance.md)
- [Media rights and storage matrix](../media/media-rights-matrix.md)
- [Verification plan](../verification/README.md)
