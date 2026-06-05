const { spawnSync } = require('node:child_process');

const mode = process.argv[2];
const extraArgs = process.argv.slice(3);

if (mode !== 'baseline' && mode !== 'diagnostic') {
  console.error('Usage: node tests/e2e/runPerformanceCommand.cjs <baseline|diagnostic> [playwright args...]');
  process.exit(1);
}

const env = {
  ...process.env,
  PERF_BASELINE: '1',
};

if (mode === 'diagnostic') {
  env.PERF_DIAGNOSTIC = '1';
}

const result = spawnSync(process.execPath, [
  require.resolve('@playwright/test/cli'),
  'test',
  'tests/e2e/performance-baseline.spec.ts',
  ...extraArgs,
], {
  env,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
