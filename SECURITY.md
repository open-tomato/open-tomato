---
title: "Open Tomato — Security Guidelines"
description: "Security rules, secrets management, and vulnerability reporting for the open-tomato application monorepo."
---

# Security — Open Tomato Monorepo

## Rules

- **Never** store secrets in files. Use `bws` (Bitwarden Secrets Manager).
- **Never** commit `.env` files — verify they are gitignored.
- Sanitize and validate all user input with Zod at the boundary.
- Use security HTTP headers on all API handlers: `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy`, `X-XSS-Protection`.
- Use secure cookie flags: `httpOnly`, `secure`, `sameSite: 'strict'`, and a reasonable `maxAge`.
- Enable CORS with an explicit origin allowlist — never `origin: '*'` in production.
- Implement rate limiting and request body size limits on public routes.
- Log only at `warn`/`error` level in `production`/`staging`. Never log passwords, tokens, or PII.
- Keep dependencies audited: run `bun audit` regularly and before every PR that adds or upgrades deps.

## Secrets Management

All secrets are stored in **Bitwarden Secrets Manager** and injected at runtime via the `bws` CLI. No secret value ever appears in source code, committed `.env` files, or CI environment variable logs.

### Tool overview

| Tool | Purpose |
| --- | --- |
| `bws` | Bitwarden Secrets Manager CLI — authenticates against the vault and resolves secret values |

Authenticate the CLI by exporting a machine-scoped access token before running any `bws` command:

```bash
export BWS_ACCESS_TOKEN=<token-from-vault>
```

### Running with secrets

To run a single command with secrets injected without writing a file, use `bws run --`:

```bash
bws run -- bun run dev
bws run -- docker compose up
```

### Adding a new secret

Follow these steps every time a new secret is required — in this order:

1. **Create the secret in the vault.** Add the value to the Bitwarden Secrets Manager project. Use a descriptive, SCREAMING_SNAKE_CASE name (e.g. `DATABASE_URL`, `STRIPE_SECRET_KEY`).
2. **Update `.env.example`.** Add a line with the variable name and a placeholder or comment describing what it is — no real value:
   ```
   # Connection string for the primary Postgres instance
   DATABASE_URL=
   ```
3. **Reference the variable in code.** Read the value from `process.env` (or equivalent). Validate its presence at startup using Zod so the service fails fast with a clear message if the variable is missing.
4. **Document it in the project README.** Add the variable to the "Environment variables" section in the relevant service/app README with a one-line description.
5. **Do not commit `.env`.** The file is gitignored. Confirm with `git status` before every commit.

### Incident response

If a secret is accidentally committed:

1. **Treat it as fully compromised.** Rotate it in the vault and in every system that uses it immediately.
2. **Remove it from git history** using `git filter-repo` or by contacting the repository owner — removing a file in a new commit is not sufficient.
3. **Audit access logs** in the affected system for the window between the commit timestamp and rotation.
4. **File an incident report** and link it from the affected PR or commit.

## Dependency Auditing

```bash
bun audit
```

- Run `bun audit` before merging any PR that adds or upgrades dependencies.
- Address all **critical** and **high** severity findings before merging.
- **Moderate** findings should be tracked and resolved within the current sprint.
- If no fix is available upstream, document the exception and mitigating controls in the PR description.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Use the repository's private GitHub Security Advisories channel. This keeps the details confidential until a fix is released.

### What to include

Provide as much of the following as possible to help us triage and reproduce quickly:

- A description of the vulnerability and the potential impact.
- The affected component, file path, or endpoint.
- Step-by-step reproduction instructions or a proof-of-concept.
- Any suggested remediation, if you have one.

### Expected response process

| Stage | Target timeframe |
| --- | --- |
| Acknowledgement | Within **2 business days** |
| Triage — reproduce and assess impact | Within **5 business days** of acknowledgement |
| Fix — critical/high | Within **14 days** |
| Fix — medium/low | Within **30 days** |
| Disclosure — coordinated advisory | After the fix is released |

### Scope

In scope:

- Authentication and authorisation bypasses.
- Secret or credential exfiltration paths.
- Remote code execution in the API surface.
- Injection vulnerabilities (SQL, shell, prompt) in server-side code.
- Broken access control exposing data across tenants or users.

Out of scope:

- Vulnerabilities in third-party dependencies that have an available upstream fix (open a standard issue linking the CVE instead).
- Rate limiting or DoS scenarios that require sustained high traffic volumes.
