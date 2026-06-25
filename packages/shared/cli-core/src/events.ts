export interface CliEventStart {
  type: 'start';
  command: string;
  ts: string;
}

export interface CliEventStep {
  type: 'step';
  name: string;
  ts: string;
}

export interface CliEventLog {
  type: 'log';
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  ts: string;
}

export interface CliEventResult {
  type: 'result';
  ok: boolean;
  data?: unknown;
  error?: { code: string; message: string };
  ts: string;
}

export type CliEvent = CliEventStart | CliEventStep | CliEventLog | CliEventResult;
