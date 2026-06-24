# Prerequisites

## Environment Variables

- `BWS_ACCESS_TOKEN` — Bitwarden Secrets Manager access token, scoped to the project(s) the test fixtures use. Required for any test that exercises the real SDK path (mocked tests do not need it). Obtain via the BWS console under Machine Accounts.

## Credentials

- [ ] A test Bitwarden project containing at least one secret named `cli-core-test-secret-staging` so the integration tests can assert the fallback resolution against a real backend (skip this prerequisite if you are running unit tests only)
