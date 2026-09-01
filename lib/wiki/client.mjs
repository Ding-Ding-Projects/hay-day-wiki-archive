const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export class MediaWikiClient {
  constructor({
    apiUrl = 'https://hayday.fandom.com/api.php',
    fetchImpl = globalThis.fetch,
    userAgent = 'HayDayWikiArchiveImporter/1.0 (+https://github.com/Ding-Ding-Projects/hay-day-wiki-archive)',
    concurrency = 3,
    maxRetries = 5,
    baseDelayMs = 500,
  } = {}) {
    if (typeof fetchImpl !== 'function')
      throw new Error('A fetch implementation is required');
    this.apiUrl = apiUrl;
    this.fetchImpl = fetchImpl;
    this.userAgent = userAgent;
    this.maxRetries = maxRetries;
    this.baseDelayMs = baseDelayMs;
    this.limiter = new RateLimiter(concurrency);
  }

  async query(params, { signal } = {}) {
    const url = new URL(this.apiUrl);
    for (const [key, value] of Object.entries({
      format: 'json',
      formatversion: '2',
      ...params,
    })) {
      if (value !== undefined && value !== null)
        url.searchParams.set(key, String(value));
    }
    return this.limiter.run(async () => {
      for (let attempt = 0; ; attempt += 1) {
        let response;
        try {
          response = await this.fetchImpl(url, {
            headers: {
              accept: 'application/json',
              'user-agent': this.userAgent,
            },
            signal,
          });
        } catch (error) {
          if (attempt >= this.maxRetries)
            throw new Error(
              `MediaWiki request failed after ${attempt + 1} attempts: ${error.message}`,
              { cause: error },
            );
          await sleep(this.delay(attempt));
          continue;
        }
        if (!response.ok) {
          if (
            !RETRYABLE_STATUS.has(response.status) ||
            attempt >= this.maxRetries
          ) {
            throw new Error(
              `MediaWiki request returned HTTP ${response.status} for ${url.pathname}`,
            );
          }
          const retryAfter = Number(response.headers.get('retry-after'));
          await sleep(
            Number.isFinite(retryAfter)
              ? Math.max(this.delay(attempt), retryAfter * 1000)
              : this.delay(attempt),
          );
          continue;
        }
        const body = await response.json();
        if (body?.error)
          throw new Error(
            `MediaWiki API error ${body.error.code ?? 'unknown'}: ${body.error.info ?? 'no details'}`,
          );
        return body;
      }
    });
  }

  delay(attempt) {
    return Math.min(30_000, this.baseDelayMs * 2 ** attempt);
  }

  async siteInfo() {
    return this.query({
      action: 'query',
      meta: 'siteinfo',
      siprop: 'general|namespaces|rightsinfo|statistics',
    });
  }

  async allPages(namespace) {
    const pages = [];
    let apcontinue;
    do {
      const body = await this.query({
        action: 'query',
        list: 'allpages',
        apnamespace: namespace,
        aplimit: 'max',
        apfilterredir: 'all',
        apcontinue,
      });
      pages.push(...(body.query?.allpages ?? []));
      apcontinue = body.continue?.apcontinue;
    } while (apcontinue);
    return pages.sort((a, b) => Number(a.pageid) - Number(b.pageid));
  }

  async pageRevision(pageId) {
    const params = {
      action: 'query',
      pageids: pageId,
      prop: 'info|revisions|categories|links|images|templates',
      inprop: 'url',
      rvprop: 'ids|timestamp|sha1|content|contentmodel',
      rvslots: 'main',
      rvlimit: 1,
      cllimit: 'max',
      pllimit: 'max',
      imlimit: 'max',
      tllimit: 'max',
    };
    let page;
    let continuation;
    do {
      const body = await this.query({ ...params, ...continuation });
      const current = Object.values(body.query?.pages ?? {})[0];
      if (!current) return null;
      if (!page) page = { ...current };
      else {
        for (const field of ['categories', 'links', 'images', 'templates']) {
          page[field] = [...(page[field] ?? []), ...(current[field] ?? [])];
        }
      }
      continuation = body.continue;
    } while (continuation);
    if (!page || page.missing) return null;
    const revision = page.revisions?.[0];
    if (!revision) throw new Error(`Page ${pageId} has no current revision`);
    return {
      ...page,
      revision,
      wikitext: revision.slots?.main?.content ?? revision.content ?? '',
    };
  }

  async parsedPage(pageId, revisionId) {
    const body = await this.query({
      action: 'parse',
      oldid: revisionId,
      prop: 'text|sections|categories|links|images|externallinks',
      disableeditsection: 1,
    });
    if (body.parse?.pageid !== undefined && Number(body.parse.pageid) !== Number(pageId)) {
      throw new Error(`Parsed revision ${revisionId} resolved to unexpected page ${body.parse.pageid}`);
    }
    return body.parse ?? {};
  }

  async imageInfo(titles) {
    const unique = [...new Set(titles)].sort((a, b) =>
      String(a).localeCompare(String(b)),
    );
    if (!unique.length) return [];
    const records = [];
    for (let index = 0; index < unique.length; index += 50) {
      const body = await this.query({
        action: 'query',
        titles: unique.slice(index, index + 50).join('|'),
        prop: 'imageinfo',
        iiprop: 'url|size|mime|sha1|dimensions|timestamp|mediatype|extmetadata',
      });
      records.push(
        ...Object.values(body.query?.pages ?? {}).map((page) => ({
          ...page,
          imageinfo: page.imageinfo?.[0] ?? null,
        })),
      );
    }
    return records;
  }
}

class RateLimiter {
  constructor(concurrency) {
    this.queue = [];
    this.active = 0;
    this.concurrency = Math.max(1, Math.min(10, Number(concurrency) || 1));
  }

  run(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.pump();
    });
  }

  pump() {
    while (this.active < this.concurrency && this.queue.length) {
      const item = this.queue.shift();
      this.active += 1;
      Promise.resolve()
        .then(item.task)
        .then(item.resolve, item.reject)
        .finally(() => {
          this.active -= 1;
          this.pump();
        })
        .catch((error) => item.reject(error));
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
