#!/usr/bin/env node
// Create (or reset the password of) the dashboard's admin account.
//
//   npm run create-admin
//
// Prompts for email and password. The password is typed masked and is never
// written to disk, to your shell history, or to any log. Uses the service_role
// key from .env, so it works without being signed in already.
//
// This exists because admin access moved from a hash in a public database table
// to a real Supabase Auth session. There is no account until you make one.

import { createClient } from '@supabase/supabase-js';
import readline from 'node:readline';

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

function ask(question, { mask = false } = {}) {
  const { stdin, stdout } = process;
  stdout.write(question);
  if (!mask) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    return new Promise((res) => rl.question('', (a) => { rl.close(); res(a.trim()); }));
  }
  return new Promise((res) => {
    let val = '';
    stdin.setRawMode(true); stdin.resume(); stdin.setEncoding('utf8');
    const done = (out) => {
      stdin.setRawMode(false); stdin.pause();
      stdin.removeListener('data', onData);
      stdout.write('\n'); res(out);
    };
    const onData = (ch) => {
      if (ch === '\n' || ch === '\r' || ch === '\u0004') return done(val);
      if (ch === '\u0003') { stdout.write('\n'); process.exit(1); }   // ctrl-c
      if (ch === '\u007f' || ch === '\b') {                           // backspace
        if (val) { val = val.slice(0, -1); stdout.write('\b \b'); }
        return;
      }
      val += ch; stdout.write('*');
    };
    stdin.on('data', onData);
  });
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = await ask('Admin email: ');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('That does not look like an email address.');
  process.exit(1);
}

const pw = await ask('Password (min 8 chars, hidden): ', { mask: true });
if (pw.length < 8) {
  console.error('Too short — use at least 8 characters.');
  process.exit(1);
}
const pw2 = await ask('Confirm password: ', { mask: true });
if (pw !== pw2) {
  console.error('Passwords do not match. Nothing changed.');
  process.exit(1);
}

// email_confirm skips the verification email — this is your own account on your
// own project, and no mail is configured.
const { error } = await sb.auth.admin.createUser({
  email, password: pw, email_confirm: true,
});

if (!error) {
  console.log(`\nCreated ${email}. Sign in with the Admin button in the dashboard.`);
  process.exit(0);
}

const exists = /already|registered|duplicate/i.test(error.message);
if (!exists) {
  console.error(`\nCould not create the account: ${error.message}`);
  process.exit(1);
}

// Already there — reset its password instead, so this script is safe to re-run
// when you've simply forgotten it.
console.log('\nThat account already exists — resetting its password instead.');
const { data: list, error: listErr } = await sb.auth.admin.listUsers();
if (listErr) { console.error(`Could not look it up: ${listErr.message}`); process.exit(1); }
const found = (list.users || []).find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
if (!found) { console.error('Existing account could not be found. Check the Supabase dashboard.'); process.exit(1); }

const { error: updErr } = await sb.auth.admin.updateUserById(found.id, { password: pw });
if (updErr) { console.error(`Could not reset the password: ${updErr.message}`); process.exit(1); }
console.log(`Password reset for ${email}. Sign in with the Admin button in the dashboard.`);
