/**
 * Compact number formatting for page-level string interpolation.
 *
 * The ui-components library formats numbers via its own `formatNumber`
 * (and the `HumanReadableValue` / `Formatted*` components), but only `cn`
 * is re-exported from the package root — `formatNumber` is not. Where a
 * page needs a compact string inside a template literal (not a node), this
 * mirrors the library's `formatNumber(value, { short: true })` exactly:
 * `Intl.NumberFormat` compact notation, max 1 fraction digit.
 *
 * Prefer the exported `HumanReadableValue` component wherever a node is
 * acceptable; reach for this only for string contexts.
 */
export const formatCompact = (value: number, locale = 'en-US'): string => new Intl.NumberFormat(locale, {
  notation: 'compact',
  maximumFractionDigits: 1,
}).format(value);
