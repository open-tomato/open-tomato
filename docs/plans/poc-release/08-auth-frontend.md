---
repo: open-tomato (new sibling app workspace, e.g. /auth-app)
tier: detailed
depends-on: [05-wave-1 (AuthShell + auth templates published)]
parallel-with: [07, 10, 11]
size: M (1–2 sessions)
status: COMPLETE — sessions 1+2 done; /auth-app scaffolded, flows wired to mock, auth-api-contract.md delivered, 57 tests green
linear: OPT-247
---

# WS08 — Auth app frontend + backend API contract

**Goal:** the individually-hosted auth gateway UI, wired into real flow state machines against a mocked backend — and, as its second deliverable, `auth-api-contract.md`: the backend API definition derived from what the screens need (UI drives backend definition, per POC-RELEASE-PLANS).

## Session 1 — App + flows

- [x] App workspace scaffold (Vite + React 19, turbo-gate-green from day one); consumes `@open-tomato/ui-components` auth templates + AuthShell (D7)
- [x] Flow state machines wiring the published screens:
  - Sign in: Login (email) · OAuthConfirm (OAuth)
  - Sign up: SignupEmail · OAuthConfirm · SignupDone
  - Reset: ForgotEmail → ForgotSent → ResetCode → ResetDone
  - 2FA: TwoFactor Pick → Scan (QR) → Confirm → Done; **Passkey**: PasskeyPrompt after "add passkey" selection, awaiting browser WebAuthn (D5) — UI + `navigator.credentials` call shape; backend verification mocked
  - Workspace: WorkspacePick Invited · Self-serve default (invitation/group validation flagged at token level)
- [x] Mock auth API module — every screen interacts only through it (this module's surface *is* the draft contract)
- [x] Error/edge states per screen (invalid code, expired reset, OAuth denial)

## Session 2 — Contract + hardening

- [x] `auth-api-contract.md`: endpoints, request/response shapes, token semantics (session, refresh, workspace/invitation claims), OAuth/OIDC redirect flows, 2FA enroll/verify, WebAuthn registration ceremony (marked PoC-optional for backend per D5), rate-limit expectations
- [x] Flow state-machine unit tests (happy + failure paths per flow)
- [x] Standalone-hosting readiness: env-driven backend URL, redirect-back-to-webapp handling, prebuilt-image build for WS12

## Verification

- Turbo gate; state-machine unit tests green; manual walkthrough of all flows vs the published templates (light + dark, 320/768/1024); contract doc reviewed as WS09's input.
