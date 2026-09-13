import { spawnSync } from 'node:child_process';

function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error('Cannot verify staged files. Resolve Git errors before committing.');
  return result.stdout;
}
function assertStaged() {
  if (git(['diff', '--name-only', '-z']) || git(['ls-files', '--others', '--exclude-standard', '-z'])) {
    throw new Error('Stage all intended changes and remove or ignore unrelated untracked files before committing. The tested files must match the staged files.');
  }
}
function run(args) {
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error || result.status !== 0) throw new Error(`${args.join(' ')} failed. Fix failures before committing.`);
}
try {
  assertStaged();
  const stagedTree = git(['write-tree']).trim();
  run(['run', 'test:all']);
  run(['run', 'build']);
  assertStaged();
  if (git(['write-tree']).trim() !== stagedTree) throw new Error('Tests or build changed the staged files. Review the changes, stage them, and retry.');
  console.log('Commit gate passed: all tests and the production build succeeded.');
} catch (error) {
  console.error(`Commit blocked: ${error.message}`);
  process.exit(1);
}
