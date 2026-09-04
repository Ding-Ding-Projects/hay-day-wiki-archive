# Archive scope and exclusions

## Included reader scope

The execution snapshot includes the source wiki's reader-facing knowledge base:

- main-namespace articles and redirects;
- category pages and membership relationships;
- Help records and project-policy records needed to explain the source;
- templates and modules required to render included articles;
- the complete current namespace-6 File-page title inventory, the allimages downloadable catalog, and media records referenced by included reader content;
- file descriptions, source links, dimensions, MIME types, byte sizes, revision identities, and rights metadata;
- external video references as labelled external links or consent-to-load embeds.

The current execution manifest contains 1,363 reader-facing records, 354 retained categories, 8,124 category-membership edges, 4,697 File-page records, 4,649 allimages records, 3,710 referenced media identities, and a 4,807-title media union. The counts are recorded in `content/final/snapshot-manifest.json`; they replace historical planning counts.

The media union intentionally contains catalog-only records. In the current snapshot, 1,096 File-page records have no article reference, 3,601 are both File pages and referenced, 109 are referenced without a retained File page, and 1 is present in allimages without a retained File page or article reference. File-page membership is never inferred from allimages alone.

## Excluded scope

The archive excludes talk pages, user-talk pages, user profiles, user blogs, forums, boards, message walls, comments, threads, account controls, advertisements, analytics, trackers, edit controls, and executable third-party interface code. It also excludes unused or user-only uploads that are not referenced by included reader content.

An exclusion is recorded in the snapshot manifest with its namespace or reason. The reader does not turn an excluded record into a blank page. It presents an honest unavailable-source state when a retained link points outside the reader scope.

## Snapshot boundary

Enumeration must record source identity, import start and finish times, MediaWiki version, namespace inventory, page IDs, selected revision IDs, titles, redirect targets, exact revision-bound wikitext, category membership, content hashes, the namespace-6 File-page inventory, allimages metadata, file-page revision evidence, and media reference counts. A release is publishable only when every selected record has a terminal import result and the manifest digest validates.

## Suggested articles

- [Import and provenance](import-and-provenance.md)
- [Licensing and attribution](licensing-and-attribution.md)
- [Universal feature completeness](../architecture/feature-completeness.md)
