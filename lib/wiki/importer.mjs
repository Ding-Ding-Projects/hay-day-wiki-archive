import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname } from 'node:path';
import {
  canonicalRoute,
  CATEGORY_INDEX_SCHEMA_VERSION,
  INCLUDED_NAMESPACES,
  MEDIA_NAMESPACE,
  MEDIA_SCOPES,
  SCHEMA_VERSION,
  sha256,
  stableJson,
  validateArticleRecord,
  validateManifest,
  validateMediaRecord,
} from './schemas.mjs';
import { sanitizeHtml } from './sanitize.mjs';

const execFileAsync = promisify(execFile);

export class WikiImporter {
  constructor({
    client,
    outputDir,
    statePath,
    sourceUrl = 'https://hayday.fandom.com/wiki',
    includeNamespaces = INCLUDED_NAMESPACES,
    explicitReusableRights = [],
    pageConcurrency = 3,
    now = () => new Date().toISOString(),
    logger = () => {},
  }) {
    if (!client) throw new Error('WikiImporter requires a MediaWiki client');
    this.client = client;
    this.outputDir = outputDir;
    this.statePath = statePath;
    this.sourceUrl = sourceUrl.replace(/\/$/, '');
    this.includeNamespaces = [...includeNamespaces].sort((a, b) => a - b);
    this.explicitReusableRights = new Set(
      explicitReusableRights.map((value) => String(value).toLowerCase()),
    );
    this.now = now;
    this.logger = logger;
    this.pageConcurrency = Math.max(1, Math.min(8, Number(pageConcurrency) || 3));
  }

  async run({
    resume = true,
    maxPages = Infinity,
    refreshMedia = false,
    refreshInventory = false,
  } = {}) {
    await mkdir(this.outputDir, { recursive: true });
    const state = resume ? await readJson(this.statePath) : null;
    const previousManifest = state ? await readPreviousManifest(this.outputDir) : null;
    const startedAt = refreshInventory || refreshMedia
      ? this.now()
      : state?.snapshot?.startedAt ?? this.now();
    const working = state ?? {
      schemaVersion: SCHEMA_VERSION,
      snapshot: { startedAt, status: 'running' },
      pageInventory: [],
      pages: {},
      media: {},
      externalVideos: [],
      completedPageIds: [],
      mediaPageInventory: [],
      refresh: {},
    };
    if (state?.snapshot?.startedAt && !working.previousSnapshotBoundary)
      working.previousSnapshotBoundary = {
        startedAt: previousManifest?.snapshot?.startedAt ?? state.snapshot.startedAt,
        finishedAt: previousManifest?.snapshot?.finishedAt ?? state.snapshot.finishedAt ?? null,
        status: previousManifest?.snapshot?.status ?? state.snapshot.status ?? null,
      };
    const siteInfo = !refreshInventory && !refreshMedia && state?.siteInfo?.wikiId
      ? state.siteInfo
      : await this.client.siteInfo();
    working.siteInfo = siteInfo?.wikiId
      ? siteInfo
      : normalizeSiteInfo(siteInfo);
    working.siteInfoFetchedAt = (!refreshInventory && !refreshMedia)
      ? (working.siteInfoFetchedAt ?? this.now())
      : this.now();
    this.textLicense = {
      label: working.siteInfo.rights?.text ?? null,
      url: working.siteInfo.rights?.url ?? null,
      version: working.siteInfo.rights?.version ?? null,
    };
    working.schemaVersion = SCHEMA_VERSION;
    const recordsMissingWikitext = Object.values(working.pages).filter(
      (record) => typeof record.wikitext !== 'string',
    );
    if (recordsMissingWikitext.length && typeof this.client.pageWikitext === 'function') {
      const hydrated = await this.client.pageWikitext(
        recordsMissingWikitext.map((record) => record.pageId),
      );
      for (const record of recordsMissingWikitext) {
        const current = hydrated.get(Number(record.pageId));
        if (current && current.revid === Number(record.revisionId)) {
          record.wikitext = current.wikitext;
          record.wikitextHash = sha256(current.wikitext);
        }
      }
    }
    for (const record of Object.values(working.pages)) {
      record.attribution.sourcePermalink = revisionPermalink(
        record.sourceUrl,
        `${this.sourceUrl}/${encodeURIComponent(record.title.replaceAll(' ', '_'))}`,
        record.revisionId,
      );
      record.attribution.textLicense = this.textLicense;
      record.referencedMediaIds = [
        ...new Set(record.referencedMediaIds.map(mediaKey)),
      ].sort((a, b) => a.localeCompare(b));
      record.categoryMembership ??= {
        schemaVersion: CATEGORY_INDEX_SCHEMA_VERSION,
        titles: [...(record.categories ?? [])],
      };
      record.schemaVersion = SCHEMA_VERSION;
    }
    working.media = normalizeMediaState(working.media);
    if (refreshInventory && state?.pageInventory?.length)
      await this.refreshPageInventory(working);
    if (!working.pageInventory.length)
      working.pageInventory = await this.enumeratePageInventory();
    const inventoryByTitle = new Map(
      working.pageInventory.map((page) => [page.title, page]),
    );
    const selectedPages = working.pageInventory.slice(0, maxPages);
    const pendingPages = selectedPages.filter(
      (item) => !working.completedPageIds.includes(item.pageid),
    );
    for (let offset = 0; offset < pendingPages.length; offset += this.pageConcurrency) {
      const batch = pendingPages.slice(offset, offset + this.pageConcurrency);
      const fetched = await Promise.all(batch.map((item) => this.fetchPage(item, working)));
      for (const result of fetched) {
        for (const image of result.imageInfo)
          working.media[mediaKey(image.title)] = this.mediaRecord(image);
        for (const title of result.mediaTitles)
          if (!working.media[mediaKey(title)])
            working.media[mediaKey(title)] = this.missingMediaRecord(title);
      }
      const mediaByTitle = new Map(
        Object.values(working.media).map((record) => [record.title, record]),
      );
      const pageMap = new Map(
        working.pageInventory.map((page) => [page.title, page]),
      );
      for (const result of fetched.sort((a, b) => a.item.pageid - b.item.pageid)) {
        if (result.source) {
          const sanitized = sanitizeHtml(result.parsed.text ?? '', {
            sourceBaseUrl: `${this.sourceUrl}/`,
            pagesByTitle: pageMap,
            mediaByTitle,
            sourceRevisionId: result.source.revision.revid,
          });
          const record = this.articleRecord(
            result.source,
            result.parsed,
            sanitized,
            inventoryByTitle,
            result.mediaTitles,
          );
          validateArticleRecord(record);
          working.pages[String(record.pageId)] = record;
          working.externalVideos.push(...sanitized.externalVideos);
        }
        working.completedPageIds.push(result.item.pageid);
      }
      working.completedPageIds.sort((a, b) => a - b);
      await atomicWriteJson(this.statePath, working);
    }
    const mediaRebuilt = refreshMedia || (!state && typeof this.client.allImages === 'function');
    if (mediaRebuilt)
      await this.rebuildMediaGraph(working);
    if (!mediaRebuilt)
      await this.reconcileMissingMedia(working);
    await this.hydratePageCategories(working, { refresh: refreshInventory });
    if (refreshInventory || !working.categoryIndex)
      await this.refreshCategoryMembership(working);
    const completedIds = new Set(working.completedPageIds.map(Number));
    const complete = working.pageInventory.every((page) =>
      completedIds.has(Number(page.pageid)),
    );
    const manifest = this.buildManifest(working, { complete, startedAt });
    validateManifest(manifest);
    await writeManifest(this.outputDir, manifest, working);
    return manifest;
  }

  async enumeratePageInventory() {
    const inventory = [];
    for (const namespace of this.includeNamespaces) {
      const pages = await this.client.allPages(namespace);
      inventory.push(
        ...pages.map((page) => ({
          pageid: Number(page.pageid),
          title: page.title,
          namespace,
          redirect: Boolean(page.redirect),
        })),
      );
    }
    return inventory.sort((a, b) => a.pageid - b.pageid);
  }

  async hydratePageCategories(working, { refresh = false } = {}) {
    if (typeof this.client.pageCategories !== 'function') return;
    const records = Object.values(working.pages);
    const ids = records
      .filter((record) => refresh || !Array.isArray(record.categories))
      .map((record) => record.pageId);
    if (!ids.length) return;
    const categories = await this.client.pageCategories(ids);
    for (const record of records) {
      const titles = categories.get(Number(record.pageId));
      if (!titles) continue;
      record.categories = titles;
      record.categoryMembership = {
        schemaVersion: CATEGORY_INDEX_SCHEMA_VERSION,
        titles,
      };
    }
    await atomicWriteJson(this.statePath, working);
  }

  async refreshPageInventory(working) {
    const previous = new Map(
      working.pageInventory.map((page) => [Number(page.pageid), page]),
    );
    const next = await this.enumeratePageInventory();
    const nextById = new Map(next.map((page) => [Number(page.pageid), page]));
    const ids = next.map((page) => Number(page.pageid));
    const current = typeof this.client.currentPageRevisions === 'function'
      ? await this.client.currentPageRevisions(ids)
      : new Map();
    const invalidated = new Set();
    const added = [];
    const changed = [];
    for (const page of next) {
      const pageId = Number(page.pageid);
      const old = previous.get(pageId);
      const revision = current.get(pageId);
      if (!old) {
        invalidated.add(pageId);
        added.push(pageId);
        continue;
      }
      if (
        old.title !== page.title ||
        Number(old.namespace) !== Number(page.namespace) ||
        Boolean(old.redirect) !== Boolean(page.redirect) ||
        (revision?.revid && Number(working.pages[String(pageId)]?.revisionId) !== revision.revid)
      ) {
        invalidated.add(pageId);
        changed.push(pageId);
      }
    }
    const removed = [...previous.keys()].filter((pageId) => !nextById.has(pageId));
    for (const pageId of removed) {
      invalidated.add(pageId);
      delete working.pages[String(pageId)];
    }
    for (const pageId of invalidated) {
      delete working.pages[String(pageId)];
    }
    working.pageInventory = next;
    working.completedPageIds = working.completedPageIds
      .map(Number)
      .filter((pageId) => nextById.has(pageId) && !invalidated.has(pageId));
    const delta = {
      previousInventory: previous.size,
      currentInventory: next.length,
      addedPageIds: added,
      changedPageIds: changed,
      removedPageIds: removed,
      invalidatedPageIds: [...invalidated].sort((a, b) => a - b),
    };
    const existingRefresh = working.refresh ?? {};
    const nonEmptyDelta = invalidated.size ? {
      ...delta,
      refreshedAt: this.now(),
    } : (existingRefresh.lastNonEmpty ?? existingRefresh.baselineDelta ?? null);
    working.refresh = {
      ...existingRefresh,
      lastRunAt: this.now(),
      previousInventory: previous.size,
      currentInventory: next.length,
      addedPageIds: added,
      changedPageIds: changed,
      removedPageIds: removed,
      invalidatedPageIds: [...invalidated].sort((a, b) => a - b),
      baselineDelta: existingRefresh.baselineDelta ?? nonEmptyDelta,
      lastNonEmpty: nonEmptyDelta,
    };
    this.logger(
      `Refreshed page inventory: ${added.length} added, ${changed.length} changed, ${removed.length} removed`,
    );
  }

  async fetchPage(item, working) {
    this.logger(`Importing page ${item.pageid}: ${item.title}`);
    const source = await this.client.pageRevision(item.pageid);
    if (!source) return { item, source: null, parsed: {}, mediaTitles: [], imageInfo: [] };
    this.logger(`Fetched revision ${source.revision.revid} for page ${item.pageid}`);
    const parsed = await this.client.parsedPage(item.pageid, source.revision.revid);
    this.logger(`Parsed revision ${source.revision.revid} for page ${item.pageid}`);
    const mediaTitles = [
      ...new Set(
        (source.images ?? [])
          .map((entry) => entry.title)
          .filter(Boolean)
          .map(mediaKey),
      ),
    ].sort((a, b) => String(a).localeCompare(String(b)));
    const existing = new Set(Object.values(working.media).map((record) => record.title));
    const imageInfo = await this.client.imageInfo(
      mediaTitles.filter((title) => !existing.has(title)),
    );
    this.logger(`Fetched ${imageInfo.length} media records for page ${item.pageid}`);
    return { item, source, parsed, mediaTitles, imageInfo };
  }

  async reconcileMissingMedia(working) {
    const unresolved = Object.values(working.media)
      .filter((record) => record.verdict === 'missing-upstream')
      .map((record) => mediaKey(record.title));
    if (!unresolved.length) return;
    this.logger(`Reconciling ${unresolved.length} unresolved media records`);
    const imageInfo = await this.client.imageInfo(unresolved);
    for (const image of imageInfo) {
      const key = mediaKey(image.title);
      const current = working.media[key];
      const replacement = this.mediaRecord(image);
      working.media[key] = current
        ? {
          ...replacement,
          referenceCount: current.referenceCount,
          filePageId: current.filePageId,
          filePageRevisionId: current.filePageRevisionId,
          filePageRevisionTimestamp: current.filePageRevisionTimestamp,
          filePageRevisionSha1: current.filePageRevisionSha1,
          filePageWikitextHash: current.filePageWikitextHash,
          filePageWikitext: current.filePageWikitext,
          rightsEvidence: current.rightsEvidence,
          scope: current.filePageId !== null
            ? current.referenceCount
              ? 'file-page-and-referenced'
              : 'file-page'
            : current.referenceCount
              ? 'referenced-only'
              : 'downloadable-only',
        }
        : replacement;
    }
    working.media = normalizeMediaState(working.media);
    await atomicWriteJson(this.statePath, working);
  }

  async refreshCategoryMembership(working) {
    const categoryTitles = [
      ...new Set(
        working.pageInventory
          .filter((page) => Number(page.namespace) === 14)
          .map((page) => page.title),
      ),
    ].sort((a, b) => a.localeCompare(b));
    const fetched = typeof this.client.categoryMembers === 'function'
      ? await this.client.categoryMembers(categoryTitles)
      : new Map();
    const pageById = new Map(
      working.pageInventory.map((page) => [Number(page.pageid), page]),
    );
    const categories = {};
    for (const categoryTitle of categoryTitles) {
      const members = fetched.get(categoryTitle) ?? [];
      categories[categoryTitle] = members
        .map((member) => {
          const pageId = Number(member.pageId);
          const page = pageById.get(pageId);
          return {
            pageId,
            title: member.title,
            namespace: Number(member.namespace),
            type: member.type ?? null,
            scope: page ? 'included' : 'out-of-scope',
            route: page
              ? canonicalRoute(page.title, page.namespace, page.pageid)
              : null,
          };
        })
        .sort((a, b) => a.pageId - b.pageId);
    }
    working.categoryIndex = {
      schemaVersion: CATEGORY_INDEX_SCHEMA_VERSION,
      source: 'MediaWiki categorymembers API',
      fetchedAt: this.now(),
      categories,
      counts: {
        categories: categoryTitles.length,
        edges: Object.values(categories).reduce((sum, members) => sum + members.length, 0),
        emptyCategories: Object.values(categories).filter((members) => !members.length).length,
        includedMembers: Object.values(categories)
          .flat()
          .filter((member) => member.scope === 'included').length,
        outOfScopeMembers: Object.values(categories)
          .flat()
          .filter((member) => member.scope === 'out-of-scope').length,
      },
    };
    await atomicWriteJson(this.statePath, working);
  }

  async rebuildMediaGraph(working) {
    this.logger(`Rebuilding media graph for ${working.pageInventory.length} frozen pages`);
    const mapping = await this.client.pageImages(
      working.pageInventory.map((page) => page.pageid),
    );
    const mediaTitles = new Set();
    const referenceCounts = new Map();
    for (const record of Object.values(working.pages)) {
      const titles = (mapping.get(Number(record.pageId)) ?? []).map(mediaKey);
      record.referencedMediaIds = [...new Set(titles)].sort((a, b) => a.localeCompare(b));
      for (const title of record.referencedMediaIds) {
        mediaTitles.add(title);
        referenceCounts.set(title, (referenceCounts.get(title) ?? 0) + 1);
      }
    }
    const mediaPageInventory = typeof this.client.allPages === 'function'
      ? await this.client.allPages(MEDIA_NAMESPACE)
      : [];
    const filePages = mediaPageInventory.map((page) => ({
      pageid: Number(page.pageid),
      title: mediaKey(page.title),
      namespace: MEDIA_NAMESPACE,
      redirect: Boolean(page.redirect),
    }));
    working.mediaPageInventory = filePages.sort((a, b) => a.pageid - b.pageid);
    const allImages = typeof this.client.allImages === 'function'
      ? await this.client.allImages()
      : [];
    const filePageByTitle = new Map(filePages.map((page) => [page.title, page]));
    const imageByTitle = new Map(allImages.map((image) => [mediaKey(image.title), image]));
    const fileRevisionById = typeof this.client.pageRevisionBatch === 'function'
      ? await this.client.pageRevisionBatch(filePages.map((page) => page.pageid))
      : new Map();
    const allTitles = new Set([
      ...mediaTitles,
      ...filePageByTitle.keys(),
      ...imageByTitle.keys(),
    ]);
    const sortedTitles = [...allTitles].sort((a, b) => a.localeCompare(b));
    const missingReferenced = sortedTitles.filter(
      (title) => mediaTitles.has(title) && !imageByTitle.has(title),
    );
    const referencedImageInfo = missingReferenced.length
      ? await this.client.imageInfo(missingReferenced)
      : [];
    for (const image of referencedImageInfo)
      imageByTitle.set(mediaKey(image.title), image);
    const nextMedia = {};
    for (const title of sortedTitles) {
      const filePage = filePageByTitle.get(title);
      const image = imageByTitle.get(title);
      const record = image
        ? this.mediaRecord(image)
        : this.missingMediaRecord(title);
      const fileRevision = filePage
        ? fileRevisionById.get(Number(filePage.pageid))
        : null;
      record.referenceCount = referenceCounts.get(title) ?? 0;
      record.filePageId = filePage?.pageid ?? null;
      record.filePageRevisionId = fileRevision?.revisionId ?? null;
      record.filePageRevisionTimestamp = fileRevision?.revisionTimestamp ?? null;
      record.filePageRevisionSha1 = fileRevision?.revisionSha1 ?? null;
      record.filePageWikitextHash = fileRevision
        ? sha256(fileRevision.wikitext ?? '')
        : null;
      record.filePageWikitext = fileRevision?.wikitext ?? null;
      record.rightsEvidence = rightsEvidence(
        fileRevision?.wikitext ?? '',
        record.verdict === 'external-embed',
      );
      record.scope = filePage && record.referenceCount
        ? 'file-page-and-referenced'
        : filePage
          ? 'file-page'
          : record.referenceCount
            ? 'referenced-only'
            : 'downloadable-only';
      nextMedia[title] = record;
    }
    working.media = normalizeMediaState(nextMedia);
    working.mediaCatalog = {
      schemaVersion: 1,
      namespace: MEDIA_NAMESPACE,
      source: {
        filePages: 'MediaWiki allpages namespace 6',
        downloadable: 'MediaWiki allimages pagination',
        fileRevisions: 'MediaWiki page revisions',
      },
      fetchedAt: this.now(),
      filePageCount: filePages.length,
      allImagesCount: allImages.length,
      downloadableRecordCount: imageByTitle.size,
      unionCount: sortedTitles.length,
      referencedCount: mediaTitles.size,
      missingReferencedCount: sortedTitles.filter(
        (title) => mediaTitles.has(title) && !imageByTitle.get(title)?.imageinfo,
      ).length,
      filePagesWithoutDownloadableBytes: filePages.filter(
        (page) => !imageByTitle.has(page.title),
      ).length,
      scopeCounts: Object.fromEntries(
        Object.entries(Object.groupBy(Object.values(working.media), (record) => record.scope))
          .map(([key, records]) => [key, records.length]),
      ),
      rightsVerdicts: Object.fromEntries(
        Object.entries(Object.groupBy(Object.values(working.media), (record) => record.rightsEvidence.verdict))
          .map(([key, records]) => [key, records.length]),
      ),
    };
    await atomicWriteJson(this.statePath, working);
  }

  articleRecord(source, parsed, sanitized, inventoryByTitle, mediaTitles = []) {
    const title = source.title;
    const categoryTitles = (parsed.categories ?? source.categories ?? [])
      .map((item) => (typeof item === 'string'
        ? item
        : item.title ?? (item.category ? `Category:${item.category}` : null)))
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b)));
    const record = {
      schemaVersion: SCHEMA_VERSION,
      pageId: Number(source.pageid),
      title,
      namespace: Number(source.ns),
      revisionId: Number(source.revision.revid),
      revisionTimestamp: source.revision.timestamp ?? null,
      wikitext: source.wikitext ?? '',
      sourceUrl:
        source.fullurl ??
        `${this.sourceUrl}/${encodeURIComponent(title.replaceAll(' ', '_'))}`,
      historyUrl: source.fullurl ? `${source.fullurl}?action=history` : null,
      route: canonicalRoute(title, Number(source.ns), Number(source.pageid)),
      redirectTarget: source.redirect
        ? (source.redirecttarget ?? redirectTargetFromWikitext(source.wikitext))
        : null,
      wikitextHash: sha256(source.wikitext ?? ''),
      htmlHash: sanitized.htmlHash,
      html: sanitized.html,
      headings: (parsed.sections ?? []).map((section) => ({
        index: section.index,
        level: Number(section.level),
        line: section.line,
        anchor: section.anchor,
        text: section.line ?? section.toclevel ?? '',
      })),
      categories: categoryTitles,
      categoryMembership: {
        schemaVersion: CATEGORY_INDEX_SCHEMA_VERSION,
        titles: categoryTitles,
      },
      internalLinks: [
        ...new Set(
          (parsed.links ?? [])
            .map((item) => (typeof item === 'string' ? item : item.title))
            .filter(Boolean),
        ),
      ]
        .sort((a, b) => String(a).localeCompare(String(b)))
        .map((linkedTitle) => ({
          title: linkedTitle,
          route: inventoryByTitle.has(linkedTitle)
            ? canonicalRoute(
                linkedTitle,
                inventoryByTitle.get(linkedTitle).namespace,
                inventoryByTitle.get(linkedTitle).pageid,
              )
            : null,
        })),
      referencedMediaIds: [
        ...new Set([
          ...sanitized.referencedMediaIds,
          ...mediaTitles.map(mediaKey),
        ]),
      ].sort((a, b) => a.localeCompare(b)),
      externalVideos: sanitized.externalVideos,
      attribution: {
        sourceTitle: title,
        sourceRevisionId: Number(source.revision.revid),
        sourcePermalink: revisionPermalink(
          source.fullurl,
          `${this.sourceUrl}/${encodeURIComponent(title.replaceAll(' ', '_'))}`,
          source.revision.revid,
        ),
        historyUrl: source.fullurl ? `${source.fullurl}?action=history` : null,
        importedAt: this.now(),
        textLicense: this.textLicense,
        transformation: 'Sanitized rendered HTML with local route rewriting',
      },
      transformationNotes: [
        'Scripts, forms, executable embeds, unsafe URLs, and tracking attributes removed.',
      ],
    };
    return record;
  }

  mediaRecord(image) {
    const info = image.imageinfo;
    if (!info || !info.url || !info.descriptionurl)
      return this.missingMediaRecord(image.title);
    const rights = extractRights(info.extmetadata);
    const reuseEligible =
      this.explicitReusableRights.has(String(rights.license).toLowerCase()) ||
      isReusableLicense(rights.license);
    const externalVideo = /^video\/(?:youtube|vimeo)$/i.test(String(info.mime ?? ''));
    const record = {
      schemaVersion: SCHEMA_VERSION,
      mediaId: mediaKey(image.title),
      title: image.title,
      route: mediaRoute(mediaKey(image.title)),
      sourceUrl: info.url ?? null,
      descriptionUrl: info.descriptionurl ?? null,
      revisionId: null,
      revisionTimestamp: info.timestamp ?? null,
      mime: info.mime ?? null,
      mediaType: info.mediatype ?? null,
      sizeBytes: Number.isFinite(info.size) ? info.size : null,
      width: Number.isFinite(info.width)
        ? info.width
        : Number.isFinite(info.dimensions?.width)
          ? info.dimensions.width
          : null,
      height: Number.isFinite(info.height)
        ? info.height
        : Number.isFinite(info.dimensions?.height)
          ? info.dimensions.height
          : null,
      sourceSha1: info.sha1 ?? null,
      sha256: null,
      rights,
      attribution: {
        artist: rights.artist ?? null,
        credit: rights.credit ?? null,
        license: rights.license ?? null,
        usageTerms: rights.usageTerms ?? null,
      },
      verdict: externalVideo ? 'external-embed' : 'source-link-only',
      immutableUrl: null,
      consentRequired: externalVideo,
      transformation: reuseEligible
        ? 'Reusable rights were identified, but this importer does not copy media bytes.'
        : 'Original bytes are not modified by the importer.',
      reuseEligible,
      referenceCount: 0,
      filePageId: null,
      filePageRevisionId: null,
      filePageRevisionTimestamp: null,
      filePageRevisionSha1: null,
      filePageWikitextHash: null,
      filePageWikitext: null,
      rightsEvidence: rightsEvidence(''),
      scope: 'referenced-only',
    };
    validateMediaRecord(record);
    return record;
  }

  missingMediaRecord(title) {
    const record = {
      schemaVersion: SCHEMA_VERSION,
      mediaId: mediaKey(title),
      title,
      route: mediaRoute(mediaKey(title)),
      sourceUrl: null,
      descriptionUrl: `${this.sourceUrl}/${encodeURIComponent(title.replaceAll(' ', '_'))}`,
      revisionId: null,
      revisionTimestamp: null,
      mime: null,
      mediaType: null,
      sizeBytes: null,
      width: null,
      height: null,
      sourceSha1: null,
      sha256: null,
      rights: {},
      attribution: {},
      verdict: 'missing-upstream',
      immutableUrl: null,
      transformation:
        'The upstream record was referenced but did not provide downloadable image information.',
      reuseEligible: false,
      referenceCount: 0,
      filePageId: null,
      filePageRevisionId: null,
      filePageRevisionTimestamp: null,
      filePageRevisionSha1: null,
      filePageWikitextHash: null,
      filePageWikitext: null,
      rightsEvidence: rightsEvidence(''),
      scope: 'referenced-only',
    };
    validateMediaRecord(record);
    return record;
  }

  buildManifest(working, { complete, startedAt }) {
    const completedIds = new Set(working.completedPageIds.map(Number));
    const pages = Object.values(working.pages).sort(
      (a, b) => a.pageId - b.pageId,
    );
    const media = Object.values(working.media).sort((a, b) =>
      a.mediaId.localeCompare(b.mediaId),
    );
    const externalVideos = [
      ...new Map(
        working.externalVideos.map((video) => [video.url, video]),
      ).values(),
    ].sort((a, b) => a.url.localeCompare(b.url));
    const categoryIndex = working.categoryIndex ?? this.derivedCategoryIndex(pages);
    const mediaCatalog = working.mediaCatalog ?? {
      schemaVersion: 1,
      namespace: MEDIA_NAMESPACE,
      source: {
        filePages: 'MediaWiki allpages namespace 6',
        downloadable: 'MediaWiki allimages pagination',
        fileRevisions: 'MediaWiki page revisions',
      },
      fetchedAt: null,
      filePageCount: 0,
      allImagesCount: 0,
      downloadableRecordCount: 0,
      unionCount: media.length,
      referencedCount: pages.flatMap((page) => page.referencedMediaIds).length,
      missingReferencedCount: 0,
      filePagesWithoutDownloadableBytes: 0,
      scopeCounts: {},
      rightsVerdicts: {},
    };
    const manifest = {
      schemaVersion: SCHEMA_VERSION,
      source: {
        baseUrl: this.sourceUrl,
        apiUrl: this.client.apiUrl,
        wikiId: working.siteInfo.wikiId,
        siteInfo: {
          ...working.siteInfo,
          fetchedAt: working.siteInfoFetchedAt ?? null,
        },
        siteInfoFetchedAt: working.siteInfoFetchedAt ?? null,
      },
      snapshot: {
        startedAt,
        finishedAt: complete ? this.now() : null,
        status: complete ? 'complete' : 'incomplete',
        namespaces: this.includeNamespaces,
        importerVersion: '2.0.0',
        previousSnapshotBoundary: working.previousSnapshotBoundary ?? null,
        refresh: {
          schemaVersion: 1,
          ...working.refresh,
        },
      },
      pages,
      media,
      externalVideos,
      categoryIndex,
      mediaCatalog,
      mediaPageInventory: (working.mediaPageInventory ?? []).sort(
        (a, b) => a.pageid - b.pageid,
      ),
      counts: {
        inventory: working.pageInventory.length,
        pages: pages.length,
        media: media.length,
        externalVideos: externalVideos.length,
        categories: Object.keys(categoryIndex.categories).length,
        categoryEdges: categoryIndex.counts.edges,
        mediaFilePages: mediaCatalog.filePageCount,
        mediaAllImages: mediaCatalog.allImagesCount,
        mediaReferenced: mediaCatalog.referencedCount,
      },
      completeness: {
        complete,
        missingPageIds: working.pageInventory
          .filter((page) => !completedIds.has(Number(page.pageid)))
          .map((page) => page.pageid),
        mediaVerdicts: Object.fromEntries(
          Object.entries(Object.groupBy(media, (record) => record.verdict)).map(
            ([key, value]) => [key, value.length],
          ),
        ),
        categoryIndex: {
          schemaVersion: CATEGORY_INDEX_SCHEMA_VERSION,
          categories: categoryIndex.counts.categories,
          edges: categoryIndex.counts.edges,
          emptyCategories: categoryIndex.counts.emptyCategories,
          includedMembers: categoryIndex.counts.includedMembers,
          outOfScopeMembers: categoryIndex.counts.outOfScopeMembers,
        },
        mediaCatalog: {
          schemaVersion: 1,
          filePageCount: mediaCatalog.filePageCount,
          allImagesCount: mediaCatalog.allImagesCount,
          unionCount: mediaCatalog.unionCount,
          referencedCount: mediaCatalog.referencedCount,
          missingReferencedCount: mediaCatalog.missingReferencedCount,
          filePagesWithoutDownloadableBytes: mediaCatalog.filePagesWithoutDownloadableBytes,
        },
      },
      contentManifestDigest: sha256(
        pages.map((page) => ({
          pageId: page.pageId,
          revisionId: page.revisionId,
          wikitextHash: page.wikitextHash,
          htmlHash: page.htmlHash,
        })),
      ),
      mediaManifestDigest: sha256(
        media.map((record) => ({
          mediaId: record.mediaId,
          sourceSha1: record.sourceSha1,
          verdict: record.verdict,
          filePageId: record.filePageId,
          filePageRevisionId: record.filePageRevisionId,
          filePageWikitextHash: record.filePageWikitextHash,
          rightsEvidence: record.rightsEvidence?.verdict ?? null,
          scope: record.scope,
          referenceCount: record.referenceCount,
        })),
      ),
    };
    return manifest;
  }

  derivedCategoryIndex(pages) {
    const categories = {};
    for (const page of pages) {
      for (const category of page.categoryMembership?.titles ?? page.categories ?? []) {
        categories[category] ??= [];
        categories[category].push({
          pageId: page.pageId,
          title: page.title,
          namespace: page.namespace,
          type: 'page',
          scope: 'included',
          route: page.route,
        });
      }
    }
    for (const members of Object.values(categories))
      members.sort((a, b) => a.pageId - b.pageId);
    return {
      schemaVersion: CATEGORY_INDEX_SCHEMA_VERSION,
      source: 'derived from ArticleRecord category membership',
      fetchedAt: null,
      categories,
      counts: {
        categories: Object.keys(categories).length,
        edges: Object.values(categories).reduce((sum, members) => sum + members.length, 0),
        emptyCategories: Object.values(categories).filter((members) => !members.length).length,
        includedMembers: Object.values(categories).flat().length,
        outOfScopeMembers: 0,
      },
    };
  }
}

function mediaKey(title) {
  const normalized = String(title).normalize('NFKC').trim();
  return /^File:/i.test(normalized)
    ? normalized.replace(/^File:/i, 'File:')
    : `File:${normalized}`;
}

function normalizeMediaState(media) {
  const normalized = {};
  for (const record of Object.values(media ?? {})) {
    const key = mediaKey(record.title ?? record.mediaId);
    const candidate = {
      ...record,
      schemaVersion: SCHEMA_VERSION,
      mediaId: key,
      title: key,
      route: mediaRoute(key),
      reuseEligible: Boolean(record.reuseEligible),
      referenceCount: Number.isInteger(record.referenceCount) ? record.referenceCount : 0,
      filePageId: Number.isInteger(record.filePageId) ? record.filePageId : null,
      filePageRevisionId: Number.isInteger(record.filePageRevisionId) ? record.filePageRevisionId : null,
      filePageRevisionTimestamp: record.filePageRevisionTimestamp ?? null,
      filePageRevisionSha1: record.filePageRevisionSha1 ?? null,
      filePageWikitextHash: record.filePageWikitextHash ?? null,
      filePageWikitext: record.filePageWikitext ?? null,
      rightsEvidence: record.rightsEvidence ?? rightsEvidence(''),
      scope: MEDIA_SCOPES.includes(record.scope)
        ? record.scope
        : (Number(record.referenceCount) > 0 ? 'referenced-only' : 'downloadable-only'),
    };
    const existing = normalized[key];
    if (!existing || (existing.verdict === 'missing-upstream' && candidate.verdict !== 'missing-upstream'))
      normalized[key] = candidate;
  }
  return normalized;
}

function extractRights(metadata = {}) {
  const value = (key) => metadata[key]?.value ?? metadata[key] ?? null;
  return {
    license: value('LicenseShortName') ?? value('License'),
    licenseUrl: value('LicenseUrl'),
    licenseVersion: value('LicenseVersion'),
    usageTerms: value('UsageTerms'),
    artist: value('Artist'),
    credit: value('Credit'),
    permission: value('Permission'),
    attribution: value('Attribution'),
  };
}

export function rightsEvidence(wikitext, externalProvider = false) {
  const text = String(wikitext ?? '');
  const templateNames = [
    ...text.matchAll(/\{\{\s*([^|}\n]+)/g),
  ]
    .map((match) => match[1].trim().replaceAll('_', ' '))
    .filter(Boolean)
    .filter((name) => !/^subst:/i.test(name))
    .sort((a, b) => a.localeCompare(b));
  const normalizedNames = templateNames.map((name) => name.toLowerCase().replaceAll(/[_-]+/g, ' '));
  let verdict = 'no-file-page-evidence';
  if (externalProvider)
    verdict = 'external-provider';
  else if (normalizedNames.some((name) => /license\s+sc|supercell|fan\s+content|content\s+policy/.test(name)))
    verdict = 'conditional-supercell-policy';
  else if (normalizedNames.some((name) => /fair\s*use|fairuse|non\s*free/.test(name)))
    verdict = 'fair-use';
  else if (normalizedNames.some((name) => /permission|authorized|authorisation/.test(name)))
    verdict = 'permission-unverified';
  else if (normalizedNames.some((name) => /self|own\s*work|authored/.test(name)))
    verdict = 'self-authored-unlicensed';
  else if (normalizedNames.some((name) => /creative\s*commons|cc\s*by|public\s*domain|gfdl|gnu\s+(?:lesser\s+)?gpl|apache|mit|bsd/.test(name)))
    verdict = 'standard-license-pending-provenance';
  return {
    schemaVersion: 1,
    verdict,
    templateNames: [...new Set(templateNames)],
    source: text.trim() ? 'file-page-current-revision' : 'none',
  };
}

function isReusableLicense(value) {
  return /cc[- ]by(?:[- ]sa)?|public domain|creative commons/i.test(
    String(value ?? ''),
  );
}

function normalizeSiteInfo(body) {
  return {
    wikiId: body.query?.general?.wikiid ?? null,
    sitename: body.query?.general?.sitename ?? null,
    generator: body.query?.general?.generator ?? null,
    namespaces: body.query?.namespaces ?? {},
    statistics: body.query?.statistics ?? {},
    rights: {
      text: body.query?.rightsinfo?.text ?? null,
      url: body.query?.rightsinfo?.url ?? null,
      version: body.query?.rightsinfo?.version ?? null,
    },
  };
}

async function writeManifest(outputDir, manifest, working) {
  await removeObsoleteJsonFiles(
    `${outputDir}/articles`,
    new Set(manifest.pages.map((record) => `${record.pageId}.json`)),
  );
  await removeObsoleteJsonFiles(
    `${outputDir}/media`,
    new Set(manifest.media.map((record) => `${sha256(record.mediaId)}.json`)),
  );
  await atomicWriteJson(`${outputDir}/snapshot-manifest.json`, manifest);
  await atomicWriteJson(
    `${outputDir}/articles.json`,
    Object.fromEntries(
      Object.values(working.pages)
        .sort((a, b) => a.pageId - b.pageId)
        .map((record) => [String(record.pageId), record]),
    ),
  );
  await atomicWriteJson(
    `${outputDir}/media-manifest.json`,
    Object.fromEntries(
      Object.values(working.media)
        .sort((a, b) => a.mediaId.localeCompare(b.mediaId))
        .map((record) => [record.mediaId, record]),
    ),
  );
  await atomicWriteJson(
    `${outputDir}/category-index.json`,
    working.categoryIndex ?? {
      schemaVersion: CATEGORY_INDEX_SCHEMA_VERSION,
      source: 'derived from ArticleRecord category membership',
      fetchedAt: null,
      categories: {},
      counts: {
        categories: 0,
        edges: 0,
        emptyCategories: 0,
        includedMembers: 0,
        outOfScopeMembers: 0,
      },
    },
  );
  for (const record of Object.values(working.pages))
    await atomicWriteJson(
      `${outputDir}/articles/${record.pageId}.json`,
      record,
    );
  for (const record of Object.values(working.media))
    await atomicWriteJson(
      `${outputDir}/media/${sha256(record.mediaId)}.json`,
      record,
    );
}

async function removeObsoleteJsonFiles(directory, expected) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.json') && !expected.has(entry.name))
      await unlink(`${directory}/${entry.name}`);
  }
}

function redirectTargetFromWikitext(wikitext) {
  const match = String(wikitext ?? '').match(
    /^\s*#redirect\s*:?\s*\[\[([^\]|#]+)/i,
  );
  return match?.[1]?.trim() ?? null;
}

function revisionPermalink(sourceUrl, fallbackUrl, revisionId) {
  const url = new URL(sourceUrl || fallbackUrl);
  url.searchParams.set('oldid', String(revisionId));
  return url.toString();
}

function mediaRoute(mediaId) {
  return `/media/${encodeURIComponent(mediaId)}`;
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function readPreviousManifest(outputDir) {
  const normalizedOutput = outputDir.replaceAll('\\', '/');
  const marker = 'content/final';
  const markerIndex = normalizedOutput.lastIndexOf(marker);
  const relativeManifest = markerIndex >= 0
    ? normalizedOutput.slice(markerIndex)
    : null;
  if (relativeManifest) {
    try {
      const result = await execFileAsync('git', ['show', `HEAD:${relativeManifest}/snapshot-manifest.json`], {
        cwd: process.cwd(),
        encoding: 'utf8',
        windowsHide: true,
      });
      return JSON.parse(result.stdout);
    } catch {
      // A non-Git output directory still gets the best available local boundary.
    }
  }
  return readJson(`${outputDir}/snapshot-manifest.json`);
}

async function atomicWriteJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporary, stableJson(value), 'utf8');
  await rename(temporary, path);
}
