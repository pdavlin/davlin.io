# io.davlin.* lexicons

Schemas for the AT Protocol records that carry davlin.io content. The
authority for the `io.davlin` namespace is the davlin.io domain. Records live
in the `davlin.io` repo (`did:plc:abxkyacjszhjlgba7rsyvfoj`); this directory
is the source of truth for their shapes.

Layout follows the atproto convention: `lexicons/<nsid as path>.json`
(`io.davlin.coffee.shot` → `io/davlin/coffee/shot.json`).

## Collections

| NSID                    | Status | Purpose                                                  |
| ----------------------- | ------ | -------------------------------------------------------- |
| `io.davlin.coffee.shot` | active | One record per espresso shot, from the pd-coffee service |

Sketched, not yet designed (see Plane ATPROTO S-13): `io.davlin.now` (single
`self`-keyed now-page record), `io.davlin.nav` (site navigation),
`io.davlin.page` (page content). Design them through the rules below when
their story starts.

## Record key (rkey) rules

- Prefer a **natural key** when the source system has a stable unique id:
  writes become idempotent (re-running a backfill overwrites instead of
  duplicating). `io.davlin.coffee.shot` uses the visualizer.coffee shot UUID.
- Use the literal key `self` for singleton records (profile-style, one per
  repo).
- Use a TID only for records with no natural identity (open-ended streams
  authored directly in the repo).
- rkeys are immutable. Changing a record's key means delete + create.

## Evolution rules

- **Additive only.** New fields must be optional. Never remove, rename, or
  change the type or meaning of an existing field.
- A change that cannot be additive gets a new collection NSID (e.g.
  `io.davlin.coffee.shot2` — avoid ever needing this; it strands data).
- Readers must tolerate unknown fields.
- Check compatibility before landing schema changes:
  `goat lex breaking <old> <new>`.

## Null handling

ATProto records have no `null`. The service model's `string | null` fields
map to **omitted** fields in the record. Writers must strip nulls; readers
must treat a missing field as the service's `null`.

## Validation

- Schema files: `goat lex parse lexicons/**/*.json` and `goat lex lint …`.
- Until the schemas are published for network resolution, PDS-side validation
  cannot resolve `io.davlin.*`: writes to a PDS that enforces known lexicons
  (bsky.social does) need `validate=false` (`goat record create -n`).
  Publishing the schemas as `com.atproto.lexicon.schema` records (resolved
  via a `_lexicon.davlin.io` DNS record) is a possible follow-up, not part of
  the initial design.
