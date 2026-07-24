/**
 * Transactional email transport for auth codes (reset, and later verify).
 *
 * A stub-first seam mirroring `orchestrator/src/notifications/client.ts`: an
 * interface with a console `StubMailTransport` (chosen when `MAIL_URL` is unset)
 * and a factory that can later swap in a real HTTP/SMTP transport without the
 * routes changing. Per the WS09 cut-line, reset codes go through *this* stub —
 * NOT the notifications service, whose `mail` path is SSE fan-out and a poor fit
 * for transactional email.
 */

/** Parameters for the password-reset code email. */
export interface PasswordResetCodeMail {
  /** The recipient address, as supplied on the reset request. */
  to: string;
  /** The one-time reset code the user types into the ResetCode screen. */
  code: string;
  /** Validity window, so the copy can say "expires in N minutes". */
  expiresInMinutes: number;
}

/** Emits transactional auth emails. Implementations must never throw on send. */
export interface MailTransport {
  sendPasswordResetCode(mail: PasswordResetCodeMail): Promise<void>;
}

// ---------------------------------------------------------------------------
// Stub transport (no external dependency) — dev/PoC default.
// ---------------------------------------------------------------------------

/**
 * Logs the email to the console instead of sending it. The reset flow works
 * end-to-end in dev by reading the code off the service log. Structured JSON so
 * it is greppable and doesn't accidentally read as a delivered message.
 */
export class StubMailTransport implements MailTransport {
  async sendPasswordResetCode(mail: PasswordResetCodeMail): Promise<void> {
     
    console.log(
      JSON.stringify({
        level: 'info',
        transport: 'stub-mail',
        kind: 'password_reset_code',
        to: mail.to,
        code: mail.code,
        expiresInMinutes: mail.expiresInMinutes,
      }),
    );
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Pick a mail transport from config. `MAIL_URL` unset/empty → the console stub
 * (dev/PoC). A real transport is a later follow-up; the seam keeps the routes
 * transport-agnostic so wiring one in touches only this factory.
 */
export function createMailTransport(mailUrl: string | undefined): MailTransport {
  if (mailUrl == null || mailUrl === '') return new StubMailTransport();
  // No real transport yet (WS09 cut-line). Until one lands, fall back to the
  // stub rather than silently dropping mail.
  return new StubMailTransport();
}
