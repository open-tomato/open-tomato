import type { CliEvent } from './events';

export interface CliOutput {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
  emit(event: CliEvent): void;
  result(payload: unknown): void;
}
