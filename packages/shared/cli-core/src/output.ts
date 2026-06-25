import type { CliEvent, CliEventLog } from './events';

export interface CliOutput {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
  emit(event: CliEvent): void;
  result(payload: unknown): void;
}

export interface CliOutputStream {
  write(chunk: string): unknown;
}

export interface CreateTextOutputOptions {
  verbosity: number;
  stream: CliOutputStream;
}

export function createTextOutput({ verbosity, stream }: CreateTextOutputOptions): CliOutput {
  const writeLine = (line: string): void => {
    stream.write(`${line}\n`);
  };

  const debug = (message: string): void => {
    if (verbosity >= 2) {
      writeLine(`debug: ${message}`);
    }
  };

  const info = (message: string): void => {
    if (verbosity >= 1) {
      writeLine(`info: ${message}`);
    }
  };

  const warn = (message: string): void => {
    writeLine(`warn: ${message}`);
  };

  const error = (message: string): void => {
    writeLine(`error: ${message}`);
  };

  const formatPayload = (payload: unknown): string => {
    if (typeof payload === 'string') {
      return payload;
    }
    return JSON.stringify(payload);
  };

  const result = (payload: unknown): void => {
    writeLine(`result: ${formatPayload(payload)}`);
  };

  const emit = (event: CliEvent): void => {
    switch (event.type) {
      case 'start': {
        writeLine(`start: ${event.command}`);
        return;
      }
      case 'step': {
        writeLine(`step: ${event.name}`);
        return;
      }
      case 'log': {
        switch (event.level) {
          case 'debug': {
            debug(event.message);
            return;
          }
          case 'info': {
            info(event.message);
            return;
          }
          case 'warn': {
            warn(event.message);
            return;
          }
          case 'error': {
            error(event.message);
            return;
          }
        }
        return;
      }
      case 'result': {
        if (event.ok) {
          const dataPart = event.data === undefined
            ? ''
            : ` ${formatPayload(event.data)}`;
          writeLine(`result: ok${dataPart}`);
          return;
        }
        const code = event.error?.code ?? 'unknown';
        const message = event.error?.message ?? '';
        writeLine(`result: error ${code}${message
          ? `: ${message}`
          : ''}`);
        return;
      }
    }
  };

  return { info, warn, error, debug, emit, result };
}

export interface CreateJsonOutputOptions {
  stream: CliOutputStream;
}

export function createJsonOutput({ stream }: CreateJsonOutputOptions): CliOutput {
  const writeEvent = (event: CliEvent): void => {
    stream.write(`${JSON.stringify(event)}\n`);
  };

  const logAt = (level: CliEventLog['level'], message: string): void => {
    writeEvent({ type: 'log', level, message, ts: new Date().toISOString() });
  };

  const debug = (message: string): void => {
    logAt('debug', message);
  };

  const info = (message: string): void => {
    logAt('info', message);
  };

  const warn = (message: string): void => {
    logAt('warn', message);
  };

  const error = (message: string): void => {
    logAt('error', message);
  };

  const emit = (event: CliEvent): void => {
    writeEvent(event);
  };

  const result = (payload: unknown): void => {
    writeEvent({ type: 'result', ok: true, data: payload, ts: new Date().toISOString() });
  };

  return { info, warn, error, debug, emit, result };
}
