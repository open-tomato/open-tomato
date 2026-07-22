# @open-tomato/cli-core

## 0.2.1

### Patch Changes

- 6176954: docs(phase-8): release notes capturing registry-cut versions committed (9a86d05)
- a50fd09: Verified @open-tomato/cli-core 0.2.0 tarball downloads from heimdall registry via npm pack --dry-run

## 0.2.0

### Minor Changes

- f33ed42: cli-core: initial 0.1.0 release — types, CliEvent union, CliOutput, parseArgs, assembleContext

  Part of Phase 8 registry cut — see plans/phase-8/.

### Patch Changes

- 5d26d40: verify publish:dry tarball staging + publint validation pass
- b7b5b52: cli-core: register workspace via bun install
- 5f337e0: cli-core -- assembleContext test coverage for outputMode precedence, verbosity clamping, and frozen result
- 8308212: tick checkbox — cli-core minor changeset already pending (cli-core-5ad1bb85.md) for 0.1.0 initial release
- 16e8b74: cli-core parseArgs accepts --flag=value syntax
- 5a9b9bb: cli-core: add createTextOutput verbosity-0 test suppressing debug/info while emitting warn/error/result
- 18d8f39: test createJsonOutput emits exactly one NDJSON line per call and result event uses type result
- 8dd44d6: verify publish:local pushes cli-core to private registry
- be000e7: cli-core -- confirm Object.freeze on assembled CliContext
- 8479c79: cli-core: confirm verbosity resolution from -v/--verbose count and TOMATO_VERBOSITY env
- 9c273e1: cli-core: add CliContext interface in src/types.ts
- 931c7d8: cli-core: edge-case tests for repeated flags and missing flag values in parseArgs
- 18f94c8: cli-core: implement createJsonOutput emitting NDJSON CliEvents
- 73b3d3a: cli-core -- confirm flags Object.freeze blocks mutation in strict mode
- 9b0578e: cli-core: implement createTextOutput with verbosity gating
- ecd6935: platform-core: add README documenting PlatformPlugin contract and example skeleton
- 44e5f4d: cli-core: add src/index.ts public barrel re-exporting types and helpers
- 422a29b: cli-core -- confirm signal defaults to a fresh AbortSignal when not provided
- 5993373: cli-core: confirm CliOutput instantiation based on outputMode and verbosity
- 5233cce: cli-core: scaffold parseArgs with positional/flags signature
- 0199f29: cli-core parseArgs support for short alias -f value and -f=value
- 34f360a: cli-core: add JSON round-trip tests for every CliEvent variant
- a055fd3: cli-core: support -- end-of-flags marker in parseArgs (everything after -- is positional)
- f80a59b: phase-8: append Phase 8 grouping note to cli-core, platform-core, vault, and config minor changesets
- 0642dc5: cli-core -- verify preflight passes for new package
- d774a7d: cli-core: declare CliOutput interface with info/warn/error/debug/emit/result methods
- c283ceb: cli-core: add CliEvent discriminated union with start/step/log/result variants and ISO-8601 ts fields
- a637f2a: cli-core: ArgSpec and FlagSpec interfaces
- 4ffe6af: cli-core parseArgs --no-flag negation support
- 6561fe2: cli-core: add package.json scaffold for @open-tomato/cli-core
- 342f887: cli-core: add tsconfig.json extending shared base config
- 19d8ef8: cli-core parseArgs --flag value (space-separated) support
- 954bc63: cli-core parseArgs: bare --flag sets boolean true
- 1f35948: cli-core: add eslint.config.mjs re-exporting @open-tomato/eslint-config/base
- 4191e9b: cli-core: add CliCommand interface
- 775b274: cli-core: add assembleContext that parses argv, resolves output mode and verbosity, and returns a frozen CliContext
- 3aba79b: cli-core: outputMode precedence (forceOutputMode > --output=json flag > TOMATO_OUTPUT env > 'text')
- 379b492: cli-core: add default vitest.config.ts (Node environment)
- 2130903: cli-core: add README documenting purpose, public exports, and CliContext usage
- 31fec3c: cli-core: add type-level tests for CliContext.outputMode union and CliEvent narrowing
