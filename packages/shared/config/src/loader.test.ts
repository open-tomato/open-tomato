import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

import { ConfigError } from './errors.js';
import { loadConfig } from './loader.js';
import { defineConfig } from './schema.js';

const FIXTURES_DIR = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
  'tests',
  'fixtures',
);

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'otconfig-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function write(name: string, contents: string): void {
  writeFileSync(join(dir, name), contents);
}

async function caughtAsync(fn: () => Promise<unknown>): Promise<ConfigError> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof ConfigError) return err;
    throw err;
  }
  throw new Error('expected loadConfig to throw a ConfigError');
}

describe('loadConfig', () => {
  it('loads a single config.default.yaml with no overlays', async () => {
    write(
      'config.default.yaml',
      [
        'project:',
        '  id: kb',
        '  type: service',
        '  port: 3001',
        'env:',
        '  database_a:',
        '    url: postgres://h:5432/db',
      ].join('\n'),
    );

    const { config, warnings } = await loadConfig({ configDir: dir, env: 'dev' });

    expect(config).toMatchObject({
      project: { id: 'kb', type: 'service', port: 3001 },
      env: { database_a: { url: 'postgres://h:5432/db' } },
    });
    // The fixture omits project.owner, so the loader emits the soft-required warning.
    expect(warnings.map((w) => w.path)).toEqual(['project.owner']);
  });

  it('overlays config.<env>.yaml values over the default', async () => {
    write('config.default.yaml', 'project: { id: kb, type: service, port: 1 }\nenv: { a: { url: default } }\n');
    write('config.prod.yaml', 'env: { a: { url: prod } }\n');

    const { config } = await loadConfig({ configDir: dir, env: 'prod' });

    expect(config).toMatchObject({ env: { a: { url: 'prod' } } });
  });

  it('throws SCHEMA_MISMATCH when an overlay introduces a new env key', async () => {
    write('config.default.yaml', 'project: { id: kb, type: service, port: 1 }\nenv: { a: 1 }\n');
    write('config.prod.yaml', 'env: { b: 2 }\n');

    const err = await caughtAsync(() => loadConfig({ configDir: dir, env: 'prod' }));
    expect(err.code).toBe('SCHEMA_MISMATCH');
    expect(err.key).toBe('env.b');
  });

  it('resolves {{config.*}} self-references', async () => {
    write(
      'config.default.yaml',
      'project: { id: knowledge-base, type: service, port: 1 }\nenv: { sentry: { release: "{{config.project.id}}@1.0.0" } }\n',
    );

    const { config } = await loadConfig({ configDir: dir, env: 'dev' });
    expect(config).toMatchObject({ env: { sentry: { release: 'knowledge-base@1.0.0' } } });
  });

  it('throws UNRESOLVED_TEMPLATE for a {{config.*}} path that does not exist', async () => {
    write('config.default.yaml', 'project: { id: kb, type: service, port: 1 }\nenv: { x: "{{config.project.nope}}" }\n');

    const err = await caughtAsync(() => loadConfig({ configDir: dir, env: 'dev' }));
    expect(err.code).toBe('UNRESOLVED_TEMPLATE');
  });

  it('throws UNRESOLVED_TEMPLATE with a help message when a {{vault.*}} placeholder remains', async () => {
    write('config.default.yaml', 'project: { id: kb, type: service, port: 1 }\nenv: { secret: "{{vault.api_key}}" }\n');

    const err = await caughtAsync(() => loadConfig({ configDir: dir, env: 'staging' }));
    expect(err.code).toBe('UNRESOLVED_TEMPLATE');
    expect(err.message).toContain('tomato config export');
  });

  it('throws VALIDATION_FAILED when a service has no port', async () => {
    write('config.default.yaml', 'project: { id: kb, type: service }\n');

    const err = await caughtAsync(() => loadConfig({ configDir: dir, env: 'dev' }));
    expect(err.code).toBe('VALIDATION_FAILED');
  });

  it('throws MISSING_DEFAULT when config.default.yaml is absent', async () => {
    const err = await caughtAsync(() => loadConfig({ configDir: dir, env: 'dev' }));
    expect(err.code).toBe('MISSING_DEFAULT');
  });

  it('loads config.local.yaml only when NODE_ENV=development', async () => {
    write('config.default.yaml', 'project: { id: kb, type: service, port: 1 }\nenv: { a: { url: base } }\n');
    write('config.local.yaml', 'env: { a: { url: local } }\n');

    const original = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      const { config: skipped } = await loadConfig({ configDir: dir, env: 'dev' });
      expect(skipped).toMatchObject({ env: { a: { url: 'base' } } });

      process.env.NODE_ENV = 'development';
      const { config: loaded } = await loadConfig({ configDir: dir, env: 'dev' });
      expect(loaded).toMatchObject({ env: { a: { url: 'local' } } });
    } finally {
      process.env.NODE_ENV = original;
    }
  });

  it('runs a defineConfig schema and throws VALIDATION_FAILED on a violation', async () => {
    write('config.default.yaml', 'project: { id: kb, type: service, port: 1 }\nenv: { db: { url: not-a-url } }\n');
    const schema = defineConfig({ env: z.object({ db: z.object({ url: z.string().url() }) }) });

    const err = await caughtAsync(() => loadConfig({ configDir: dir, env: 'dev', schema }));
    expect(err.code).toBe('VALIDATION_FAILED');
  });

  it('returns a deep-frozen object', async () => {
    write('config.default.yaml', 'project: { id: kb, type: service, port: 1 }\nenv: { a: { url: x } }\n');

    const { config } = await loadConfig({ configDir: dir, env: 'dev' });
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.project)).toBe(true);
  });

  it('returns a warnings array alongside the resolved config', async () => {
    write('config.default.yaml', 'project: { id: kb, type: service, port: 1 }\nenv: {}\n');

    const result = await loadConfig({ configDir: dir, env: 'dev' });
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(result.config).toBeDefined();
  });

  it('emits exactly one soft-required warning when project.owner is absent', async () => {
    write('config.default.yaml', 'project: { id: kb, type: service, port: 1 }\nenv: {}\n');

    const { warnings } = await loadConfig({ configDir: dir, env: 'dev' });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toEqual({
      path: 'project.owner',
      message: expect.stringMatching(/owner/i) as unknown as string,
    });
  });

  it('emits no owner warning when project.owner is present', async () => {
    write(
      'config.default.yaml',
      'project: { id: kb, type: service, port: 1, owner: platform-team }\nenv: {}\n',
    );

    const { warnings } = await loadConfig({ configDir: dir, env: 'dev' });

    expect(warnings.filter((w) => w.path === 'project.owner')).toEqual([]);
  });

  it('preserves {{platform.<vendor>.<path>}} refs verbatim through loadConfig', async () => {
    write(
      'config.default.yaml',
      [
        'project: { id: kb, type: service, port: 1 }',
        'env:',
        '  subnet: "{{platform.homelab.network.subnet}}"',
        '  composed: "vlan-{{platform.homelab.network.vlan}}-prod"',
        '  nested:',
        '    region: "{{platform.heroku.region}}"',
        '  arr:',
        '    - "{{platform.homelab.dns.zone}}"',
      ].join('\n'),
    );

    const { config } = await loadConfig({ configDir: dir, env: 'dev' });

    expect(config.env).toMatchObject({
      subnet: '{{platform.homelab.network.subnet}}',
      composed: 'vlan-{{platform.homelab.network.vlan}}-prod',
      nested: { region: '{{platform.heroku.region}}' },
      arr: ['{{platform.homelab.dns.zone}}'],
    });
  });

  it('coerces `provision: true` to `{}` in the resolved config', async () => {
    write(
      'config.default.yaml',
      [
        'project: { id: kb, type: service, port: 1 }',
        'provision: true',
        'env: {}',
      ].join('\n'),
    );

    const { config } = await loadConfig({ configDir: dir, env: 'dev' });

    expect(config.provision).toEqual({});
  });

  it('loads the schema-v2-full fixture: platform refs + infra pot + provision + owner', async () => {
    const fixture = readFileSync(join(FIXTURES_DIR, 'schema-v2-full.yaml'), 'utf8');
    write('config.default.yaml', fixture);

    const { config, warnings } = await loadConfig({ configDir: dir, env: 'dev' });

    // project.owner present → soft-required warning is suppressed.
    expect(warnings.filter((w) => w.path === 'project.owner')).toEqual([]);
    expect(config.project).toMatchObject({
      id: 'knowledge-base',
      type: 'service',
      owner: 'platform-team',
      port: 3001,
    });

    // Vendor pot survives untouched at infrastructure.<vendor>.
    expect(config.infrastructure).toMatchObject({
      homelab: {
        host: 'tomato-pi.local',
        network: { subnet: '10.0.0.0/24', vlan: 42 },
        storage: [{ name: 'data', size: '100G' }],
      },
      heroku: { region: 'us', dyno: 'standard-1x' },
    });

    // provision object form passes through coerceProvision unchanged.
    expect(config.provision).toEqual({
      caps: ['db:write', 'cache:read'],
      metadata: { tier: 'gold' },
    });

    // `{{config.*}}` resolves; `{{platform.*}}` is preserved verbatim,
    // including composed strings and array entries.
    expect(config.env).toMatchObject({
      server: { port: '3001' },
      network: {
        subnet: '{{platform.homelab.network.subnet}}',
        cidr: 'vlan-{{platform.homelab.network.vlan}}-prod',
        region: '{{platform.heroku.region}}',
        zones: ['{{platform.homelab.dns.zone}}'],
      },
    });
  });
});
