/**
 * @packageDocumentation
 * Parses markdown plan files into structured task lists.
 *
 * Recognises two checklist formats:
 * - `- [ ] <text>` — unchecked task
 * - `- [BLOCKED] <text>` — blocked task
 */

export interface ParsedTask {
  index: number;
  text: string;
}

export interface ParsedPlan {
  name: string;
  description: string | undefined;
  tasks: ParsedTask[];
}

const TASK_RE = /^- \[[ xX]\] (.+)|^- \[BLOCKED\] (.+)/;
const HEADING_RE = /^# (.+)/;

/**
 * Extracts checklist tasks from a markdown plan file.
 */
export function parseMdPlan(content: string): ParsedTask[] {
  const lines = content.split('\n');
  const tasks: ParsedTask[] = [];
  let idx = 0;

  for (const line of lines) {
    const match = TASK_RE.exec(line);
    if (match) {
      const text = (match[1] ?? match[2] ?? '').trim();
      tasks.push({ index: idx, text });
      idx++;
    }
  }

  return tasks;
}

/**
 * Extracts the plan name from the first `# heading` line.
 * Falls back to the provided default name if no heading is found.
 */
export function extractPlanName(content: string, fallback: string): string {
  const lines = content.split('\n');
  for (const line of lines) {
    const match = HEADING_RE.exec(line);
    if (match) {
      return match[1]!.trim();
    }
  }
  return fallback;
}

/**
 * Extracts the plan description: all non-empty text lines between the heading
 * and the first task line.
 */
export function extractPlanDescription(content: string): string | undefined {
  const lines = content.split('\n');
  const descriptionLines: string[] = [];
  let pastHeading = false;

  for (const line of lines) {
    if (!pastHeading && HEADING_RE.test(line)) {
      pastHeading = true;
      continue;
    }
    if (pastHeading) {
      if (TASK_RE.test(line)) break;
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        descriptionLines.push(trimmed);
      }
    }
  }

  return descriptionLines.length > 0 ? descriptionLines.join(' ') : undefined;
}

/**
 * Full parse: name, description, and tasks from a markdown plan.
 */
export function parseMdPlanFull(content: string, fallbackName: string): ParsedPlan {
  return {
    name: extractPlanName(content, fallbackName),
    description: extractPlanDescription(content),
    tasks: parseMdPlan(content),
  };
}

/**
 * Smart detection: returns true if the content contains task checklist lines.
 * Used to decide whether an uploaded MD file is already a plan (has tasks)
 * or just a raw description (needs workflow API for plan generation).
 */
export function hasTasks(content: string): boolean {
  return content.split('\n').some((line) => TASK_RE.test(line));
}
