import { defineConfig } from '@playwright/test';

const e2ePort = process.env.E2E_PORT ?? '3010';
const baseURL = `http://localhost:${e2ePort}/my-recipes/`;
const browserChannel = process.env.E2E_BROWSER_CHANNEL;

process.env.PORT = process.env.PORT ?? e2ePort;
process.env.BROWSER = process.env.BROWSER ?? 'none';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results/e2e-artifacts',
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
  ],
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: process.env.PERF_DIAGNOSTIC === '1' ? 'on' : 'retain-on-failure',
  },
  webServer: {
    command: 'npm start',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: browserChannel ?? 'chromium',
      use: browserChannel ? { channel: browserChannel } : undefined,
    },
  ],
});
