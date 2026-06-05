import fs from 'node:fs';
import path from 'node:path';
import type { Locator, Page, TestInfo } from '@playwright/test';
import { expect } from '@playwright/test';

export type PerformanceWarning = {
  id: string;
  metric: string;
  actualMs: number;
  targetMs: number;
  message: string;
};

export type InteractionTiming = {
  id: string;
  shellVisibleMs: number;
  contentReadyMs: number;
  shellBudgetMs: number;
  contentReadyBudgetMs: number;
  strictShellTargetMs: number;
  warnings: PerformanceWarning[];
};

export type ResourceSummary = {
  requestCount: number;
  imageCount: number;
  transferSizeBytes: number;
  encodedBodySizeBytes: number;
  largestResource: { name: string; initiatorType: string; sizeBytes: number; durationMs: number } | null;
};

export type PerformanceEvidence = {
  capturedAt: string;
  command: string;
  browserName: string;
  dataset: string;
  networkMode: string;
  imageMode?: string;
  budgets: Record<string, number>;
  interactions: InteractionTiming[];
  warnings: PerformanceWarning[];
  resources?: ResourceSummary;
  diagnostics?: Record<string, unknown>;
  notes?: string[];
};

export const PERFORMANCE_OUTPUT_DIR = path.join(process.cwd(), 'test-results', 'performance');

export const collectInteractionWarnings = (interactions: InteractionTiming[]): PerformanceWarning[] => {
  return interactions.flatMap(interaction => interaction.warnings);
};

export const measureInteraction = async ({
  id,
  action,
  shellLocator,
  contentReadyLocator,
  shellBudgetMs,
  contentReadyBudgetMs = shellBudgetMs,
  strictShellTargetMs = 100,
  enforceBudgets = true,
}: {
  id: string;
  action: () => Promise<void>;
  shellLocator: () => Locator;
  contentReadyLocator?: () => Locator;
  shellBudgetMs: number;
  contentReadyBudgetMs?: number;
  strictShellTargetMs?: number;
  enforceBudgets?: boolean;
}): Promise<InteractionTiming> => {
  const startedAt = Date.now();
  await action();
  await expect(shellLocator()).toBeVisible({ timeout: shellBudgetMs });
  const shellVisibleMs = Date.now() - startedAt;
  if (enforceBudgets) expect(shellVisibleMs).toBeLessThanOrEqual(shellBudgetMs);

  if (contentReadyLocator) {
    await expect(contentReadyLocator()).toBeVisible({ timeout: contentReadyBudgetMs });
  }
  const contentReadyMs = Date.now() - startedAt;
  if (enforceBudgets) expect(contentReadyMs).toBeLessThanOrEqual(contentReadyBudgetMs);

  const warnings: PerformanceWarning[] = [];
  if (shellVisibleMs > strictShellTargetMs) {
    warnings.push({
      id,
      metric: 'shellVisibleMs',
      actualMs: shellVisibleMs,
      targetMs: strictShellTargetMs,
      message: `${id} shell visible time exceeded the Phase 1 UX target of ${strictShellTargetMs} ms.`,
    });
  }
  if (!enforceBudgets && shellVisibleMs > shellBudgetMs) {
    warnings.push({
      id,
      metric: 'shellBudgetMs',
      actualMs: shellVisibleMs,
      targetMs: shellBudgetMs,
      message: `${id} exceeded the broad shell smoke budget of ${shellBudgetMs} ms in baseline mode.`,
    });
  }
  if (!enforceBudgets && contentReadyMs > contentReadyBudgetMs) {
    warnings.push({
      id,
      metric: 'contentReadyBudgetMs',
      actualMs: contentReadyMs,
      targetMs: contentReadyBudgetMs,
      message: `${id} exceeded the broad content-ready smoke budget of ${contentReadyBudgetMs} ms in baseline mode.`,
    });
  }

  return {
    id,
    shellVisibleMs,
    contentReadyMs,
    shellBudgetMs,
    contentReadyBudgetMs,
    strictShellTargetMs,
    warnings,
  };
};

export const summarizeResources = async (page: Page): Promise<ResourceSummary> => {
  return page.evaluate(() => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const entries = resources.map(entry => {
      const sizeBytes = entry.transferSize || entry.encodedBodySize || entry.decodedBodySize || 0;
      return {
        name: entry.name,
        initiatorType: entry.initiatorType,
        sizeBytes,
        encodedBodySize: entry.encodedBodySize || 0,
        durationMs: Math.round(entry.duration),
      };
    });
    const largestResource = entries.reduce<typeof entries[number] | null>((largest, entry) => {
      if (!largest || entry.sizeBytes > largest.sizeBytes) return entry;
      return largest;
    }, null);

    return {
      requestCount: resources.length,
      imageCount: entries.filter(entry => entry.initiatorType === 'img' || /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(entry.name)).length,
      transferSizeBytes: entries.reduce((sum, entry) => sum + entry.sizeBytes, 0),
      encodedBodySizeBytes: entries.reduce((sum, entry) => sum + entry.encodedBodySize, 0),
      largestResource: largestResource
        ? {
          name: largestResource.name,
          initiatorType: largestResource.initiatorType,
          sizeBytes: largestResource.sizeBytes,
          durationMs: largestResource.durationMs,
        }
        : null,
    };
  });
};

export const writePerformanceSummaryMarkdown = (evidence: PerformanceEvidence, outputPath?: string): string => {
  const warningLines = evidence.warnings.length > 0
    ? evidence.warnings.map(warning => `- ${warning.id}: ${warning.metric} ${warning.actualMs} ms exceeded target ${warning.targetMs} ms`)
    : ['- No strict UX target warnings recorded.'];

  const interactionLines = evidence.interactions.map(interaction =>
    `- ${interaction.id}: shell ${interaction.shellVisibleMs} ms, content ${interaction.contentReadyMs} ms`,
  );

  const markdown = [
    `# Performance Evidence: ${evidence.dataset} / ${evidence.networkMode}`,
    '',
    `- Captured: ${evidence.capturedAt}`,
    `- Command: ${evidence.command}`,
    `- Browser: ${evidence.browserName}`,
    `- Dataset: ${evidence.dataset}`,
    `- Network mode: ${evidence.networkMode}`,
    `- Image mode: ${evidence.imageMode ?? 'default'}`,
    '',
    '## Interactions',
    ...interactionLines,
    '',
    '## Warnings',
    ...warningLines,
    '',
  ].join('\n');

  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${markdown}\n`);
  }

  return markdown;
};

export const writePerformanceEvidence = async (
  testInfo: TestInfo,
  evidence: PerformanceEvidence,
  fileBaseName: string,
) => {
  fs.mkdirSync(PERFORMANCE_OUTPUT_DIR, { recursive: true });
  const jsonPath = path.join(PERFORMANCE_OUTPUT_DIR, `${fileBaseName}.json`);
  const markdownPath = path.join(PERFORMANCE_OUTPUT_DIR, `${fileBaseName}.md`);

  fs.writeFileSync(jsonPath, `${JSON.stringify(evidence, null, 2)}\n`);
  writePerformanceSummaryMarkdown(evidence, markdownPath);

  await testInfo.attach(fileBaseName, { path: jsonPath, contentType: 'application/json' });
  await testInfo.attach(`${fileBaseName}-summary`, { path: markdownPath, contentType: 'text/markdown' });

  return {
    jsonPath,
    markdownPath,
  };
};
