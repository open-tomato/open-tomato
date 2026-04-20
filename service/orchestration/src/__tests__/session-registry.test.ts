import type { IncomingMessage, RobotService } from '@open-tomato/types';

import { describe, expect, it } from 'bun:test';

import { SessionRegistry } from '../session-registry.js';

function stubService(label: string): RobotService {
  return {
    sendQuestion: async () => `${label}-answer`,
    sendCheckin: async () => {},
    onGuidance: () => {},
    flushGuidance: () => null,
    acceptResponse: () => {},
    acceptGuidance: () => {},
    shutdown: async () => {},
  };
}

describe('SessionRegistry', () => {
  describe('register / unregister / get', () => {
    it('registers and retrieves a service by session ID', () => {
      const service = stubService('deploy');
      const registry = new SessionRegistry(new Map()).register('deploy', service);

      expect(registry.get('deploy')).toBe(service);
    });

    it('returns undefined for an unregistered session', () => {
      const registry = new SessionRegistry(new Map());

      expect(registry.get('missing')).toBeUndefined();
    });

    it('unregister removes the session', () => {
      const service = stubService('deploy');
      const r1 = new SessionRegistry(new Map()).register('deploy', service);
      const r2 = r1.unregister('deploy');

      expect(r2.get('deploy')).toBeUndefined();
    });

    it('register and unregister are immutable — original registry unchanged', () => {
      const service = stubService('a');
      const r1 = new SessionRegistry(new Map());
      const r2 = r1.register('a', service);
      const r3 = r2.unregister('a');

      expect(r1.size).toBe(0);
      expect(r2.size).toBe(1);
      expect(r3.size).toBe(0);
    });
  });

  describe('resolve — routes by @prefix', () => {
    it('routes to the correct service via @loop-id prefix', () => {
      const deployService = stubService('deploy');
      const buildService = stubService('build');
      const registry = new SessionRegistry(new Map())
        .register('deploy', deployService)
        .register('build', buildService);

      const message: IncomingMessage = { text: '@deploy check status' };

      expect(registry.resolve(message)).toBe(deployService);
    });
  });

  describe('resolve — routes by replyToSessionId', () => {
    it('routes to the correct service via replyToSessionId', () => {
      const service = stubService('session-42');
      const registry = new SessionRegistry(new Map()).register(
        'session-42',
        service,
      );

      const message: IncomingMessage = {
        text: 'yes, proceed',
        replyToSessionId: 'session-42',
      };

      expect(registry.resolve(message)).toBe(service);
    });
  });

  describe('resolve — falls back to default "main"', () => {
    it('routes to the main session when no routing signal is present', () => {
      const mainService = stubService('main');
      const registry = new SessionRegistry(new Map()).register(
        'main',
        mainService,
      );

      const message: IncomingMessage = { text: 'just a message' };

      expect(registry.resolve(message)).toBe(mainService);
    });

    it('returns undefined when the default session is not registered', () => {
      const registry = new SessionRegistry(new Map());
      const message: IncomingMessage = { text: 'no match' };

      expect(registry.resolve(message)).toBeUndefined();
    });

    it('uses a custom default session ID', () => {
      const fallback = stubService('fallback');
      const registry = new SessionRegistry(new Map(), 'fallback').register(
        'fallback',
        fallback,
      );

      const message: IncomingMessage = { text: 'plain text' };

      expect(registry.resolve(message)).toBe(fallback);
    });
  });

  describe('resolveWithId', () => {
    it('returns sessionId and service together', () => {
      const service = stubService('deploy');
      const registry = new SessionRegistry(new Map()).register('deploy', service);
      const message: IncomingMessage = { text: '@deploy go' };

      const result = registry.resolveWithId(message);

      expect(result).toEqual({ sessionId: 'deploy', service });
    });

    it('returns undefined when no service matches', () => {
      const registry = new SessionRegistry(new Map());
      const message: IncomingMessage = { text: '@unknown go' };

      expect(registry.resolveWithId(message)).toBeUndefined();
    });
  });

  describe('sessionIds', () => {
    it('lists all registered session IDs', () => {
      const registry = new SessionRegistry(new Map())
        .register('a', stubService('a'))
        .register('b', stubService('b'));

      expect(registry.sessionIds()).toEqual(['a', 'b']);
    });
  });
});
