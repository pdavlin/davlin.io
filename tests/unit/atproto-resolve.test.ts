import { describe, it, expect, beforeEach } from 'vitest';
import {
  CACHE_TTL_MS,
  clearPdsCache,
  getRecord,
  listRecords,
  pdsEndpoint,
  resolvePds,
} from '../../src/lib/atproto/resolve.mjs';

const DID = 'did:plc:abc123';

function didDoc(endpoint: string) {
  return {
    id: DID,
    service: [
      { id: '#other', type: 'Something', serviceEndpoint: 'https://wrong.example' },
      { id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: endpoint },
    ],
  };
}

/** Fake fetch serving fixed JSON by URL prefix, and recording every requested URL. */
function fakeFetch(routes: Record<string, (url: URL) => unknown>) {
  const calls: string[] = [];
  const impl = (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    calls.push(url.toString());
    const route = Object.keys(routes).find((prefix) => url.toString().startsWith(prefix));
    if (!route) return Promise.resolve(new Response('not found', { status: 404 }));
    const body = routes[route](url);
    return Promise.resolve(Response.json(body));
  };
  return { fetch: impl, calls };
}

beforeEach(() => {
  clearPdsCache();
});

describe('pdsEndpoint', () => {
  it('picks the atproto_pds service', () => {
    expect(pdsEndpoint(didDoc('https://pds.example'))).toBe('https://pds.example');
  });

  it('returns null without one', () => {
    expect(pdsEndpoint({ service: [] })).toBeNull();
    expect(pdsEndpoint(null)).toBeNull();
  });
});

describe('resolvePds', () => {
  it('discovers the host from the DID document and caches it for the TTL', async () => {
    let now = 0;
    const { fetch, calls } = fakeFetch({
      [`https://plc.directory/${DID}`]: () => didDoc('https://pds.example'),
    });
    const options = { fetch, now: () => now };

    expect(await resolvePds(DID, options)).toBe('https://pds.example');
    now = CACHE_TTL_MS - 1;
    await resolvePds(DID, options);
    expect(calls).toHaveLength(1);

    now = CACHE_TTL_MS + 1;
    await resolvePds(DID, options);
    expect(calls).toHaveLength(2);
  });

  it('rejects non-plc DIDs and documents without a PDS', async () => {
    const { fetch } = fakeFetch({ [`https://plc.directory/${DID}`]: () => ({ service: [] }) });
    await expect(resolvePds('did:web:example.com', { fetch })).rejects.toThrow(/did:plc/);
    await expect(resolvePds(DID, { fetch })).rejects.toThrow(/no AtprotoPersonalDataServer/);
  });
});

describe('listRecords', () => {
  it('pages through every record on the resolved host', async () => {
    const pages: Record<string, { cursor?: string; records: unknown[] }> = {
      '': { cursor: 'c1', records: [{ uri: `at://${DID}/x.y/b`, cid: 'cb', value: { n: 2 } }] },
      c1: { cursor: 'c2', records: [{ uri: `at://${DID}/x.y/a`, cid: 'ca', value: { n: 1 } }] },
      c2: { records: [] },
    };
    const { fetch, calls } = fakeFetch({
      [`https://plc.directory/${DID}`]: () => didDoc('https://moved.example'),
      'https://moved.example/xrpc/com.atproto.repo.listRecords': (url) =>
        pages[url.searchParams.get('cursor') ?? ''],
    });

    const records = await listRecords(DID, 'x.y', { fetch });

    expect(records.map((r) => [r.rkey, r.value])).toEqual([
      ['b', { n: 2 }],
      ['a', { n: 1 }],
    ]);
    expect(calls.filter((c) => c.includes('listRecords'))).toHaveLength(3);
  });
});

describe('getRecord', () => {
  it('fetches one record by rkey', async () => {
    const { fetch } = fakeFetch({
      [`https://plc.directory/${DID}`]: () => didDoc('https://pds.example'),
      'https://pds.example/xrpc/com.atproto.repo.getRecord': (url) => ({
        uri: `at://${DID}/x.y/${url.searchParams.get('rkey') ?? ''}`,
        cid: 'c',
        value: { ok: true },
      }),
    });
    const record = await getRecord(DID, 'x.y', 'self', { fetch });
    expect(record.rkey).toBe('self');
    expect(record.value).toEqual({ ok: true });
  });
});
