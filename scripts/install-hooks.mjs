import { chmodSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const current = spawnSync('git', ['config', '--get', 'core.hooksPath'], { encoding: 'utf8' });
if (current.error || ![0, 1].includes(current.status)) {
  console.error('Cannot read Git hook configuration. Run from your repository root.');
  process.exit(1);
}
if (current.stdout.trim() && current.stdout.trim() !== '.githooks') {
  console.error('An existing hooksPath is configured. Ask your instructor to integrate the commit gate without replacing your existing hooks.');
  process.exit(1);
}
if (!current.stdout.trim()) {
  const defaultHook = spawnSync('git', ['rev-parse', '--git-path', 'hooks/pre-commit'], { encoding: 'utf8' });
  if (defaultHook.error || defaultHook.status !== 0 || existsSync(defaultHook.stdout.trim())) {
    console.error('Cannot safely activate the gate over an existing default pre-commit hook. Ask your instructor to integrate the hooks.');
    process.exit(1);
  }
}
chmodSync('.githooks/pre-commit', 0o755);
const installed = spawnSync('git', ['config', '--local', 'core.hooksPath', '.githooks'], { stdio: 'inherit' });
if (installed.error || installed.status !== 0) process.exit(1);
console.log('Pre-commit test gate installed. All tests and the build must pass before commits.');
