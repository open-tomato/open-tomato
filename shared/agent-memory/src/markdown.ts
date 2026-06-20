import type { Memory, MemoryType } from './types.js';

/**
 * Maps markdown section header names to their corresponding MemoryType values.
 * Only headers present in this table are recognized; others are skipped.
 */
const SECTION_TO_TYPE: Readonly<Record<string, MemoryType>> = {
  Patterns: 'pattern',
  Decisions: 'decision',
  Fixes: 'fix',
  Context: 'context',
};

/**
 * Maps MemoryType values to their corresponding markdown section header names.
 */
const TYPE_TO_SECTION: Readonly<Record<MemoryType, string>> = {
  pattern: 'Patterns',
  decision: 'Decisions',
  fix: 'Fixes',
  context: 'Context',
};

/** Canonical ordering of section types in serialized output. */
const TYPE_ORDER: readonly MemoryType[] = ['pattern', 'decision', 'fix', 'context'];

/**
 * Parses an HTML comment metadata line in the format:
 * `<!-- id: <id> | tags: <tag1>, <tag2> | created: <iso-date> -->`
 *
 * @param line - A single line expected to be an HTML comment.
 * @returns Parsed metadata, or `null` if the line is not a valid metadata comment.
 */
function parseMetadataComment(
  line: string,
): { id: string; tags: string[]; created: Date } | null {
  const match = /^<!--\s*(.*?)\s*-->$/.exec(line.trim());
  if (!match) return null;

  const inner = match[1];
  if (inner === undefined) return null;
  const parts = inner.split('|').map((p) => p.trim());

  let id: string | undefined;
  let tags: string[] = [];
  let created: Date = new Date(0);

  for (const part of parts) {
    if (part.startsWith('id:')) {
      id = part.slice(3).trim();
    } else if (part.startsWith('tags:')) {
      tags = part
        .slice(5)
        .trim()
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    } else if (part.startsWith('created:')) {
      const dateStr = part.slice(8).trim();
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        created = parsed;
      }
    }
  }

  if (!id) return null;
  return { id, tags, created };
}

/**
 * Parses a raw markdown string into an array of {@link Memory} objects.
 *
 * Recognizes four section headers (`## Patterns`, `## Decisions`, `## Fixes`,
 * `## Context`) and maps them to their respective {@link MemoryType} values.
 * Within each section, blockquote blocks (lines beginning with `> `) are
 * extracted as memory content. The line immediately following a blockquote
 * block is inspected for an HTML comment carrying `id`, `tags`, and `created`
 * metadata in the format:
 *
 * ```
 * <!-- id: abc123 | tags: typescript, zod | created: 2024-01-15T10:00:00Z -->
 * ```
 *
 * When no metadata comment follows a blockquote block, a random UUID is
 * generated for `id` and `created` is set to `new Date(0)`.
 *
 * @param raw - The raw markdown string to parse.
 * @returns An array of Memory objects found in the markdown.
 */
export function parseMemoriesFromMarkdown(raw: string): Memory[] {
  const memories: Memory[] = [];

  // Split on `## ` section boundaries; discard any content before the first header
  const chunks = raw.split(/^## /m).slice(1);

  for (const chunk of chunks) {
    const newlineIndex = chunk.indexOf('\n');
    const headerName =
      newlineIndex >= 0
        ? chunk.slice(0, newlineIndex).trim()
        : chunk.trim();
    const type = SECTION_TO_TYPE[headerName];

    if (type === undefined) continue;

    const body = newlineIndex >= 0
      ? chunk.slice(newlineIndex + 1)
      : '';
    const lines = body.split('\n');
    let i = 0;

    while (i < lines.length) {
      const currentLine = lines[i] ?? '';

      // Detect the start of a blockquote block
      if (!currentLine.startsWith('> ') && currentLine !== '>') {
        i++;
        continue;
      }

      // Collect consecutive blockquote lines into content
      const contentLines: string[] = [];
      while (i < lines.length) {
        const blockLine = lines[i] ?? '';
        if (!blockLine.startsWith('> ') && blockLine !== '>') break;
        contentLines.push(blockLine.startsWith('> ')
          ? blockLine.slice(2)
          : '');
        i++;
      }

      const content = contentLines.join('\n');

      // Attempt to parse metadata from the immediately following line
      let id: string | undefined;
      let tags: string[] = [];
      let created: Date = new Date(0);

      if (i < lines.length) {
        const nextLine = (lines[i] ?? '').trim();
        if (nextLine.startsWith('<!--')) {
          const parsed = parseMetadataComment(nextLine);
          if (parsed) {
            id = parsed.id;
            tags = parsed.tags;
            created = parsed.created;
            i++;
          }
        }
      }

      memories.push({
        id: id ?? crypto.randomUUID(),
        type,
        content,
        tags,
        created,
      });
    }
  }

  return memories;
}

/**
 * Serializes an array of {@link Memory} objects into a markdown string.
 *
 * Memories are grouped by type and output under their corresponding section
 * headers (`## Patterns`, `## Decisions`, `## Fixes`, `## Context`). Within
 * each section, each memory is rendered as a blockquote followed by an HTML
 * comment carrying `id`, `tags`, and `created` metadata:
 *
 * ```markdown
 * ## Patterns
 *
 * > Memory content here.
 * <!-- id: abc123 | tags: typescript, zod | created: 2024-01-15T10:00:00.000Z -->
 * ```
 *
 * Multi-line content is split on `\n` and each line prefixed with `> `.
 * Empty lines within multi-line content are rendered as bare `>` so that
 * round-trip parsing via {@link parseMemoriesFromMarkdown} preserves them.
 *
 * Sections with no memories are omitted. Sections are always emitted in
 * the order: Patterns → Decisions → Fixes → Context.
 *
 * @param memories - The memories to serialize. May be empty.
 * @returns A markdown string, or an empty string when `memories` is empty.
 */
export function serializeMemoriesToMarkdown(memories: Memory[]): string {
  if (memories.length === 0) return '';

  const sections: string[] = [];

  for (const type of TYPE_ORDER) {
    const group = memories.filter((m) => m.type === type);
    if (group.length === 0) continue;

    const sectionName = TYPE_TO_SECTION[type];
    const lines: string[] = [`## ${sectionName}`, ''];

    let memIdx = 0;
    for (const memory of group) {
      // Prefix each content line with `> `; bare `>` for empty lines
      const contentLines = memory.content
        .split('\n')
        .map((line) => (line === ''
          ? '>'
          : `> ${line}`));
      lines.push(...contentLines);

      // Metadata comment
      const tagsStr = memory.tags.join(', ');
      lines.push(
        `<!-- id: ${memory.id} | tags: ${tagsStr} | created: ${memory.created.toISOString()} -->`,
      );

      // Blank line between memories within the same section
      if (memIdx < group.length - 1) {
        lines.push('');
      }
      memIdx++;
    }

    sections.push(lines.join('\n'));
  }

  return sections.join('\n\n');
}
