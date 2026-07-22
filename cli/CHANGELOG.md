# @open-tomato/cli

## 0.1.3

### Patch Changes

- f358a36: Rename CLI package from @open-tomato/tomato-cli to @open-tomato/cli and graduate it to a published package
- e2afb4a: Fix three dispatch/contract limitations surfaced by external consumers (grow-box `tomatops`):

  - Single-token commands now dispatch. A verb registered as `tool === command` (e.g. `setup`) routes via `tomato setup [...args]`; flags after the verb are passed through as command args.
  - Exactly one terminal `result` (and one `start`) is emitted. When a dispatched command emits its own data-bearing `result`/`start`, dispatch no longer appends a duplicate — the command's own result is the terminal one.
  - `loadExternalCommands` accepts CliCommand objects. A module whose default export (or module namespace) is a CliCommand-like object with a `.run` method is normalized so `.run` is the entrypoint and the object becomes the command `meta`, alongside the existing bare-function default support.

- Updated dependencies [6176954]
- Updated dependencies [a50fd09]
  - @open-tomato/cli-core@0.2.1

## 0.1.1

### Patch Changes

- Updated dependencies [5d26d40]
- Updated dependencies [b7b5b52]
- Updated dependencies [5f337e0]
- Updated dependencies [8308212]
- Updated dependencies [16e8b74]
- Updated dependencies [5a9b9bb]
- Updated dependencies [18d8f39]
- Updated dependencies [8dd44d6]
- Updated dependencies [be000e7]
- Updated dependencies [8479c79]
- Updated dependencies [9c273e1]
- Updated dependencies [931c7d8]
- Updated dependencies [18f94c8]
- Updated dependencies [73b3d3a]
- Updated dependencies [9b0578e]
- Updated dependencies [ecd6935]
- Updated dependencies [f33ed42]
- Updated dependencies [44e5f4d]
- Updated dependencies [422a29b]
- Updated dependencies [5993373]
- Updated dependencies [5233cce]
- Updated dependencies [0199f29]
- Updated dependencies [34f360a]
- Updated dependencies [a055fd3]
- Updated dependencies [f80a59b]
- Updated dependencies [0642dc5]
- Updated dependencies [d774a7d]
- Updated dependencies [c283ceb]
- Updated dependencies [a637f2a]
- Updated dependencies [4ffe6af]
- Updated dependencies [6561fe2]
- Updated dependencies [342f887]
- Updated dependencies [19d8ef8]
- Updated dependencies [954bc63]
- Updated dependencies [1f35948]
- Updated dependencies [4191e9b]
- Updated dependencies [775b274]
- Updated dependencies [3aba79b]
- Updated dependencies [379b492]
- Updated dependencies [2130903]
- Updated dependencies [31fec3c]
  - @open-tomato/cli-core@0.2.0
