/**
 * @packageDocumentation
 * Singleton registry that maps entity kinds to their plugin definitions.
 */
import type { EntityKind, EntityTypeDefinition } from './types.js';

/**
 * Central registry for entity type definitions.
 *
 * Each entity plugin calls `registry.register(definition)` during service
 * startup. The routes and stores use `registry.get(kind)` to look up the
 * schema for payload validation.
 *
 * This is intentionally a simple synchronous registry — no async resolution,
 * no lazy loading. All plugins register before the HTTP server accepts
 * requests (plugins run in `createService` startup sequence).
 */
export class EntityRegistry {
  private readonly entries = new Map<EntityKind, EntityTypeDefinition>();

  /**
   * Registers an entity plugin definition.
   *
   * @param definition - The plugin definition to register.
   * @throws {Error} If the entity kind is already registered.
   */
  register(definition: EntityTypeDefinition): void {
    if (this.entries.has(definition.kind)) {
      throw new Error(
        `[EntityRegistry] Entity kind "${definition.kind}" is already registered`,
      );
    }
    this.entries.set(definition.kind, definition);
  }

  /**
   * Looks up a registered entity plugin by kind.
   *
   * @param kind - The entity kind to look up.
   * @returns The plugin definition, or `undefined` if not registered.
   */
  get(kind: EntityKind): EntityTypeDefinition | undefined {
    return this.entries.get(kind);
  }

  /**
   * Returns all registered entity kinds.
   *
   * @returns Array of registered kind strings — useful for `/status` detail output.
   */
  kinds(): EntityKind[] {
    return [...this.entries.keys()];
  }
}

export const entityRegistry = new EntityRegistry();
