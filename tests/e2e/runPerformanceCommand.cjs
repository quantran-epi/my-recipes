const { spawnSync } = require('node:child_process');

const mode = process.argv[2];
const extraArgs = process.argv.slice(3);

if (mode !== 'baseline' && mode !== 'diagnostic' && mode !== 'phase3') {
  console.error('Usage: node tests/e2e/runPerformanceCommand.cjs <baseline|diagnostic|phase3> [playwright args...]');
  process.exit(1);
}

const env = {
  ...process.env,
};

if (mode === 'baseline' || mode === 'diagnostic') {
  env.PERF_BASELINE = '1';
}

if (mode === 'diagnostic') {
  env.PERF_DIAGNOSTIC = '1';
}

if (mode === 'phase3') {
  env.PERF_PHASE3_COMPARE = '1';
  env.PERF_DATASET = env.PERF_DATASET || 'daily';
  env.PERF_NETWORK_MODE = env.PERF_NETWORK_MODE || 'online-normal,browser-offline,mocked-slow-network';
}

const specPath = mode === 'phase3'
  ? 'tests/e2e/performance-regression.spec.ts'
  : 'tests/e2e/performance-baseline.spec.ts';

const result = spawnSync(process.execPath, [
  require.resolve('@playwright/test/cli'),
  'test',
  specPath,
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
