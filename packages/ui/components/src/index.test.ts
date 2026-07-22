import { describe, expect, it } from 'vitest';

import { UI_COMPONENTS_PACKAGE } from './index';

describe('scaffold placeholder', () => {
  it('exposes the package name until WS05 wave 0 replaces the barrel', () => {
    expect(UI_COMPONENTS_PACKAGE).toBe('@open-tomato/ui-components');
  });
});
