/**
 * Represents a message arriving from a human operator via any transport
 * (Telegram, Slack, HTTP webhook, etc.).
 *
 * Used by {@link resolveSessionId} to determine which orchestration session
 * the message should be routed to.
 */
export interface IncomingMessage {
  /** The raw text content of the message. */
  readonly text: string;

  /**
   * When the message is a reply to a previous bot-sent message, this field
   * carries the session ID of the originating conversation.  Transports
   * populate this from platform-specific reply metadata.
   */
  readonly replyToSessionId?: string | undefined;
}
