/**
 * Runs every test in the project on Node's built-in runner.
 *
 * Deliberately dependency-free: `npm test` here needs nothing installed, so a
 * reviewer can verify this work without a successful `npm install` first.
 */
import { spawnSync } from 'node:child_process';
import { globSync } from 'node:fs';

const files = globSync('src/**/*.test.ts', { cwd: import.meta.dirname });
if (files.length === 0) {
  console.error('No test files found.');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...files], {
  cwd: import.meta.dirname,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
