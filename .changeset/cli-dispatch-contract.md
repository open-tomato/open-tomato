---
"@open-tomato/cli": patch
---

Fix three dispatch/contract limitations surfaced by external consumers (grow-box `tomatops`):

- Single-token commands now dispatch. A verb registered as `tool === command` (e.g. `setup`) routes via `tomato setup [...args]`; flags after the verb are passed through as command args.
- Exactly one terminal `result` (and one `start`) is emitted. When a dispatched command emits its own data-bearing `result`/`start`, dispatch no longer appends a duplicate — the command's own result is the terminal one.
- `loadExternalCommands` accepts CliCommand objects. A module whose default export (or module namespace) is a CliCommand-like object with a `.run` method is normalized so `.run` is the entrypoint and the object becomes the command `meta`, alongside the existing bare-function default support.
