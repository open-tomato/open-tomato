# @open-tomato/typescript-config

Shared TypeScript config presets for `@open-tomato/*` packages.

## Install

```bash
bun add -D @open-tomato/typescript-config
# or: npm install --save-dev @open-tomato/typescript-config
```

## Usage

Extend from one of the three presets in your `tsconfig.json`:

```jsonc
{
  "extends": "@open-tomato/typescript-config/base",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
```

Available presets:

- `@open-tomato/typescript-config/base` — library defaults (strict, ESM, bundler resolution).
- `@open-tomato/typescript-config/react` — adds React-specific compiler options.
- `@open-tomato/typescript-config/next` — extends `react` with Next.js-specific settings.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md). Follow [semver](../../VERSIONING.md).
