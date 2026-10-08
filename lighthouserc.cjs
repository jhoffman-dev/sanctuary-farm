// Lighthouse CI: the load budget in docs/performance-budget.md, asserted on
// the production build served by `vite preview`. `pnpm lhci` builds and runs it.
//
// Throttling is the budget's school Wi-Fi (10 Mbps down, 150 ms RTT) plus a
// 4x CPU slowdown, simulated — a laptop or CI runner is far faster than the
// reference Celeron N4000, so these numbers are a regression guard, not a
// device measurement (the monthly device run is that).
//
// The farm loads its world (three.js chunk + models) as soon as the shell is
// up, so `total-byte-weight` is the "incl. first hotspot world" line (4 MB
// ceiling). The shell-only 150 kB line is `size-limit`'s
// "first playable question" entry. Lighthouse 10+ no longer reports TTI.

const PORT = 4175

/** docs/performance-budget.md, load table: ceilings, not targets. */
const CEILINGS = {
  largestContentfulPaintMs: 4000,
  totalBlockingTimeMs: 600,
  cumulativeLayoutShift: 0.1,
  totalByteWeight: 4 * 1024 * 1024,
}

module.exports = {
  ci: {
    collect: {
      startServerCommand: `pnpm --filter @sf/web exec vite preview --port ${PORT} --strictPort`,
      startServerReadyPattern: 'Local',
      url: [`http://localhost:${PORT}/`],
      numberOfRuns: 3,
      settings: {
        // The reference Chromebook: 1366 x 768 at DPR 1.
        formFactor: 'desktop',
        screenEmulation: { mobile: false, width: 1366, height: 768, deviceScaleFactor: 1, disabled: false },
        throttlingMethod: 'simulate',
        throttling: { rttMs: 150, throughputKbps: 10 * 1024, cpuSlowdownMultiplier: 4 },
        onlyCategories: ['performance'],
      },
    },
    assert: {
      // The median of the three runs is what is asserted.
      aggregationMethod: 'median-run',
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: CEILINGS.largestContentfulPaintMs }],
        'total-blocking-time': ['error', { maxNumericValue: CEILINGS.totalBlockingTimeMs }],
        'cumulative-layout-shift': ['error', { maxNumericValue: CEILINGS.cumulativeLayoutShift }],
        'total-byte-weight': ['error', { maxNumericValue: CEILINGS.totalByteWeight }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
}
