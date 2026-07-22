import { waitForPageReady, type TestRunnerConfig } from '@storybook/test-runner';
import { toMatchImageSnapshot } from 'jest-image-snapshot';

/**
 * Visual regression layer — one PNG per story × theme, diffed against the
 * baselines of THIS environment (baselines are untracked and never cross
 * machines; CI keeps its own set via actions/cache). See
 * docs/plans/poc-release/05-ui-components-port.md (repo root) for context.
 *
 * Themes are applied exactly the way .storybook/preview.ts applies them:
 * data-theme on the document element. Tokens are pure CSS vars keyed off
 * [data-theme], so toggling the attribute re-themes the render.
 */
const THEMES = ['light', 'dark'] as const;

const customSnapshotsDir = `${process.cwd()}/visual/__image_snapshots__`;
const customDiffDir = `${process.cwd()}/visual/__diff_output__`;

// jest-image-snapshot augments the Jest matchers; expect is a Jest global
// inside the test-runner process. The shim avoids pulling Jest's global
// types into the project tsconfig.
declare const expect: {
  extend: (matchers: Record<string, unknown>) => void;
  (received: unknown): {
    toMatchImageSnapshot: (options: Record<string, unknown>) => void;
  };
};

const config: TestRunnerConfig = {
  setup() {
    expect.extend({ toMatchImageSnapshot });
  },
  async postVisit(page, context) {
    for (const theme of THEMES) {
      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t);
      }, theme);

      // Deterministic settle: network idle, fonts loaded, animations off.
      await waitForPageReady(page);
      await page.evaluate(() => document.fonts.ready);

      const image = await page.screenshot({ animations: 'disabled' });

      expect(image).toMatchImageSnapshot({
        customSnapshotsDir,
        customDiffDir,
        customSnapshotIdentifier: `${context.id}--${theme}`,
        // Near-exact: epsilon is an anti-aliasing safety valve, not a tolerance.
        failureThreshold: 0.0001,
        failureThresholdType: 'percent',
      });
    }
  },
};

export default config;
