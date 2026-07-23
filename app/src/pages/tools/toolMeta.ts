import type { ToolType } from '../../data';
import type { BadgeProps, IconName } from '@open-tomato/ui-components';

/** ui-components `ChartTone` is not re-exported at the package root; the
    tones used here (`info`/`accent`/`primary`) are all members of it. */
type ChartTone = 'accent' | 'primary' | 'info';

export interface ToolTypeMeta {
  /** Filter/badge label ("MCP Server"). */
  label: string;
  /** Short badge word for the title pill ("MCP"). */
  short: string;
  icon: IconName;
  /** System-level accent for the type tile. */
  tone: ChartTone;
  /** Badge tone for the type pill in the title. */
  badgeTone: NonNullable<BadgeProps['tone']>;
}

/**
 * Tool type → presentation meta (label, glyph, accent). Presentation-only,
 * so it lives page-side rather than on the data contract (mirrors the WS04
 * reference TOOL_TYPE_META); keyed by the app's `ToolType` union.
 */
export const TOOL_TYPE_META: Record<ToolType, ToolTypeMeta> = {
  'api-client': { label: 'API Client', short: 'API', icon: 'file-braces-corner', tone: 'info', badgeTone: 'info' },
  'mcp-server': { label: 'MCP Server', short: 'MCP', icon: 'server', tone: 'accent', badgeTone: 'accent' },
  'skill-set': { label: 'Skills', short: 'skill', icon: 'drafting-compass', tone: 'primary', badgeTone: 'success' },
};

/** The `count` unit for the summary strip (undefined for API clients). */
export const countUnitFor = (type: ToolType): string | undefined => (type === 'mcp-server'
  ? 'tools'
  : type === 'skill-set'
    ? 'skills'
    : undefined);
