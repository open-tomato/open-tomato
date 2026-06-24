# @open-tomato/errors

Shared error handling utilities for the open-tomato monorepo. Pure TypeScript with no runtime framework dependencies — safe to import in both Node.js and browser contexts from a single entry point.

## Consumers

| Package | Imports |
|---|---|
| `@open-tomato/service-core` | `AppError`, `errorHandler`, `zodToValidationError` |
| `@open-tomato/express` | via `service-core` (re-exported) |
| `@open-tomato/mcp` | `AppError` (tool error responses) |
| `@open-tomato/react` | `isAppError`, `parseApiError` |

## Error classes

| Class | Status | Code |
|---|---|---|
| `AppError` | base | — |
| `BadRequestError` | 400 | `BAD_REQUEST` |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ConflictError` | 409 | `CONFLICT` |
| `ValidationError` | 422 | `VALIDATION_ERROR` |
| `InternalError` | 500 | `INTERNAL_ERROR` |

`InternalError` strips `details` when `NODE_ENV === 'production'` to avoid leaking internal state to clients.

## Usage

### Throwing errors (Node.js / browser)

```ts
import { NotFoundError, ValidationError } from '@open-tomato/errors'

throw new NotFoundError('Agent not found', { agentId })

throw new ValidationError('Invalid input', [
  { field: 'email', message: 'Must be a valid email', code: 'invalid_email' },
])
```

### Express error handler (Node.js only)

```ts
import { errorHandler } from '@open-tomato/errors'

// Registered automatically by createService — do not add manually inside register()
app.use(errorHandler(logger))
```

### Zod validation (Node.js only)

```ts
import { zodToValidationError } from '@open-tomato/errors'
import { ZodError } from 'zod'

try {
  schema.parse(input)
} catch (err) {
  if (err instanceof ZodError) throw zodToValidationError(err)
}
```

### Client utilities (browser-safe)

```ts
import { isAppError, parseApiError } from '@open-tomato/errors'

const res = await fetch('/api/agents')
if (!res.ok) {
  const err = await parseApiError(res)
  if (err.code === 'UNAUTHORIZED') router.push('/login')
  throw err
}

// Type guard
const body = await res.json()
if (isAppError(body)) {
  console.error(body.code, body.message)
}
```

## Types

```ts
interface FieldError {
  field: string       // dot-notation path, e.g. "user.email"
  message: string
  code?: string
}

interface AppErrorShape {
  code: string
  message: string
  details?: unknown
  statusCode?: number
}
```

## Notes

- `zod` is a peer dependency — install it alongside this package.
- `errorHandler` and `zodToValidationError` require `express` types at compile time (`@types/express`), but have no Express runtime dependency.
- `client.ts` has zero Node.js imports and is safe for tree-shaking in browser bundles.
- This package exposes TypeScript source directly via workspace exports — no build step required.
