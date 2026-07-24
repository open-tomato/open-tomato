# @open-tomato/theme-default

## 0.8.3

## 0.8.2

## 0.8.1

## 0.8.0

### Minor Changes

- adac9c4: Add the portal/marketing and docs/blog component surfaces as two new published
  packages.

  - `@open-tomato/ui-portal` — Header, Footer, Hero, CodeQuickstart, FeatureGrid,
    CommunityStrip, Landing, and BrandGlyph (the marketing surface).
  - `@open-tomato/ui-docs` — Prose, Callout, CodeBlock, DocsSidebar, DocsTOC,
    BlogIndex, BlogPost, and DocsLayout (the docs/blog surface).

  Both depend on `@open-tomato/theme-default` and `@open-tomato/ui-components` for
  shared tokens and atoms and join the fixed version group.

  Shared prerequisites landed in the existing packages: `@open-tomato/ui-components`
  gains the `Wordmark` atom and a `leaf` Badge tone (both used by the portal
  surface); `@open-tomato/theme-default` already ships the `warm-*` neutral ramp.

## 0.7.0

### Minor Changes

- da36335: WS05 waves 1+2 — the full organism/template/auth surface plus the cards & charts kit.

  New atoms: Icon (name-based lazy Lucide wrapper), StatusIndicator, TrendIndicator, the Formatted\* display family (FormattedValue/Number/Currency/Percentage/Date/RelativeTime/Duration + HumanReadableValue) and Sparkline, backed by new `lib` utilities (`format`, `chartTone`, dev warnings).

  New molecules: ConfirmPopover (standalone + inline), SectionCard, SmallStatCard, RowStatCard, UsageChart/ProgressChart, CalendarHeatmap, LineChart, FilesChanged, the CellContent kit (value, decoration, double-line, status, label, bar, tokens-consumption, spend-over-time), the KnownEntities kit (agent/session/model/task/tool/branch/user displays), PasskeyPrompt, and the ModalFooterStatus slot on Modal.

  New organisms: Table (with TableRow modifiers, RowContextAction, useRowReorder and the self-describing cell-type registry), Toolbar, FormKit (incl. VerboseOption, DecoratedToggle, ChipList, AvatarSelector), CommandPalette, and the topbar set — WorkspaceSwitcher, SearchSuggest, NotificationsBell, ThemeSwitcher, ProfileMenu.

  New templates: AppShell (data-driven SidebarNav, SidebarWeekSummary, SidebarQuickAccess, topbar collapse button, content footer) and AuthShell.

  Auth pages now ship as exported templates (decision D7): Login, SignupEmail, SignupDone, OAuthConfirm, WorkspacePick, ForgotEmail, ForgotSent, ResetCode, ResetDone and TwoFactor.

  New dependencies: `lucide-react`, `@radix-ui/react-popover`. Menu gains an `accent` item tone. 358 stories render clean; visual baselines regenerated for the full surface (the visual runner now waits for pending lazy glyphs before capturing).
