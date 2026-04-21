import fs from 'fs';

export interface TaskInfo {
  task: string;
  lineNum: number; // 0-indexed
  status: 'blocked' | 'unchecked';
}

export function findNextTask(trackerContent: string): TaskInfo | null {
  const lines = trackerContent.split('\n');

  // Prefer resuming a blocked task first
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i]!.match(/^- \[BLOCKED\] (.+)/);
    if (match?.[1]) return { task: match[1].trim(), lineNum: i, status: 'blocked' };
  }

  // Otherwise find the next unchecked task
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i]!.match(/^- \[ \] (.+)/);
    if (match?.[1]) return { task: match[1].trim(), lineNum: i, status: 'unchecked' };
  }

  return null;
}

export function updateTrackerLine(
  trackerPath: string,
  lineNum: number,
  newStatus: 'done' | 'blocked',
): void {
  const lines = fs.readFileSync(trackerPath, 'utf8').split('\n');
  const line = lines[lineNum];
  if (!line) return;

  if (newStatus === 'done') {
    lines[lineNum] = line.replace(/^- \[ \]/, '- [x]').replace(/^- \[BLOCKED\]/, '- [x]');
  } else {
    lines[lineNum] = line.replace(/^- \[ \]/, '- [BLOCKED]');
    // Already [BLOCKED]? No change needed.
  }
  fs.writeFileSync(trackerPath, lines.join('\n'), 'utf8');
}
