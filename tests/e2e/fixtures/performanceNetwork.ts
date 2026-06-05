import type { Page, Request } from '@playwright/test';

export type PerformanceNetworkMode = 'online-normal' | 'browser-offline' | 'mocked-slow-network';
export type PerformanceImageMode = 'fast' | 'slow' | 'blocked';

export type PerformanceNetworkOptions = {
  networkMode?: PerformanceNetworkMode;
  imageMode?: PerformanceImageMode;
  realNetwork?: boolean;
  githubDelayMs?: number;
  sharedDataDelayMs?: number;
  imageDelayMs?: number;
  githubStatus?: number;
  sharedManifest?: unknown;
  sharedData?: unknown;
};

export type PerformanceNetworkDiagnostics = {
  githubRawRequestCount: number;
  sharedManifestRequestCount: number;
  sharedDataRequestCount: number;
  imageRequestCount: number;
  blockedImageRequestCount: number;
  delayedImageRequestCount: number;
};

export type AppliedPerformanceNetworkMode = {
  networkMode: PerformanceNetworkMode;
  imageMode?: PerformanceImageMode;
  realNetwork: boolean;
  githubDelayMs: number;
  sharedDataDelayMs: number | null;
  imageDelayMs: number;
  diagnostics: PerformanceNetworkDiagnostics;
};

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isGitHubRawUrl = (url: string) => url.startsWith('https://raw.githubusercontent.com/');

const isSharedManifestUrl = (url: string) => {
  try {
    return new URL(url).pathname.endsWith('/docs/shared-manifest.json');
  } catch {
    return false;
  }
};

const isSharedDataUrl = (url: string) => {
  try {
    return new URL(url).pathname.endsWith('/docs/shared-data.json');
  } catch {
    return false;
  }
};

const isLocalUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  } catch {
    return false;
  }
};

const isExternalHttpUrl = (url: string) => /^https?:\/\//i.test(url) && !isLocalUrl(url);

const isImageRequest = (request: Request) => {
  const url = request.url();
  return request.resourceType() === 'image'
    || /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(url)
    || /images\.unsplash\.com/i.test(url);
};

const defaultImageMode = (networkMode: PerformanceNetworkMode): PerformanceImageMode | undefined => {
  if (networkMode === 'browser-offline') return 'blocked';
  if (networkMode === 'mocked-slow-network') return 'slow';
  return undefined;
};

export const applyPerformanceNetworkMode = async (
  page: Page,
  options: PerformanceNetworkOptions = {},
): Promise<AppliedPerformanceNetworkMode> => {
  const networkMode = options.networkMode ?? 'online-normal';
  const imageMode = options.imageMode ?? defaultImageMode(networkMode);
  const realNetwork = options.realNetwork ?? process.env.PERF_REAL_NETWORK === '1';
  const githubDelayMs = options.githubDelayMs ?? (networkMode === 'mocked-slow-network' ? 1500 : 0);
  const sharedDataDelayMs = options.sharedDataDelayMs ?? null;
  const imageDelayMs = options.imageDelayMs ?? (imageMode === 'slow' ? 1200 : 0);
  const githubStatus = options.githubStatus ?? 200;
  const diagnostics: PerformanceNetworkDiagnostics = {
    githubRawRequestCount: 0,
    sharedManifestRequestCount: 0,
    sharedDataRequestCount: 0,
    imageRequestCount: 0,
    blockedImageRequestCount: 0,
    delayedImageRequestCount: 0,
  };

  if (networkMode === 'browser-offline') {
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        get: () => false,
      });
      window.addEventListener('DOMContentLoaded', () => window.dispatchEvent(new Event('offline')), { once: true });
    });
  }

  await page.route('**/*', async route => {
    const request = route.request();
    const url = request.url();
    const isExternal = isExternalHttpUrl(url);

    if (networkMode === 'browser-offline' && isExternal) {
      await route.abort('internetdisconnected');
      return;
    }

    if (isGitHubRawUrl(url) && !realNetwork) {
      diagnostics.githubRawRequestCount += 1;
      if (isSharedManifestUrl(url)) diagnostics.sharedManifestRequestCount += 1;
      if (isSharedDataUrl(url)) diagnostics.sharedDataRequestCount += 1;
      const requestDelayMs = isSharedDataUrl(url) && sharedDataDelayMs !== null ? sharedDataDelayMs : githubDelayMs;
      if (requestDelayMs > 0) await delay(requestDelayMs);
      if (isSharedManifestUrl(url) && options.sharedManifest !== undefined) {
        await route.fulfill({ status: githubStatus, contentType: 'application/json', body: JSON.stringify(options.sharedManifest) });
        return;
      }
      if (isSharedDataUrl(url) && options.sharedData !== undefined) {
        await route.fulfill({ status: githubStatus, contentType: 'application/json', body: JSON.stringify(options.sharedData) });
        return;
      }
      await route.fulfill({ status: 404, contentType: 'text/plain', body: '' });
      return;
    }

    if (imageMode && isExternal && isImageRequest(request)) {
      diagnostics.imageRequestCount += 1;
      if (imageMode === 'blocked') {
        diagnostics.blockedImageRequestCount += 1;
        await route.abort('blockedbyclient');
        return;
      }
      if (imageDelayMs > 0) {
        diagnostics.delayedImageRequestCount += 1;
        await delay(imageDelayMs);
      }
      await route.fulfill({ status: 200, contentType: 'image/png', body: transparentPng });
      return;
    }

    await route.continue();
  });

  return { networkMode, imageMode, realNetwork, githubDelayMs, sharedDataDelayMs, imageDelayMs, diagnostics };
};
