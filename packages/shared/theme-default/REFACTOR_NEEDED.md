# Publish guard — empty scaffold

Target package for the theming split (decision D3, WS05 wave 0 in
`docs/plans/poc-release/05-ui-components-port.md`): Tailwind tokens + preset
extracted from `component-breakdown/src/styles/` land here, consumed by all
`@open-tomato/ui-*` packages and apps.

Lives under `packages/shared/` (not `packages/ui/`) so the naming convention
yields `@open-tomato/theme-default` — the `ui` group prefixes `ui-` onto
package names, and the theme is consumed by apps as well as ui packages.

This marker keeps the package out of the publish set until it has content.
Remove it in WS05 wave 0 alongside the ui-components marker. Keep the version
in the fixed changeset group with ui-components/ui-portal/ui-docs (D2).
