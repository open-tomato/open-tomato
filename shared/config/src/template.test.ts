import { describe, it, expect } from 'vitest';

import { ConfigError } from './errors.js';
import { resolveConfigRefs, findUnresolvedTemplates } from './template.js';

describe('resolveConfigRefs', () => {
  it('resolves a {{config.*}} self-reference to another field value', () => {
    expect(
      resolveConfigRefs({
        project: { id: 'knowledge-base' },
        env: { sentry: { release: '{{config.project.id}}@1.0.0' } },
      }),
    ).toEqual({
      project: { id: 'knowledge-base' },
      env: { sentry: { release: 'knowledge-base@1.0.0' } },
    });
  });

  it('resolves references inside nested objects and arrays', () => {
    expect(
      resolveConfigRefs({
        project: { id: 'kb' },
        env: { tags: ['{{config.project.id}}', 'static'] },
      }),
    ).toEqual({
      project: { id: 'kb' },
      env: { tags: ['kb', 'static'] },
    });
  });

  it('throws UNRESOLVED_TEMPLATE for a {{config.*}} path that does not exist', () => {
    try {
      resolveConfigRefs({ env: { x: '{{config.project.missing}}' } });
      expect.unreachable('expected resolveConfigRefs to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError);
      expect((err as ConfigError).code).toBe('UNRESOLVED_TEMPLATE');
    }
  });

  it('does not mutate its input', () => {
    const input = { project: { id: 'kb' }, env: { r: '{{config.project.id}}' } };

    resolveConfigRefs(input);

    expect(input).toEqual({
      project: { id: 'kb' },
      env: { r: '{{config.project.id}}' },
    });
  });
});

describe('findUnresolvedTemplates', () => {
  it('reports remaining {{vault.*}} and {{proc.*}} placeholders with their key path', () => {
    const found = findUnresolvedTemplates({
      env: {
        redis: { password: '{{vault.redis_password}}' },
        db: { url: 'postgres://{{proc.host}}:5432/db' },
      },
    });

    expect(found).toEqual(
      expect.arrayContaining([
        { placeholder: '{{vault.redis_password}}', path: 'env.redis.password' },
        { placeholder: '{{proc.host}}', path: 'env.db.url' },
      ]),
    );
    expect(found).toHaveLength(2);
  });

  it('ignores {{platform.*}} placeholders (resolved at runtime by the platform)', () => {
    expect(
      findUnresolvedTemplates({ env: { lb: '{{platform.lb_url}}' } }),
    ).toEqual([]);
  });
});
