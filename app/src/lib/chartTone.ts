import type { ChartToneName } from '../data';

/**
 * Chart tone → text-color utility, mirroring the ui-components `chartTone`
 * CVA. Charts (Sparkline, UsageChart, LineChart…) take a `tone` prop and
 * colour themselves; this is only for the page's own custom marks — e.g.
 * the spend-by-agent decoration tile, whose icon + `color-mix` tint paint
 * from `currentColor`.
 *
 * The library's `chartTone` is not re-exported from the package root (only
 * `cn` is), so the mapping is duplicated here. If the library later
 * re-exports it, this can be dropped.
 */
const CHART_TONE_CLASS: Record<ChartToneName, string> = {
  accent: 'text-accent',
  primary: 'text-primary',
  gold: 'text-gold-500',
  info: 'text-info',
  success: 'text-success',
  danger: 'text-danger',
  neutral: 'text-fg2',
  muted: 'text-fg3',
};

export const chartToneClass = (tone: ChartToneName): string => CHART_TONE_CLASS[tone];
