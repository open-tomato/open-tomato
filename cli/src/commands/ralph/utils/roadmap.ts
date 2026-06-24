import fs from 'fs';
import path from 'path';

export interface IssueEntry {
  identifier: string;
  issueId: string;
  status: 'pending' | 'blocked' | 'done';
  branch?: string;
  mainRef?: string;
}

export interface RoadmapState {
  issues: IssueEntry[];
  currentIndex: number;
}

export function loadState(filePath: string): RoadmapState {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as RoadmapState;
}

export function saveState(filePath: string, state: RoadmapState): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
}
