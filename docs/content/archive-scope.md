# Archive scope and exclusions

## Included reader scope

The execution snapshot includes the source wiki's reader-facing knowledge base:

- main-namespace articles and redirects;
- category pages and membership relationships;
- Help records and project-policy records needed to explain the source;
- templates and modules required to render included articles;
- media records referenced by included reader content;
- file descriptions, source links, dimensions, MIME types, byte sizes, revision identities, and rights metadata;
- external video references as labelled external links or consent-to-load embeds.

The planning audit found 994 article and redirect records, 354 categories, 3 Help records, 11 Hay Day Wiki project records, 3,707 referenced media records, and 452 external video records. These numbers must be replaced by the execution manifest at import time.

## Excluded scope

The archive excludes talk pages, user-talk pages, user profiles, user blogs, forums, boards, message walls, comments, threads, account controls, advertisements, analytics, trackers, edit controls, and executable third-party interface code. It also excludes unused or user-only uploads that are not referenced by included reader content.

An exclusion is recorded in the snapshot manifest with its namespace or reason. The reader does not turn an excluded record into a blank page. It presents an honest unavailable-source state when a retained link points outside the reader scope.

## Snapshot boundary

Enumeration must record source identity, import start and finish times, MediaWiki version, namespace inventory, page IDs, selected revision IDs, titles, redirect targets, and content hashes. A release is publishable only when every selected record has a terminal import result and the manifest digest validates.

## Suggested articles

- [Import and provenance](import-and-provenance.md)
- [Licensing and attribution](licensing-and-attribution.md)
- [Universal feature completeness](../architecture/feature-completeness.md)
