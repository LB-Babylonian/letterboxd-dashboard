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
//   npm run enrich -- --only "Beyond (2003)" --only "Another (2012)"   # repair named films only
//   npm run enrich -- --audit   # re-check every stored match against TMDB; writes nothing
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
// Repeatable: --only "Beyond (2003)" --only "Emmanuelle (2024)". Year is optional but recommended,
// since the ambiguous titles are exactly the ones that need repairing.
const ONLY = args.reduce((acc, a, i) => (a === '--only' && args[i + 1] ? acc.concat(args[i + 1]) : acc), []);
const AUDIT = args.includes('--audit');
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

// Mirrors parsePipe() in src/App.jsx: pipe-delimited rows, and series/shorts are excluded from
// the dashboard's taste figures so the diary pass skips them. They can still arrive through
// ratings.csv below, which is deliberate: their runtime is what lets the dashboard recognise a
// short that has no tag to give it away.
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

// TMDB ranks search results by popularity, not by how well the title matches. Taking results[0]
// therefore attaches a popular near-miss to a film with a short or common title, silently and with
// no error to notice: "Beyond" (2003), the Animatrix short, was stored as Beyond Borders -- Martin
// Campbell, 127 minutes, Drama/Romance/War -- because that outranked the EXACT title match sitting
// at results[1]. A 127-minute runtime then walked it straight past the shorts filter.
//
// So prefer an exact title match, English or original, before falling back to popularity. Accents
// and punctuation are normalised away because Letterboxd and TMDB disagree about apostrophes.
const normTitle = (s) => String(s || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[‘’'`´]/g, '')
  .replace(/[^a-z0-9]+/gi, ' ')
  .trim().toLowerCase();

function pickMatch(results, name, year) {
  if (!results || !results.length) return null;
  const want = normTitle(name);
  const sameYear = (r) => r.release_date && Math.abs(parseInt(r.release_date.slice(0, 4), 10) - year) <= 1;
  const exact = (r) => normTitle(r.title) === want || normTitle(r.original_title) === want;
  // Exact title AND the right year is the only combination worth trusting outright.
  return results.find((r) => exact(r) && sameYear(r))
    || results.find(exact)
    || results[0];
}

async function fetchOne({ name, year }) {
  const search = await tmdb(
    `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(name)}&year=${year}&language=en-US`,
  );
  const hit = pickMatch(search.results, name, year);
  if (hit && search.results[0] && hit.id !== search.results[0].id) {
    console.log(`  ${name} (${year}): took the exact title match "${hit.title}" over TMDB's top hit "${search.results[0].title}"`);
  }

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

// A wrong match announces itself nowhere. It is not an error, the row looks complete, and the
// damage shows up as a runtime, a director or a genre that is quietly somebody else's -- which
// then feeds the taste map, the director wall and the shorts filter. So: read every stored row
// back and ask TMDB what that id actually is. Titles that merely SPELL differently (Three
// Colours/Three Colors, Nausicaa filed under its dub title) are expected and reported separately
// from the ones worth acting on.
//
// Writes nothing. Run it after any large enrichment, and after importing a new ratings export.
async function audit() {
  // Which films have a diary row at all -- read from the RAW text, before parsePipe drops anything,
  // so a film logged as a series or a short still counts as logged. This mirrors loggedKeys in
  // src/App.jsx and it is the whole reason the two groups below matter so differently: a logged
  // film is excluded by its tag, so wrong metadata on it never reaches a figure. Only a film that
  // is rated and never logged has to be judged by its TMDB runtime, and only there does a wrong
  // match distort anything. Beyond (2003) was in that second group; Maid, Samuel, The Penguin and
  // Zero Day were all equally wrong and all completely harmless, being tagged series.
  const { data: pipeRow } = await sb.from('pipe_data').select('data').eq('id', 1).single();
  const logged = new Set();
  for (const l of ((pipeRow && pipeRow.data) || '').split('\n')) {
    const c = l.split('|');
    if (c[1] && c[2]) logged.add(`${c[1].trim()}|||${parseInt(c[2], 10)}`);
  }

  let rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('film_metadata')
      .select('title,year,tmdb_id,runtime,directors').range(from, from + 999);
    if (error) throw new Error(`Could not read film_metadata: ${error.message}`);
    if (!data || !data.length) break;
    rows = rows.concat(data);
    if (data.length < 1000) break;
  }
  const withId = rows.filter((r) => r.tmdb_id);
  const noId = rows.length - withId.length;
  console.log(`${rows.length} rows, ${withId.length} with a tmdb_id, ${noId} recorded as no-match.`);
  console.log('Checking each id against TMDB. This takes a couple of minutes.\n');

  const wrong = [], spelling = [], mojibake = [];
  let n = 0;
  for (const r of withId) {
    // A title that still carries mojibake was enriched from corrupted text, so the row's KEY is
    // corrupt and the dashboard — which repairs encoding before looking a film up — can never read
    // it. Listed on its own and then skipped: it is unreachable either way, and leaving it in the
    // consequential list below would put two permanent false alarms at the top of every future
    // audit, which is how a report stops being read.
    if (/[√¬â€][^\s]/.test(r.title)) { mojibake.push(r); continue; }

    let d = null;
    try { d = await tmdb(`https://api.themoviedb.org/3/movie/${r.tmdb_id}?language=en-US`); }
    catch { /* a dead id or a blip: report it as unverifiable rather than as wrong */ }
    n++;
    if (n % 200 === 0) console.log(`  ...${n}/${withId.length}`);
    await sleep(55);
    if (!d) continue;

    const want = normTitle(r.title);
    const a = normTitle(d.title), b = normTitle(d.original_title);
    const yr = d.release_date ? parseInt(d.release_date.slice(0, 4), 10) : null;
    if (want === a || want === b) continue;                       // exact, nothing to say
    wrong.push({ ...r, tmdbTitle: d.title, tmdbYear: yr, tmdbRuntime: d.runtime,
      drift: yr == null ? 0 : Math.abs(yr - r.year),
      logged: logged.has(`${r.title}|||${r.year}`) });
  }

  // Deliberately NOT split into "wrong" and "fine". The first version of this sorted on whether
  // one title contained the other, and that heuristic cuts straight across the real distinction:
  // it called "Glass Onion" -> "Glass Onion: A Knives Out Mystery" suspicious (it is correct) and
  // "Maid" -> "The Maid", "Samuel" -> "Samuel and the Light", "The Penguin" -> "The Penguin
  // Lessons" fine (all three are the wrong film). A shared prefix means nothing either way.
  //
  // So report every inexact match once and let a person judge. The year is the one genuinely
  // useful signal -- a film matched to a different year is usually a different film -- so sort by
  // it and print it, rather than pretending to a verdict this cannot reach.
  const line = (e) => {
    const flag = e.drift > 1 ? ' <== ' + e.drift + 'yr apart' : '';
    return `  ${(e.title + ' (' + e.year + ')').padEnd(44)} -> ${e.tmdbTitle} (${e.tmdbYear}), `
      + `${e.tmdbRuntime}min, ${e.directors || 'no director'}  id=${e.tmdb_id}${flag}`;
  };
  const bySuspicion = (x, y) => y.drift - x.drift || x.title.localeCompare(y.title);
  const rated = wrong.filter((e) => !e.logged).sort(bySuspicion);
  const withDiary = wrong.filter((e) => e.logged).sort(bySuspicion);

  console.log(`\n${wrong.length} of ${withId.length} rows matched a TMDB entry whose title is not identical.`);
  console.log('None of this is an error the fetch could have noticed. Judge each one; a year that');
  console.log('disagrees is the strongest hint that it is the wrong film.');

  console.log(`\n>>> ${rated.length} RATED, NEVER LOGGED -- these are the ones that can distort figures.`);
  console.log('    With no diary row there is no tag, so the TMDB runtime alone decides whether the');
  console.log('    dashboard treats it as a feature or a short. Check these first.');
  rated.length ? rated.forEach((e) => console.log(line(e))) : console.log('    (none)');

  console.log(`\n    ${withDiary.length} logged -- wrong here is inert, because a short or a series is`);
  console.log('    excluded by its diary tag and the runtime is never consulted:');
  withDiary.forEach((e) => console.log(line(e)));
  if (mojibake.length) {
    console.log(`\n${mojibake.length} row(s) keyed on a corrupted title. The dashboard repairs encoding`);
    console.log('before looking a film up, so it never reads these -- they are unreachable junk, not');
    console.log('wrong data. Safe to delete; re-enriching under the repaired title is what fixed them.');
    mojibake.forEach((e) => console.log(`  ${e.title} (${e.year})`));
  }
  console.log('\nRepair one with:  npm run enrich -- --only "Exact Stored Title (Year)"');
  console.log('Nothing was written.');
}

async function main() {
  if (AUDIT) return audit();

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

  // Every rated film too, including the ones never logged. The dashboard needs their runtime:
  // Letterboxd counts anything under 40 minutes as a short, and a short with no diary row carries
  // no tag to exclude it by, so without a runtime it cannot be told from a feature.
  const { data: ratingsRow, error: rErr } = await sb.from('ratings_data').select('data').eq('id', 1).single();
  if (rErr) throw new Error(`Could not read ratings_data: ${rErr.message}`);
  let rated = ratingsRow && ratingsRow.data;
  if (typeof rated === 'string') { try { rated = JSON.parse(rated); } catch { rated = []; } }
  for (const r of Array.isArray(rated) ? rated : []) {
    if (!r || !r.name || !r.year) continue;
    const key = `${r.name}|||${r.year}`;
    if (!unique.has(key)) unique.set(key, { name: r.name, year: r.year });
  }

  const { data: existing, error: metaErr } = await sb.from('film_metadata').select('title,year');
  if (metaErr) throw new Error(`Could not read film_metadata: ${metaErr.message}`);
  const have = new Set((existing || []).map((m) => `${m.title}|||${m.year}`));

  let todo = [...unique.entries()]
    .filter(([k]) => FORCE || !have.has(k))
    .map(([, f]) => f);

  // --only repairs named films without re-fetching the other thousand. A wrong match is invisible
  // until someone notices the consequence -- a 127-minute runtime on a 13-minute short -- so the
  // repair wants to be surgical and its output short enough to actually read.
  if (ONLY.length) {
    const want = new Set(ONLY.map((s) => s.toLowerCase()));
    todo = [...unique.values()].filter((f) => want.has(`${f.name} (${f.year})`.toLowerCase()) || want.has(String(f.name).toLowerCase()));
    const found = new Set(todo.map((f) => `${f.name} (${f.year})`.toLowerCase()));
    ONLY.filter((s) => !found.has(s.toLowerCase()) && !todo.some((f) => String(f.name).toLowerCase() === s.toLowerCase()))
      .forEach((s) => console.log(`--only "${s}": no such film in the diary, ratings or Top 50 lists`));
    console.log(`--only: ${todo.length} film(s) to re-fetch, ignoring --force/--limit`);
    if (!todo.length) return;
    if (DRY) {
      todo.forEach((f) => console.log(`  ${f.name} (${f.year})`));
      return console.log('\n--dry-run: nothing written.');
    }
    let out = [];
    for (const film of todo) {
      const row = await fetchOne(film);
      out.push(row);
      console.log(`  ${film.name} (${film.year}) -> tmdb ${row.tmdb_id}, ${row.runtime}min, ${row.directors}`);
      await sleep(120);
    }
    await flush(out);
    return console.log(`\nrewrote ${out.length} row(s).`);
  }

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
