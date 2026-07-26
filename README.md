# Letterboxd dashboard

A React + Vite dashboard over a Letterboxd CSV export, with Supabase for storage.

## Setup

```bash
npm install
cp .env.example .env   # fill in the values
npm run dev
```

The app refuses to boot without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`,
rather than failing later with a confusing Supabase error.

## Credentials: what is and isn't secret

This is a static SPA, so **anything the browser needs is public.** Vite inlines
every `VITE_*` variable into the production bundle at build time. Moving a value
into `.env` keeps it out of the repo; it does not hide it from users.

| Value | Where it lives | Secret? |
|---|---|---|
| `VITE_SUPABASE_URL` | browser bundle | No — public identifier |
| `VITE_SUPABASE_ANON_KEY` | browser bundle | No — public by design; RLS is the boundary |
| `TMDB_TOKEN` | `.env`, local scripts only | **Yes** |
| `SUPABASE_SERVICE_KEY` | `.env`, local scripts only | **Yes — bypasses RLS entirely** |

Never prefix the bottom two with `VITE_`. That prefix is precisely what causes a
value to be published.

## Security model

Because the anon key is public, RLS is the only real access control:

- **anon** — read-only on every table.
- **authenticated** — read and write.

Apply it with [`supabase/schema.sql`](supabase/schema.sql), which also drops the
old `admin_password` table. Read the comments in that file before running it —
**you must disable public sign-ups**, otherwise anyone can register an account
and inherit write access.

Admin mode is a real Supabase session (`signInWithPassword`). The `isAdmin` flag
only controls which buttons render; the server enforces the actual restriction.
The previous scheme compared a hash in React state against a publicly-readable
table, so it was bypassable from devtools and irrelevant to direct API writes.

## TMDB enrichment

Film metadata (posters, directors, genres, runtime, countries, cast) comes from
TMDB via a **local** script, so the token never ships to the browser:

```bash
npm run enrich                # fetch metadata for films that lack it
npm run enrich -- --dry-run   # show what would be fetched, write nothing
npm run enrich -- --limit 25  # cap this run
npm run enrich -- --force     # re-fetch films already stored
```

It reads `pipe_data` from Supabase, finds films with no `film_metadata` row, and
upserts what it finds. It writes with the service_role key, so it works even
though RLS blocks anonymous writes. Safe to re-run: already-enriched films are
skipped, films with no TMDB match are recorded as such so they aren't retried
forever, and transient failures are left unrecorded so a later run picks them up.

This replaced an in-app "TMDB" button that shipped the read token to every
visitor.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | production build to `dist/` |
| `npm run preview` | serve the built bundle |
| `npm run lint` | ESLint |
| `npm run enrich` | TMDB metadata fetch (local only) |
