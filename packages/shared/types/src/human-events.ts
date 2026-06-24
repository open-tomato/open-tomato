import { z } from 'zod';

/**
 * Zod schema for `human.interact` events — emitted by an agent to ask the
 * human operator a blocking question.
 */
export const HumanInteractEventSchema = z.object({
  /** Fixed event type discriminator. */
  type: z.literal('human.interact'),

  /** Orchestration session this event belongs to. */
  sessionId: z.string().min(1),

  /** The question text to present to the human. */
  question: z.string().min(1),

  /** ISO-8601 timestamp of when the event was created. */
  timestamp: z.string().datetime(),
});

/**
 * Payload for a `human.interact` event.
 */
export type HumanInteractEvent = z.infer<typeof HumanInteractEventSchema>;

/**
 * Zod schema for `human.response` events — a human reply that unblocks the
 * orchestration loop.
 */
export const HumanResponseEventSchema = z.object({
  /** Fixed event type discriminator. */
  type: z.literal('human.response'),

  /** Orchestration session this response targets. */
  sessionId: z.string().min(1),

  /** The human's response text. */
  response: z.string().min(1),

  /** ISO-8601 timestamp of when the response was received. */
  timestamp: z.string().datetime(),
});

/**
 * Payload for a `human.response` event.
 */
export type HumanResponseEvent = z.infer<typeof HumanResponseEventSchema>;

/**
 * Zod schema for `human.guidance` events — proactive guidance injected by the
 * human operator without a preceding question.
 */
export const HumanGuidanceEventSchema = z.object({
  /** Fixed event type discriminator. */
  type: z.literal('human.guidance'),

  /** Orchestration session this guidance targets. */
  sessionId: z.string().min(1),

  /** The guidance text from the human operator. */
  guidance: z.string().min(1),

  /** ISO-8601 timestamp of when the guidance was sent. */
  timestamp: z.string().datetime(),
});

/**
 * Payload for a `human.guidance` event.
 */
export type HumanGuidanceEvent = z.infer<typeof HumanGuidanceEventSchema>;

/**
 * Discriminated union of all human-in-the-loop event schemas.
 */
export const HumanEventSchema = z.discriminatedUnion('type', [
  HumanInteractEventSchema,
  HumanResponseEventSchema,
  HumanGuidanceEventSchema,
]);

/**
 * Any human-in-the-loop event payload.
 */
export type HumanEvent = z.infer<typeof HumanEventSchema>;
