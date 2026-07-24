---
"@open-tomato/ui-portal": patch
---

Fix FeatureCard to use a pure `import type` for lucide's `IconName`, so no bare
`lucide-react/dynamic` side-effect import lands in the published bundle (that
subpath isn't in lucide's exports map and breaks strict-ESM consumers).
