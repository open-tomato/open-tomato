---
"@open-tomato/ui-components": minor
"@open-tomato/theme-default": minor
---

WS05 waves 1+2 — the full organism/template/auth surface plus the cards & charts kit.

New atoms: Icon (name-based lazy Lucide wrapper), StatusIndicator, TrendIndicator, the Formatted\* display family (FormattedValue/Number/Currency/Percentage/Date/RelativeTime/Duration + HumanReadableValue) and Sparkline, backed by new `lib` utilities (`format`, `chartTone`, dev warnings).

New molecules: ConfirmPopover (standalone + inline), SectionCard, SmallStatCard, RowStatCard, UsageChart/ProgressChart, CalendarHeatmap, LineChart, FilesChanged, the CellContent kit (value, decoration, double-line, status, label, bar, tokens-consumption, spend-over-time), the KnownEntities kit (agent/session/model/task/tool/branch/user displays), PasskeyPrompt, and the ModalFooterStatus slot on Modal.

New organisms: Table (with TableRow modifiers, RowContextAction, useRowReorder and the self-describing cell-type registry), Toolbar, FormKit (incl. VerboseOption, DecoratedToggle, ChipList, AvatarSelector), CommandPalette, and the topbar set — WorkspaceSwitcher, SearchSuggest, NotificationsBell, ThemeSwitcher, ProfileMenu.

New templates: AppShell (data-driven SidebarNav, SidebarWeekSummary, SidebarQuickAccess, topbar collapse button, content footer) and AuthShell.

Auth pages now ship as exported templates (decision D7): Login, SignupEmail, SignupDone, OAuthConfirm, WorkspacePick, ForgotEmail, ForgotSent, ResetCode, ResetDone and TwoFactor.

New dependencies: `lucide-react`, `@radix-ui/react-popover`. Menu gains an `accent` item tone. 358 stories render clean; visual baselines regenerated for the full surface (the visual runner now waits for pending lazy glyphs before capturing).
