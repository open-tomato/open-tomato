/**
 * Parses a PREREQUISITES.md file into a structured list of items,
 * each annotated with a tag ('auto' | 'human') and an optional probe command.
 *
 * Tag resolution order:
 * 1. Explicit inline tag on the item:  `- [ ] [auto] description`
 * 2. Default tag inferred from the current section header
 * 3. Conservative fallback: 'human'
 *
 * Section headers set a default tag when they contain any of:
 * - [auto] or keywords implying automation  → 'auto'
 * - [human], Manual, Human, Sign-Off, Team  → 'human'
 *
 * `probeCommand` is the first backtick-wrapped token in the description,
 * e.g. "verify with `bun --version`" → probeCommand = "bun --version".
 * Used by the checker to run auto probes without guessing what to execute.
 */

export type PrerequisiteTag = 'auto' | 'human';

export interface PrerequisiteItem {
  /** Original raw line from the file. */
  raw: string;
  /** Description with the tag prefix stripped. */
  description: string;
  /** Resolved tag — explicit or inherited from section. */
  tag: PrerequisiteTag;
  /** 0-indexed line number in the source file. */
  lineIndex: number;
  /** First backtick-wrapped command extracted from description, if any. */
  probeCommand?: string;
}

// ---------------------------------------------------------------------------
// Tag detection helpers
// ---------------------------------------------------------------------------

const SECTION_AUTO_RE = /\[auto\]/i;
const SECTION_HUMAN_RE = /\[human\]|manual|human|sign.?off|team/i;

const ITEM_RE = /^-\s+\[\s*\]\s+/;
const INLINE_AUTO_RE = /^-\s+\[\s*\]\s+\[auto\]\s+/i;
const INLINE_HUMAN_RE = /^-\s+\[\s*\]\s+\[human\]\s+/i;
const BACKTICK_RE = /`([^`]+)`/;

function inferSectionTag(header: string): PrerequisiteTag | null {
  if (SECTION_AUTO_RE.test(header)) return 'auto';
  if (SECTION_HUMAN_RE.test(header)) return 'human';
  return null;
}

function stripItemPrefix(line: string): string {
  // Remove "- [ ] [auto] " or "- [ ] [human] " or plain "- [ ] "
  return line
    .replace(INLINE_AUTO_RE, '')
    .replace(INLINE_HUMAN_RE, '')
    .replace(ITEM_RE, '')
    .trim();
}

function extractProbeCommand(description: string): string | undefined {
  const match = BACKTICK_RE.exec(description);
  return match?.[1]?.trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses the content of a PREREQUISITES.md file.
 * Only unchecked items (`- [ ]`) are returned — already-checked items are ignored.
 */
export function parsePrerequisites(content: string): PrerequisiteItem[] {
  const lines = content.split('\n');
  const items: PrerequisiteItem[] = [];
  let sectionDefault: PrerequisiteTag = 'human'; // conservative fallback

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';

    // Section header — update the running default tag
    if (line.startsWith('#')) {
      const inferred = inferSectionTag(line);
      if (inferred !== null) sectionDefault = inferred;
      continue;
    }

    // Skip already-completed or blocked items
    if (/^-\s+\[[xX]\]/.test(line) || /^-\s+\[BLOCKED\]/.test(line)) continue;

    // Unchecked item
    if (ITEM_RE.test(line)) {
      let tag: PrerequisiteTag;

      if (INLINE_AUTO_RE.test(line)) {
        tag = 'auto';
      } else if (INLINE_HUMAN_RE.test(line)) {
        tag = 'human';
      } else {
        tag = sectionDefault;
      }

      const description = stripItemPrefix(line);
      const probeCommand = tag === 'auto'
        ? extractProbeCommand(description)
        : undefined;

      items.push({
        raw: line,
        description,
        tag,
        lineIndex: i,
        probeCommand,
      });
    }
  }

  return items;
}
