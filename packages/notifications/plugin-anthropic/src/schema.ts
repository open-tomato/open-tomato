import { z } from 'zod';

/**
 * Common fields present on all Claude Code hook payloads.
 * These are optional since not every hook event includes every field.
 */
const BaseEventFields = {
  session_id: z.string().optional(),
  permission_mode: z.string().optional(),
  transcript_path: z.string().optional(),
};

/** Zod schema for a `PreToolUse` hook event — fired before a tool is invoked. */
export const PreToolUseEventSchema = z.object({
  ...BaseEventFields,
  hook_event_name: z.literal('PreToolUse'),
  tool_name: z.string(),
  tool_input: z.record(z.unknown()),
});

/** Zod schema for a `PostToolUse` hook event — fired after a tool completes. */
export const PostToolUseEventSchema = z.object({
  ...BaseEventFields,
  hook_event_name: z.literal('PostToolUse'),
  tool_name: z.string(),
  tool_input: z.record(z.unknown()),
  tool_response: z.record(z.unknown()),
  is_error: z.boolean().optional(),
});

/** Zod schema for a `Stop` hook event — fired when a Claude Code session ends. */
export const StopEventSchema = z.object({
  ...BaseEventFields,
  hook_event_name: z.literal('Stop'),
  stop_hook_active: z.boolean().optional(),
});

/** Zod schema for a `Notification` hook event — carries a user-facing message. */
export const NotificationEventSchema = z.object({
  ...BaseEventFields,
  hook_event_name: z.literal('Notification'),
  message: z.string(),
});

/** Zod schema for a `SessionStart` hook event — fired when a new session begins. */
export const SessionStartEventSchema = z.object({
  ...BaseEventFields,
  hook_event_name: z.literal('SessionStart'),
  model: z.string().optional(),
});

/** Zod schema for a `SubagentStart` hook event — fired when a sub-agent spawns. */
export const SubagentStartEventSchema = z.object({
  ...BaseEventFields,
  hook_event_name: z.literal('SubagentStart'),
  agent_id: z.string(),
});

/** Zod schema for a `UserPromptSubmit` hook event — fired when the user sends a prompt. */
export const UserPromptSubmitEventSchema = z.object({
  ...BaseEventFields,
  hook_event_name: z.literal('UserPromptSubmit'),
});

/**
 * Top-level discriminated union schema covering all Claude Code hook event variants.
 * Discriminates on the `hook_event_name` field.
 */
export const ClaudeCodeEventSchema = z.discriminatedUnion('hook_event_name', [
  PreToolUseEventSchema,
  PostToolUseEventSchema,
  StopEventSchema,
  NotificationEventSchema,
  SessionStartEventSchema,
  SubagentStartEventSchema,
  UserPromptSubmitEventSchema,
]);

/** Union type representing any valid Claude Code hook event payload. */
export type ClaudeCodeEvent = z.infer<typeof ClaudeCodeEventSchema>;
/** Typed payload for a {@link PreToolUseEventSchema} event. */
export type PreToolUseEvent = z.infer<typeof PreToolUseEventSchema>;
/** Typed payload for a {@link PostToolUseEventSchema} event. */
export type PostToolUseEvent = z.infer<typeof PostToolUseEventSchema>;
/** Typed payload for a {@link StopEventSchema} event. */
export type StopEvent = z.infer<typeof StopEventSchema>;
/** Typed payload for a {@link NotificationEventSchema} event. */
export type NotificationEvent = z.infer<typeof NotificationEventSchema>;
/** Typed payload for a {@link SessionStartEventSchema} event. */
export type SessionStartEvent = z.infer<typeof SessionStartEventSchema>;
/** Typed payload for a {@link SubagentStartEventSchema} event. */
export type SubagentStartEvent = z.infer<typeof SubagentStartEventSchema>;
/** Typed payload for a {@link UserPromptSubmitEventSchema} event. */
export type UserPromptSubmitEvent = z.infer<typeof UserPromptSubmitEventSchema>;
