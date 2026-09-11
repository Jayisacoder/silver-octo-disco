import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../', import.meta.url));
function fixture(t, failures = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'learner-commit-gate-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const env = { ...process.env };
  // Tests may themselves run inside a pre-commit hook. Do not inherit its index.
  for (const key of Object.keys(env)) if (key.startsWith('GIT_')) delete env[key];
  const run = (command, args) => spawnSync(command, args, { cwd, env, encoding: 'utf8' });
  const git = (...args) => run('git', args);
  assert.equal(git('init', '-q').status, 0);
  assert.equal(git('config', 'user.name', 'Gate Test').status, 0);
  assert.equal(git('config', 'user.email', 'gate@example.invalid').status, 0);
  mkdirSync(join(cwd, 'scripts'));
  mkdirSync(join(cwd, '.githooks'));
  for (const path of ['scripts/check-before-commit.mjs', 'scripts/install-hooks.mjs', '.githooks/pre-commit']) copyFileSync(join(source, path), join(cwd, path));
  writeFileSync(join(cwd, '.gitignore'), '.test-log\n');
  writeFileSync(join(cwd, 'code.txt'), 'staged version\n');
  writeFileSync(join(cwd, 'suite.cjs'), `const fs = require('node:fs'); const cp = require('node:child_process'); const stage = process.argv[2]; fs.appendFileSync('.test-log', stage + '\\n'); if (process.env.GATE_MUTATE && stage === 'unit') { fs.writeFileSync('code.txt', 'changed by test'); if (process.env.GATE_STAGE) cp.execFileSync('git', ['add', 'code.txt']); } process.exit(Number(process.env['GATE_FAIL_' + stage.toUpperCase()] || 0));`);
  writeFileSync(join(cwd, 'package.json'), JSON.stringify({ private: true, scripts: {
    'test:unit': 'node suite.cjs unit', test: 'node suite.cjs other',
    'test:all': 'npm run test:unit && npm test', build: 'node suite.cjs build',
  } }));
  Object.assign(env, failures);
  assert.equal(run('node', ['scripts/install-hooks.mjs']).status, 0);
  assert.equal(git('add', '.').status, 0);
  return { cwd, git, run, log: () => readFileSync(join(cwd, '.test-log'), 'utf8') };
}

test('successful checks allow a real commit and run every suite then build', t => {
  const f = fixture(t);
  const result = f.git('commit', '-qm', 'Passing fixture');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(f.log(), 'unit\nother\nbuild\n');
  assert.equal(f.git('rev-parse', '--verify', 'HEAD').status, 0);
});
for (const stage of ['unit', 'other', 'build']) test(`${stage} failure blocks a real commit`, t => {
  const f = fixture(t, { ['GATE_FAIL_' + stage.toUpperCase()]: '1' });
  assert.notEqual(f.git('commit', '-qm', 'Must fail').status, 0);
  assert.notEqual(f.git('rev-parse', '--verify', 'HEAD').status, 0);
});
test('unstaged edits block commits', t => {
  const f = fixture(t);
  writeFileSync(join(f.cwd, 'code.txt'), 'unstaged fix');
  assert.notEqual(f.git('commit', '-qm', 'Must fail').status, 0);
});
test('untracked files block commits', t => {
  const f = fixture(t);
  writeFileSync(join(f.cwd, 'untracked.txt'), 'new dependency');
  assert.notEqual(f.git('commit', '-qm', 'Must fail').status, 0);
});
for (const stage of [false, true]) test(`test mutations block commits, staged=${stage}`, t => {
  const f = fixture(t, { GATE_MUTATE: '1', ...(stage ? { GATE_STAGE: '1' } : {}) });
  assert.notEqual(f.git('commit', '-qm', 'Must fail').status, 0);
});
test('installer is repeatable and preserves conflicting hooks', t => {
  const f = fixture(t);
  assert.equal(f.run('node', ['scripts/install-hooks.mjs']).status, 0);
  assert.equal(f.git('config', '--local', 'core.hooksPath', 'custom-hooks').status, 0);
  assert.notEqual(f.run('node', ['scripts/install-hooks.mjs']).status, 0);
  assert.equal(f.git('config', '--get', 'core.hooksPath').stdout.trim(), 'custom-hooks');
});

test('installer preserves an existing default pre-commit hook', t => {
  const f = fixture(t);
  assert.equal(f.git('config', '--local', '--unset', 'core.hooksPath').status, 0);
  const existing = join(f.cwd, '.git', 'hooks', 'pre-commit');
  writeFileSync(existing, '#!/bin/sh\nexit 0\n');
  assert.notEqual(f.run('node', ['scripts/install-hooks.mjs']).status, 0);
  assert.equal(readFileSync(existing, 'utf8'), '#!/bin/sh\nexit 0\n');
  assert.equal(f.git('config', '--get', 'core.hooksPath').status, 1);
});
