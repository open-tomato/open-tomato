# Publish guard — empty scaffold

This package is the port target for `@open-tomato/pre-components` (WS05 of
`docs/plans/poc-release/`). Until wave 0 lands the real barrel, styles, and
Storybook workbench, `src/` holds gate-passing placeholders only.

This marker keeps the package out of the publish set (`isPublishEligible`)
without flipping `private`, so the registry never sees an empty 0.6.0.

Remove this file in WS05 wave 0 when:

- the atoms/molecules port replaces `src/index.tsx` and `src/styles/*.css`
- `.storybook/` + `scripts/` exist and `"test"` is restored to the Storybook
  vitest config (`vitest run`, currently swapped for
  `vitest run --config vitest.unit.config.ts`)
- the reference-free gate (decision D4) is wired
