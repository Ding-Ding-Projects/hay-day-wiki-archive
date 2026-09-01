import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  canonicalRoute,
  INCLUDED_NAMESPACES,
  SCHEMA_VERSION,
  sha256,
  stableJson,
  validateArticleRecord,
  validateManifest,
  validateMediaRecord,
} from './schemas.mjs';
import { sanitizeHtml } from './sanitize.mjs';

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

  async run({ resume = true, maxPages = Infinity } = {}) {
    await mkdir(this.outputDir, { recursive: true });
    const state = resume ? await readJson(this.statePath) : null;
    const startedAt = state?.snapshot?.startedAt ?? this.now();
    const working = state ?? {
      schemaVersion: SCHEMA_VERSION,
      snapshot: { startedAt, status: 'running' },
      pageInventory: [],
      pages: {},
      media: {},
      externalVideos: [],
      completedPageIds: [],
    };
    const siteInfo = state?.siteInfo?.wikiId
      ? state.siteInfo
      : await this.client.siteInfo();
    working.siteInfo = siteInfo?.wikiId
      ? siteInfo
      : normalizeSiteInfo(siteInfo);
    this.textLicense = {
      label: working.siteInfo.rights?.text ?? null,
      url: working.siteInfo.rights?.url ?? null,
      version: working.siteInfo.rights?.version ?? null,
    };
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
    }
    working.media = normalizeMediaState(working.media);
    if (!state?.pageInventory?.length) {
      for (const namespace of this.includeNamespaces) {
        const pages = await this.client.allPages(namespace);
        working.pageInventory.push(
          ...pages.map((page) => ({
            pageid: Number(page.pageid),
            title: page.title,
            namespace,
            redirect: Boolean(page.redirect),
          })),
        );
      }
      working.pageInventory.sort((a, b) => a.pageid - b.pageid);
    }
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
    await this.reconcileMissingMedia(working);
    const completedIds = new Set(working.completedPageIds.map(Number));
    const complete = working.pageInventory.every((page) =>
      completedIds.has(Number(page.pageid)),
    );
    const manifest = this.buildManifest(working, { complete, startedAt });
    validateManifest(manifest);
    await writeManifest(this.outputDir, manifest, working);
    return manifest;
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
    for (const image of imageInfo)
      working.media[mediaKey(image.title)] = this.mediaRecord(image);
    working.media = normalizeMediaState(working.media);
    await atomicWriteJson(this.statePath, working);
  }

  articleRecord(source, parsed, sanitized, inventoryByTitle, mediaTitles = []) {
    const title = source.title;
    const record = {
      schemaVersion: SCHEMA_VERSION,
      pageId: Number(source.pageid),
      title,
      namespace: Number(source.ns),
      revisionId: Number(source.revision.revid),
      revisionTimestamp: source.revision.timestamp ?? null,
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
      categories: (parsed.categories ?? source.categories ?? [])
        .map((item) => (typeof item === 'string' ? item : item.title))
        .filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b))),
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
    };
    validateMediaRecord(record);
    return record;
  }

  missingMediaRecord(title) {
    const record = {
      schemaVersion: SCHEMA_VERSION,
      mediaId: mediaKey(title),
      title,
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
    const manifest = {
      schemaVersion: SCHEMA_VERSION,
      source: {
        baseUrl: this.sourceUrl,
        apiUrl: this.client.apiUrl,
        wikiId: working.siteInfo.wikiId,
        siteInfo: working.siteInfo,
      },
      snapshot: {
        startedAt,
        finishedAt: complete ? this.now() : null,
        status: complete ? 'complete' : 'incomplete',
        namespaces: this.includeNamespaces,
        importerVersion: '1.0.0',
      },
      pages,
      media,
      externalVideos,
      counts: {
        inventory: working.pageInventory.length,
        pages: pages.length,
        media: media.length,
        externalVideos: externalVideos.length,
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
      },
      contentManifestDigest: sha256(
        pages.map((page) => ({
          pageId: page.pageId,
          revisionId: page.revisionId,
          htmlHash: page.htmlHash,
        })),
      ),
      mediaManifestDigest: sha256(
        media.map((record) => ({
          mediaId: record.mediaId,
          sourceSha1: record.sourceSha1,
          verdict: record.verdict,
        })),
      ),
    };
    return manifest;
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
    const candidate = { ...record, mediaId: key, title: key };
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
  for (const record of Object.values(working.pages))
    await atomicWriteJson(
      `${outputDir}/articles/${record.pageId}.json`,
      record,
    );
  for (const record of Object.values(working.media))
    await atomicWriteJson(
      `${outputDir}/media/${encodeURIComponent(record.mediaId)}.json`,
      record,
    );
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

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function atomicWriteJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporary, stableJson(value), 'utf8');
  await rename(temporary, path);
}
