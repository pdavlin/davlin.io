/**
 * Network smoke test for the S-03 resolver: resolves the site DID to its PDS through
 * plc.directory (no host configured) and lists one `app.bsky.feed.post` record from it.
 * Exits non-zero on any failure. Not part of `pnpm test`, because it needs the network.
 *
 * Usage:
 *   pnpm smoke:atproto
 *   ATPROTO_DID=did:plc:... pnpm smoke:atproto
 *
 * @module scripts/atproto-smoke
 */

import { clearPdsCache, getRecord, listRecords, resolvePds } from '../src/lib/atproto/resolve.mjs';
import { SITE_DID } from '../src/lib/atproto/site.mjs';

const did = process.env.ATPROTO_DID ?? SITE_DID;
const collection = 'app.bsky.feed.post';

clearPdsCache();
const pds = await resolvePds(did);
console.log(`resolved ${did} -> ${pds}`);

const posts = await listRecords(did, collection);
const first = posts.at(0);
if (!first) {
  throw new Error(`no ${collection} records for ${did}`);
}
const again = await getRecord(did, collection, first.rkey);
if (again.cid !== first.cid) {
  throw new Error(`getRecord returned cid ${again.cid}, listRecords had ${first.cid}`);
}
console.log(`listed ${String(posts.length)} ${collection} records; newest ${first.uri}`);
