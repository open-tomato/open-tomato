import { describe, it, expect } from 'vitest';

import { extractPlatformRefs, isPlatformRef } from './platformRefs.js';

describe('PLATFORM_REF_PATTERN', () => {
  it('matches a single `{{platform.<vendor>.<path>}}` reference', () => {
    const value = 'subnet={{platform.homelab.subnet}}';

    expect(isPlatformRef(value)).toBe(true);
    expect(extractPlatformRefs(value)).toEqual([
      {
        vendor: 'homelab',
        path: 'subnet',
        full: '{{platform.homelab.subnet}}',
      },
    ]);
  });

  it('matches multiple references inside one string', () => {
    const value =
      'host={{platform.heroku.app.name}} region={{platform.homelab.region}}';

    expect(isPlatformRef(value)).toBe(true);
    expect(extractPlatformRefs(value)).toEqual([
      {
        vendor: 'heroku',
        path: 'app.name',
        full: '{{platform.heroku.app.name}}',
      },
      {
        vendor: 'homelab',
        path: 'region',
        full: '{{platform.homelab.region}}',
      },
    ]);
  });

  it('captures the full dotted path for nested references', () => {
    const value = '{{platform.homelab.network.subnet}}';

    expect(extractPlatformRefs(value)).toEqual([
      {
        vendor: 'homelab',
        path: 'network.subnet',
        full: '{{platform.homelab.network.subnet}}',
      },
    ]);
  });

  it('does not match references missing the closing curly braces', () => {
    const value = '{{platform.homelab.network.subnet';

    expect(isPlatformRef(value)).toBe(false);
    expect(extractPlatformRefs(value)).toEqual([]);
  });

  it('does not match `{{config.*}}` or `{{vault.*}}` placeholders', () => {
    const configValue = 'token={{config.foo}}';
    const vaultValue = 'secret={{vault.foo}}';
    const mixed = '{{config.foo}} and {{vault.foo}}';

    expect(isPlatformRef(configValue)).toBe(false);
    expect(extractPlatformRefs(configValue)).toEqual([]);

    expect(isPlatformRef(vaultValue)).toBe(false);
    expect(extractPlatformRefs(vaultValue)).toEqual([]);

    expect(isPlatformRef(mixed)).toBe(false);
    expect(extractPlatformRefs(mixed)).toEqual([]);
  });
});
