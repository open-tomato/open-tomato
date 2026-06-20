/**
 * Template resolution for the config standard.
 *
 * Only the `{{config.*}}` namespace is resolved here — self-references within
 * the same config, expanded after merge and before validation. The other
 * namespaces are intentionally left alone:
 *
 * - `{{vault.*}}` / `{{proc.*}}` — resolved by the CLI (`tomato config export`)
 *   before the service starts. If they survive to load time it means export was
 *   not run, so {@link findUnresolvedTemplates} surfaces them as errors.
 * - `{{platform.*}}` — resolved at runtime by the platform; left untouched.
 */
import { ConfigError } from './errors.js';

const CONFIG_REF = /\{\{\s*config\.([^}]+?)\s*\}\}/g;
const SECRET_REF = /\{\{\s*(?:vault|proc)\.[^}]+?\s*\}\}/g;

function getByPath(root: Record<string, unknown>, dotted: string): unknown {
  let current: unknown = root;
  for (const segment of dotted.split('.')) {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function resolveString(
  value: string,
  root: Record<string, unknown>,
  keyPath: string,
): string {
  return value.replace(CONFIG_REF, (_match, dotted: string) => {
    const resolved = getByPath(root, dotted);

    if (resolved === undefined || resolved === null) {
      throw new ConfigError(
        'UNRESOLVED_TEMPLATE',
        `Unresolved template '{{config.${dotted}}}' — no such config key`,
        { key: keyPath },
      );
    }
    if (typeof resolved === 'object') {
      throw new ConfigError(
        'UNRESOLVED_TEMPLATE',
        `Template '{{config.${dotted}}}' resolves to a non-scalar value`,
        { key: keyPath },
      );
    }
    return String(resolved);
  });
}

function walk(node: unknown, root: Record<string, unknown>, keyPath: string): unknown {
  if (typeof node === 'string') {
    return resolveString(node, root, keyPath);
  }
  if (Array.isArray(node)) {
    return node.map((item, index) => walk(item, root, `${keyPath}[${index}]`));
  }
  if (node !== null && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(node)) {
      out[key] = walk(child, root, keyPath
        ? `${keyPath}.${key}`
        : key);
    }
    return out;
  }
  return node;
}

/**
 * Resolve every `{{config.*}}` self-reference against the config root. Returns a
 * new structure; the input is not mutated. Throws `ConfigError`
 * (`UNRESOLVED_TEMPLATE`) if a referenced key is missing or non-scalar.
 */
export function resolveConfigRefs(
  config: Record<string, unknown>,
): Record<string, unknown> {
  return walk(config, config, '') as Record<string, unknown>;
}

/** A leftover non-`config` template placeholder and the key path it sits at. */
export interface UnresolvedTemplate {
  placeholder: string;
  path: string;
}

/**
 * Find any `{{vault.*}}` or `{{proc.*}}` placeholders still present after merge
 * and `{{config.*}}` resolution. `{{platform.*}}` is ignored — it is resolved
 * at runtime by the platform, not by this loader.
 */
export function findUnresolvedTemplates(
  config: Record<string, unknown>,
): UnresolvedTemplate[] {
  const found: UnresolvedTemplate[] = [];

  const visit = (node: unknown, keyPath: string): void => {
    if (typeof node === 'string') {
      const matches = node.match(SECRET_REF);
      if (matches) {
        for (const placeholder of matches) {
          found.push({ placeholder, path: keyPath });
        }
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${keyPath}[${index}]`));
      return;
    }
    if (node !== null && typeof node === 'object') {
      for (const [key, child] of Object.entries(node)) {
        visit(child, keyPath
          ? `${keyPath}.${key}`
          : key);
      }
    }
  };

  visit(config, '');
  return found;
}
