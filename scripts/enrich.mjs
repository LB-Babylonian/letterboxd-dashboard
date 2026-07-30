#!/usr/bin/env node
// TMDB metadata enrichment — runs LOCALLY, never deployed.
//
// This used to be doEnrich() inside src/App.jsx, which meant shipping a TMDB
// read token to every visitor's browser. It was admin-only functionality, so
// there was no reason for it to live in the client at all. Moving it here keeps
// the token (and the Supabase service_role key) on your machine.
//
//   npm run enrich              # fetch metadata for films that lack it
//   npm run enrich -- --dry-run # list what would be fetched, touch nothing
//   npm run enrich -- --limit 25
//   npm run enrich -- --force   # re-fetch films already in film_metadata
//
// Reads TMDB_TOKEN, SUPABASE_URL and SUPABASE_SERVICE_KEY from .env.

import { createClient } from '@supabase/supabase-js';

const { TMDB_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

const missing = [
  ['TMDB_TOKEN', TMDB_TOKEN],
  ['SUPABASE_URL', SUPABASE_URL],
  ['SUPABASE_SERVICE_KEY', SUPABASE_SERVICE_KEY],
].filter(([, v]) => !v).map(([k]) => k);

if (missing.length) {
  console.error(`Missing in .env: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill it in. Do NOT prefix these with VITE_,');
  console.error('or they will be inlined into the browser bundle.');
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const FORCE = args.includes('--force');
const limitArg = args.indexOf('--limit');
const LIMIT = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : Infinity;

if (limitArg !== -1 && (!Number.isFinite(LIMIT) || LIMIT < 1)) {
  console.error('--limit needs a positive integer');
  process.exit(1);
}

// service_role bypasses RLS, which is why this can write while the browser cannot.
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Mirrors parsePipe() in src/App.jsx: pipe-delimited rows, and series/shorts are
// excluded from the dashboard so they don't need metadata either.
function parsePipe(raw) {
  if (!raw || !raw.trim()) return [];
  return raw.trim().split('\n')
    .filter((l) => l.trim())
    .map((l) => {
      const p = l.split('|');
      const tags = p[5] ? p[5].split(',').map((t) => t.trim()).filter(Boolean) : [];
      return { name: p[1], year: parseInt(p[2], 10), tags };
    })
    .filter((e) => e.name && !e.tags.includes('series') && !e.tags.includes('short'));
}

// TMDB rate-limits per IP; back off rather than hammering it.
async function tmdb(url, attempt = 0) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TMDB_TOKEN}`, Accept: 'application/json' },
  });
  if (res.status === 401) throw new Error('TMDB rejected the token (401). Rotate it and update .env.');
  if (res.status === 429 && attempt < 5) {
    const wait = Number(res.headers.get('retry-after') || 2) * 1000 * (attempt + 1);
    console.log(`  rate limited, waiting ${wait}ms`);
    await sleep(wait);
    return tmdb(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`TMDB ${res.status} for ${url}`);
  return res.json();
}

async function fetchOne({ name, year }) {
  const search = await tmdb(
    `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(name)}&year=${year}&language=en-US`,
  );
  const hit = search.results && search.results[0];

  // Record a null row for genuine no-matches so repeat runs skip them instead of
  // re-querying every time. Transient errors are handled by the caller and left
  // unrecorded, so they retry on the next run.
  if (!hit) {
    return {
      title: name, year, tmdb_id: null, poster: null, directors: null,
      genres: null, runtime: null, countries: null, cast_members: null,
    };
  }

  const det = await tmdb(
    `https://api.themoviedb.org/3/movie/${hit.id}?append_to_response=credits&language=en-US`,
  );
  const crew = (det.credits && det.credits.crew) || [];
  const cast = (det.credits && det.credits.cast) || [];
  const join = (arr) => (arr.length ? arr.join(', ') : null);

  return {
    title: name,
    year,
    tmdb_id: hit.id,
    // w342 rather than w92: the wall renders posters at ~94px, which is 188 device pixels on a
    // retina screen. src/App.jsx rewrites the size per slot anyway, so rows stored at the old
    // w92 render correctly too and nothing needs re-fetching — this just stops new rows being
    // written at a size nothing displays.
    poster: hit.poster_path ? `https://image.tmdb.org/t/p/w342${hit.poster_path}` : null,
    directors: join(crew.filter((c) => c.job === 'Director').map((c) => c.name)),
    genres: join((det.genres || []).map((g) => g.name)),
    runtime: det.runtime || null,
    countries: join((det.production_countries || []).map((c) => c.iso_3166_1)),
    cast_members: join(cast.slice(0, 5).map((c) => c.name)),
  };
}

async function flush(rows) {
  if (!rows.length) return;
  const { error } = await sb.from('film_metadata').upsert(rows, { onConflict: 'title,year' });
  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
}

async function main() {
  const { data: pipeRow, error: pipeErr } = await sb
    .from('pipe_data').select('data').eq('id', 1).single();
  if (pipeErr) throw new Error(`Could not read pipe_data: ${pipeErr.message}`);

  const films = parsePipe(pipeRow && pipeRow.data);
  const unique = new Map();
  for (const f of films) unique.set(`${f.name}|||${f.year}`, f);

  // Top 50 lists show posters in the Rankings tab too, and those films are not
  // necessarily in the diary (you can rank a film you never logged). Include them
  // so ranked-but-unlogged titles still get metadata.
  const { data: top50, error: t50Err } = await sb.from('top50_data').select('data');
  if (t50Err) throw new Error(`Could not read top50_data: ${t50Err.message}`);
  for (const row of top50 || []) {
    for (const fi of row.data || []) {
      if (!fi || !fi.name || !fi.year) continue;
      const key = `${fi.name}|||${fi.year}`;
      if (!unique.has(key)) unique.set(key, { name: fi.name, year: fi.year });
    }
  }

  const { data: existing, error: metaErr } = await sb.from('film_metadata').select('title,year');
  if (metaErr) throw new Error(`Could not read film_metadata: ${metaErr.message}`);
  const have = new Set((existing || []).map((m) => `${m.title}|||${m.year}`));

  let todo = [...unique.entries()]
    .filter(([k]) => FORCE || !have.has(k))
    .map(([, f]) => f);

  console.log(`${unique.size} unique films, ${have.size} already enriched, ${todo.length} to fetch`);

  if (Number.isFinite(LIMIT) && todo.length > LIMIT) {
    console.log(`--limit ${LIMIT}: fetching the first ${LIMIT}, leaving ${todo.length - LIMIT} for a later run`);
    todo = todo.slice(0, LIMIT);
  }
  if (!todo.length) return console.log('Nothing to do.');

  if (DRY) {
    todo.forEach((f, i) => console.log(`  ${i + 1}. ${f.name} (${f.year})`));
    return console.log(`\n--dry-run: nothing written. Would fetch ${todo.length} films.`);
  }

  let batch = [];
  let ok = 0, noMatch = 0;
  const failed = [];

  for (const [i, film] of todo.entries()) {
    const label = `[${i + 1}/${todo.length}] ${film.name} (${film.year})`;
    try {
      const row = await fetchOne(film);
      batch.push(row);
      if (row.tmdb_id) { ok++; console.log(`${label} -> ${row.tmdb_id}`); }
      else { noMatch++; console.log(`${label} -> no match`); }
    } catch (err) {
      // Leave unrecorded so the next run retries it.
      failed.push({ film, message: err.message });
      console.log(`${label} -> FAILED: ${err.message}`);
      if (err.message.includes('401')) break;
    }
    if (batch.length >= 20) { await flush(batch); batch = []; }
    await sleep(100);
  }
  await flush(batch);

  console.log(`\nmatched ${ok}, no match ${noMatch}, failed ${failed.length}`);
  if (failed.length) {
    console.log('Failed (not written — rerun to retry):');
    failed.forEach(({ film, message }) => console.log(`  ${film.name} (${film.year}): ${message}`));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`\n${err.message}`);
  process.exit(1);
});
