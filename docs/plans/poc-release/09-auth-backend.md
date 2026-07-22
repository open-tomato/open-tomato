---
repo: open-tomato (services/*)
tier: milestone
depends-on: [08]
parallel-with: [12-partial]
size: L
status: pending
linear: OPT-248
---

# WS09 — Auth backend

**Goal:** implement the API contract emitted by WS08 (`auth-api-contract.md`) on the existing service framework, so the auth app runs against a real gateway.

## Milestones

1. **Contract review**: walk `auth-api-contract.md` (endpoints, token semantics incl. workspace/invitation claims at token level per POC-RELEASE-PLANS) and split into service-sized chunks; detailed planning session happens here, not before the contract exists.
2. **Core flows**: email sign-in/sign-up, session/token issuance (OIDC/OAuth-compatible), password reset (email via notifications service), 2FA TOTP enroll/confirm.
3. **OAuth providers**: at least one external provider end-to-end (drives OAuthConfirm screen).
4. **Workspace claims**: workspace pick/invitation validation flagged at token level (per plan, lives in the Auth layer for now; movable to webapp later).
5. **Deployable**: `service.config.yaml` for grow-box onboarding (prebuilt image, postgres + redis capabilities).

## Candidate cut-lines (decide during milestone 1)

- Stubbed email delivery (log/console transport) instead of full notifications-service integration.
- Passkey/WebAuthn backend deferred post-PoC (UI ships in WS08 per D5).
- Single OAuth provider only.
- Rate limiting minimal (framework defaults) with a tracked hardening issue.

## Verification

- Contract tests against `auth-api-contract.md`; service-framework test conventions; auth app (WS08) pointed at the real service passes its flow state-machine tests.
