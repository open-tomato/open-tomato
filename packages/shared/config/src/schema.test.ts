import { describe, it, expect } from 'vitest';

import { coerceProvision } from './provision.js';
import { BaseConfigSchema } from './schema.js';

const baseService = {
  project: {
    id: 'knowledge-base',
    type: 'service' as const,
    port: 3001,
  },
};

describe('BaseConfigSchema — project.owner (soft-required)', () => {
  it('accepts a config with project.owner present', () => {
    const result = BaseConfigSchema.safeParse({
      project: { ...baseService.project, owner: 'platform-team' },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.project.owner).toBe('platform-team');
    }
  });

  it('accepts a config with project.owner absent (soft-required is enforced by the loader, not the schema)', () => {
    const result = BaseConfigSchema.safeParse(baseService);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.project.owner).toBeUndefined();
    }
  });
});

describe('BaseConfigSchema — infrastructure pot', () => {
  it('accepts a vendor pot (`infrastructure.homelab`) with arbitrary nested content', () => {
    const result = BaseConfigSchema.safeParse({
      ...baseService,
      infrastructure: {
        homelab: {
          host: 'tomato-pi.local',
          network: { subnet: '10.0.0.0/24', vlan: 42 },
          storage: [{ name: 'data', size: '100G' }],
        },
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.infrastructure).toEqual({
        homelab: {
          host: 'tomato-pi.local',
          network: { subnet: '10.0.0.0/24', vlan: 42 },
          storage: [{ name: 'data', size: '100G' }],
        },
      });
    }
  });
});

describe('BaseConfigSchema — provision shorthand', () => {
  it('validates `provision: true` at the schema level', () => {
    const result = BaseConfigSchema.safeParse({
      ...baseService,
      provision: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provision).toBe(true);
    }
  });

  it('coerces `provision: true` to `{}` via coerceProvision after schema validation', () => {
    const result = BaseConfigSchema.safeParse({
      ...baseService,
      provision: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(coerceProvision(result.data.provision)).toEqual({});
    }
  });
});
