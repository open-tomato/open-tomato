export enum TaskStatus {
  Open = 'Open',
  InProgress = 'InProgress',
  Closed = 'Closed',
  Failed = 'Failed',
}

export type TaskPriority = 1 | 2 | 3 | 4 | 5;

export interface Task {
  id: string;
  key: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  blocked_by: string[];
  loop_id: string;
  created_at: string;
  started_at?: string;
  closed_at?: string;
}

export type CreateTaskInput = Pick<Task, 'key' | 'title' | 'description' | 'priority' | 'blocked_by' | 'loop_id'>;

export interface TaskStoreOptions {
  filePath: string;
  lockTimeout?: number;
}
