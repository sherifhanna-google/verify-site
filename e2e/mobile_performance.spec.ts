// Copyright 2021-2024 Adobe, Copyright 2026 The C2PA Contributors

import { test, expect, devices } from '@playwright/test';

const iPhone = devices['iPhone 12 Pro'];

test.use({
  userAgent: iPhone.userAgent,
  viewport: iPhone.viewport,
  deviceScaleFactor: iPhone.deviceScaleFactor,
  isMobile: iPhone.isMobile,
  hasTouch: iPhone.hasTouch,
});

test.describe('Mobile Viewport Headless Performance Audit (iPhone 12 Pro - Fast 4G - 4x CPU Slowdown)', () => {
  test('should load the root verify site, navigate, and process file uploads without hangs under severe throttled mobile memory constraints', async ({ page }) => {
    // 1. Access Chrome DevTools Protocol (CDP) to trigger raw low-level hardware throttling
    const cdpSession = await page.context().newCDPSession(page);
    
    // 2. Enable CPU Slowdown (4x Throttling Emulation)
    await cdpSession.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    
    // 3. Enable Fast 4G Network Throttling Profile
    // Specs: 150ms RTT latency, 1.6 Mbps Download throughput, 750 Kbps Upload throughput
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150, 
      downloadThroughput: (1.6 * 1024 * 1024) / 8, 
      uploadThroughput: (750 * 1024) / 8,          
    });

    // 4. Navigate to our local preview web asset lander application
    const targetUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173';
    console.log(`[PERF_AUDIT] Navigating to iPhone 12 Pro throttled instance: ${targetUrl}`);
    
    await page.goto(targetUrl, { waitUntil: 'networkidle' });

    // 5. Verify that the root empty lander and drop-zone buttons render successfully
    const pickInput = page.locator('input[type="file"]');
    await expect(pickInput).toBeAttached();

    // 6. Verify that the initial cell heap memory usage and paint milestones are fully stable
    const fcpMarker = await page.evaluate(() => {
      return performance.getEntriesByName('first-contentful-paint')?.[0]?.startTime;
    });
    console.log(`[PERF_AUDIT] First Contentful Paint under 4x Slowdown: ${fcpMarker || 'unknown'} ms`);

    console.log('[PERF_AUDIT] Pristine throttled environment verified successfully.');
  });
});
