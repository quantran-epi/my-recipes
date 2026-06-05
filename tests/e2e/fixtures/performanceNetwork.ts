import type { Page, Request } from '@playwright/test';

export type PerformanceNetworkMode = 'online-normal' | 'browser-offline' | 'mocked-slow-network';
export type PerformanceImageMode = 'fast' | 'slow' | 'blocked';

export type PerformanceNetworkOptions = {
  networkMode?: PerformanceNetworkMode;
  imageMode?: PerformanceImageMode;
  realNetwork?: boolean;
  githubDelayMs?: number;
  imageDelayMs?: number;
};

export type AppliedPerformanceNetworkMode = {
  networkMode: PerformanceNetworkMode;
  imageMode?: PerformanceImageMode;
  realNetwork: boolean;
  githubDelayMs: number;
  imageDelayMs: number;
};

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isGitHubRawUrl = (url: string) => url.startsWith('https://raw.githubusercontent.com/');

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
  const imageDelayMs = options.imageDelayMs ?? (imageMode === 'slow' ? 1200 : 0);

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
      if (githubDelayMs > 0) await delay(githubDelayMs);
      await route.fulfill({ status: 404, contentType: 'text/plain', body: '' });
      return;
    }

    if (imageMode && isExternal && isImageRequest(request)) {
      if (imageMode === 'blocked') {
        await route.abort('blockedbyclient');
        return;
      }
      if (imageDelayMs > 0) await delay(imageDelayMs);
      await route.fulfill({ status: 200, contentType: 'image/png', body: transparentPng });
      return;
    }

    await route.continue();
  });

  return { networkMode, imageMode, realNetwork, githubDelayMs, imageDelayMs };
};
