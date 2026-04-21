import { describe, expect, it, vi } from 'vitest';

import {
  ConsoleFallbackEventSink,
  type BackendFailedEvent,
  type BackendFallbackEvent,
  type BackendSelectedEvent,
  type ChainExhaustedEvent,
  type ChainSuccessEvent,
  type FallbackEvent,
  type FallbackEventSink,
} from './fallback-event-sink.js';

describe('FallbackEventSink', () => {
  describe('ConsoleFallbackEventSink', () => {
    it('logs backend_selected via console.info', () => {
      const sink = new ConsoleFallbackEventSink();
      const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const event: BackendSelectedEvent = {
        type: 'backend_selected',
        backendName: 'claude',
        attempt: 1,
        timestamp: Date.now(),
      };

      sink.emit(event);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toContain('claude');
      expect(spy.mock.calls[0][0]).toContain('attempt 1');
      spy.mockRestore?.();
    });

    it('logs backend_failed via console.warn', () => {
      const sink = new ConsoleFallbackEventSink();
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const event: BackendFailedEvent = {
        type: 'backend_failed',
        backendName: 'gemini',
        errorClass: 'rate_limit',
        exitCode: 1,
        attempt: 2,
        timestamp: Date.now(),
      };

      sink.emit(event);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toContain('gemini');
      expect(spy.mock.calls[0][0]).toContain('rate_limit');
      spy.mockRestore?.();
    });

    it('logs backend_fallback via console.warn', () => {
      const sink = new ConsoleFallbackEventSink();
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const event: BackendFallbackEvent = {
        type: 'backend_fallback',
        failedBackend: 'claude',
        nextBackend: 'gemini',
        errorClass: 'unknown',
        attempt: 1,
        timestamp: Date.now(),
      };

      sink.emit(event);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toContain('claude');
      expect(spy.mock.calls[0][0]).toContain('gemini');
      spy.mockRestore?.();
    });

    it('logs chain_exhausted via console.error', () => {
      const sink = new ConsoleFallbackEventSink();
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const event: ChainExhaustedEvent = {
        type: 'chain_exhausted',
        lastBackend: 'codex',
        lastErrorClass: 'rate_limit',
        totalAttempts: 3,
        timestamp: Date.now(),
      };

      sink.emit(event);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toContain('codex');
      expect(spy.mock.calls[0][0]).toContain('3 attempts');
      spy.mockRestore?.();
    });

    it('logs chain_success via console.info', () => {
      const sink = new ConsoleFallbackEventSink();
      const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const event: ChainSuccessEvent = {
        type: 'chain_success',
        backendName: 'claude',
        attempt: 1,
        durationMs: 1234,
        timestamp: Date.now(),
      };

      sink.emit(event);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toContain('claude');
      expect(spy.mock.calls[0][0]).toContain('1234ms');
      spy.mockRestore?.();
    });

    it('handles null exitCode in backend_failed', () => {
      const sink = new ConsoleFallbackEventSink();
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const event: BackendFailedEvent = {
        type: 'backend_failed',
        backendName: 'claude',
        errorClass: 'unknown',
        exitCode: null,
        attempt: 1,
        timestamp: Date.now(),
      };

      sink.emit(event);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toContain('exit null');
      spy.mockRestore?.();
    });
  });

  describe('FallbackEventSink interface', () => {
    it('can be implemented as a collecting sink for testing', () => {
      const collected: FallbackEvent[] = [];
      const sink: FallbackEventSink = {
        emit: (event) => collected.push(event),
      };

      sink.emit({
        type: 'backend_selected',
        backendName: 'claude',
        attempt: 1,
        timestamp: Date.now(),
      });

      sink.emit({
        type: 'chain_success',
        backendName: 'claude',
        attempt: 1,
        durationMs: 500,
        timestamp: Date.now(),
      });

      expect(collected).toHaveLength(2);
      expect(collected[0].type).toBe('backend_selected');
      expect(collected[1].type).toBe('chain_success');
    });

    it('can be implemented as a no-op sink', () => {
      const sink: FallbackEventSink = { emit: () => {} };

      // Should not throw
      sink.emit({
        type: 'chain_exhausted',
        lastBackend: 'codex',
        lastErrorClass: 'auth_failure',
        totalAttempts: 3,
        timestamp: Date.now(),
      });
    });
  });
});
