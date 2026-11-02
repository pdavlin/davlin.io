/**
 * Read-only AT Protocol record access for build-time scripts (Plane ATPROTO S-03).
 *
 * Resolves a DID to its PDS through the DID document, then reads records from that PDS
 * without auth. No PDS host is configured anywhere: if the account moves to another
 * PDS, the next build follows the DID. Writes are out of scope; the coffee service
 * writes through its own authenticated session.
 *
 * Plain ESM (like `twin-predictions/*.mjs`) so build scripts can import it under any
 * Node version without type stripping. `fetch` is injectable for unit tests.
 *
 * @module src/lib/atproto/resolve
 */

export const PLC_DIRECTORY = 'https://plc.directory';

/** How long a resolved PDS endpoint stays cached in-process. */
export const CACHE_TTL_MS = 10 * 60_000;

const TIMEOUT_MS = 10_000;
const PAGE_LIMIT = 100;

/**
 * @typedef {Object} ResolveOptions
 * @property {typeof fetch} [fetch] - Defaults to the global `fetch`.
 * @property {string} [plcDirectory] - Defaults to {@link PLC_DIRECTORY}.
 * @property {() => number} [now] - Clock for the cache, in ms. Defaults to `Date.now`.
 */

/**
 * @typedef {Object} RepoRecord
 * @property {string} uri - `at://<did>/<collection>/<rkey>`.
 * @property {string} cid
 * @property {string} rkey
 * @property {Record<string, unknown>} value
 */

/** @type {Map<string, { endpoint: string, expires: number }>} */
const cache = new Map();

/** Empties the PDS endpoint cache. For tests. */
export function clearPdsCache() {
  cache.clear();
}

/**
 * Returns the `#atproto_pds` service endpoint from a DID document, or null.
 *
 * @param {unknown} doc - A DID document.
 * @returns {string | null}
 */
export function pdsEndpoint(doc) {
  if (typeof doc !== 'object' || doc === null) return null;
  const services = /** @type {{ service?: unknown }} */ (doc).service;
  if (!Array.isArray(services)) return null;
  for (const entry of /** @type {unknown[]} */ (services)) {
    if (typeof entry !== 'object' || entry === null) continue;
    const s = /** @type {Record<string, unknown>} */ (entry);
    if (
      typeof s.id === 'string' &&
      s.id.endsWith('#atproto_pds') &&
      s.type === 'AtprotoPersonalDataServer' &&
      typeof s.serviceEndpoint === 'string'
    ) {
      return s.serviceEndpoint;
    }
  }
  return null;
}

/**
 * GETs a URL and parses the JSON body, with a timeout.
 *
 * @param {typeof fetch} fetchImpl
 * @param {string | URL} url
 * @returns {Promise<unknown>}
 */
async function getJson(fetchImpl, url) {
  const response = await fetchImpl(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`GET ${String(url)}: HTTP ${String(response.status)}`);
  }
  /** @type {unknown} */
  const body = await response.json();
  return body;
}

/**
 * Resolves a `did:plc` DID to its PDS endpoint, e.g. `https://pds.davlin.io`.
 *
 * @param {string} did
 * @param {ResolveOptions} [options]
 * @returns {Promise<string>}
 */
export async function resolvePds(did, options = {}) {
  const {
    fetch: fetchImpl = globalThis.fetch,
    plcDirectory = PLC_DIRECTORY,
    now = Date.now,
  } = options;
  if (!did.startsWith('did:plc:')) {
    throw new Error(`only did:plc DIDs are supported, got ${did}`);
  }
  const cached = cache.get(did);
  if (cached && cached.expires > now()) return cached.endpoint;

  const endpoint = pdsEndpoint(await getJson(fetchImpl, `${plcDirectory}/${did}`));
  if (!endpoint) {
    throw new Error(`${did}: DID document has no AtprotoPersonalDataServer service`);
  }
  cache.set(did, { endpoint, expires: now() + CACHE_TTL_MS });
  return endpoint;
}

/**
 * @param {unknown} raw - One entry of a listRecords/getRecord response.
 * @returns {RepoRecord}
 */
function toRepoRecord(raw) {
  const r = /** @type {{ uri?: unknown, cid?: unknown, value?: unknown }} */ (raw);
  if (typeof r.uri !== 'string' || typeof r.value !== 'object' || r.value === null) {
    throw new Error('malformed record in PDS response');
  }
  return {
    uri: r.uri,
    cid: typeof r.cid === 'string' ? r.cid : '',
    rkey: r.uri.slice(r.uri.lastIndexOf('/') + 1),
    value: /** @type {Record<string, unknown>} */ (r.value),
  };
}

/**
 * Lists every record in a collection, paging through to the end. Order is the PDS
 * default (rkey descending); callers that need an order should sort.
 *
 * @param {string} did
 * @param {string} collection - NSID, e.g. `io.davlin.coffee.shot`.
 * @param {ResolveOptions} [options]
 * @returns {Promise<RepoRecord[]>}
 */
export async function listRecords(did, collection, options = {}) {
  const { fetch: fetchImpl = globalThis.fetch } = options;
  const service = await resolvePds(did, options);
  /** @type {RepoRecord[]} */
  const records = [];
  /** @type {string | undefined} */
  let cursor;
  do {
    const url = new URL('/xrpc/com.atproto.repo.listRecords', service);
    url.searchParams.set('repo', did);
    url.searchParams.set('collection', collection);
    url.searchParams.set('limit', String(PAGE_LIMIT));
    if (cursor) url.searchParams.set('cursor', cursor);
    const page = /** @type {{ records?: unknown, cursor?: unknown }} */ (
      await getJson(fetchImpl, url)
    );
    const batch = Array.isArray(page.records) ? /** @type {unknown[]} */ (page.records) : [];
    for (const raw of batch) records.push(toRepoRecord(raw));
    cursor = batch.length > 0 && typeof page.cursor === 'string' ? page.cursor : undefined;
  } while (cursor);
  return records;
}

/**
 * Fetches one record.
 *
 * @param {string} did
 * @param {string} collection
 * @param {string} rkey
 * @param {ResolveOptions} [options]
 * @returns {Promise<RepoRecord>}
 */
export async function getRecord(did, collection, rkey, options = {}) {
  const { fetch: fetchImpl = globalThis.fetch } = options;
  const url = new URL('/xrpc/com.atproto.repo.getRecord', await resolvePds(did, options));
  url.searchParams.set('repo', did);
  url.searchParams.set('collection', collection);
  url.searchParams.set('rkey', rkey);
  return toRepoRecord(await getJson(fetchImpl, url));
}
