# @open-tomato/theme-default

Default theme for the `@open-tomato/ui-*` packages, per the theming split
(decision D3, `docs/plans/poc-release/05-ui-components-port.md`):

- `tokens.css` — **the default theme definition**: semantic variables
  (`--bg`, `--fg1`, `--primary`, …) for light + dark, plus element-level
  typography defaults. Overridable: redefine the semantic variables after
  importing to re-theme every ui package at once.
- `fonts.css` — type-face source (Google Fonts today). Kept separate so a
  consumer can swap it (e.g. self-hosted files) without touching the theme.

The **component contract** (`theme.css`, the variable→Tailwind-utility
mapping) is *not* here — it ships inside `@open-tomato/ui-components` and is
not meant to be overridden.

Note: the element-level defaults (`h1`–`h6`, `p`, `a`, `code`, …) are wrapped
in `@layer base`, so Tailwind utilities win over them without `!` important
modifiers (fixes an unlayered-cascade gotcha in the original token sheet;
existing `!` workarounds keep working). See the porting notes in
`docs/plans/poc-release/05-ui-components-port.md`.

Versioned in a fixed changeset group with the `@open-tomato/ui-*` packages
(decision D2).
