# Events CLI tool for Notification service

## Commands

* `interact` — interactive mode for browsing events and managing approvals.
* `listen` — listen for new events and print them as they arrive. (Accepts `--callback` option to simulate awaiting for a callback event, and `--port` to specify the port to listen on, default: 4000).
* `prune` — archives or deletes old events and approvals from the database (requires `--older-than` and `--type` options).
* `read` —  print events from the event store and mark them as read, optionally filtered by entity type/kind, approval status.
* `send` — send a test event to the service (requires `--type` and `--payload` options).

## Options
- `-h, --help` display help for command
- `-p, --p <number>` port to listen for events (default: 4000)
- `-e, --env`  define environment used for host service resolution (default: development)
- `-d, --debug` enable debug logging (default: false)
- `-t, --type <string>` specify entity type/kind (required for `prune` commands)
- `-a, --approval-status <string>` specify approval status (pending/approved/rejected) for filtering approval events (default: pending)
- `-v, --verbose` enable verbose logging (includes debug)


## Usage

### Interactive mode

```sh
tomato event interact
```

### Listen for events
Persistent mode. Simulates the notification service running in the background, printing new events as they arrive. Useful for testing and debugging.
When running with the `--callback` option, it simulates an emitting service awaiting for a callback event (eg: approval resolution).

```sh
tomato event listen 
```
or 
```sh
tomato event listen -p 4000 --callback /approvals/wait
```

### Prune old events
Archives events and approvals older than a specified age (they will be flagged as deleted but not removed from the database). Use `--type` to specify the entity type/kind to target (eg: `job`, `workflow`, etc). The special usage of  `--older-than any` will flag all events of the specified type as deleted.

```sh
tomato event prune --type job --older-than 30d
```

### Read events
Prints events from the event store and marks them as read. Use `--type` to filter by entity type/kind. This command will list all events regardless of their type if no filters are applied.

```sh
tomato event read
```
or
```sh
tomato event read --type job
```

### Send test event
Sends a test event to the service. Use `--type` to specify the entity type/kind (eg: `job`, `workflow`, etc), and `--payload` to provide a JSON string representing the event payload.
Use `--no-validate` to send the event payload without validating it against the expected schema for the specified type. Useful for testing error handling and service resilience against malformed data.

```sh
tomato event send --type job --payload '{"message": "Test event", "severity": "info"}'
```
or 
```sh
tomato event send -t job -p '{"message": "Test event", "severity": "info"}'
```