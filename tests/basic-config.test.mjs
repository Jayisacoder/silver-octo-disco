import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const envExample = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');

test('project scripts are configured for validation', () => {
  assert.equal(packageJson.scripts.dev, 'next dev');
  assert.equal(packageJson.scripts.build, 'next build');
  assert.equal(packageJson.scripts['test:unit'], 'node --test tests/**/*.test.mjs');
  assert.equal(packageJson.scripts.test, 'node --test tests/**/*.test.mjs');
  // test:all must keep the repository gate tests ahead of the project test command (docs/TESTING.md).
  assert.match(packageJson.scripts['test:all'], /test-architecture\.py/);
  assert.match(packageJson.scripts['test:all'], /test-commit-gate\.mjs/);
  assert.match(packageJson.scripts['test:all'], /npm run test:unit/);
  assert.match(packageJson.scripts['test:all'], /npm test\b/);
});

test('required environment variable names are documented without secrets', () => {
  assert.match(envExample, /DATABASE_URL/);
  assert.match(envExample, /GOOGLE_CLIENT_ID/);
  assert.match(envExample, /GOOGLE_CLIENT_SECRET/);
  assert.match(envExample, /NEXTAUTH_SECRET/);

  for (const line of envExample.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const value = trimmed.split('=')[1]?.trim() ?? '';
    assert.equal(value, '', `Expected blank placeholder value for ${trimmed}`);
  }
});

test('prisma schema is present for the task management feature', () => {
  const schema = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
  assert.match(schema, /datasource db/);
  assert.match(schema, /model Task/);
  assert.match(schema, /model User/);
});
