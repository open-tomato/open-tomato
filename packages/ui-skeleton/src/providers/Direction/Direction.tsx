import { DirectionProvider as RadixDirectionProvider } from '@radix-ui/react-direction';
import * as React from 'react';

/**
 * Public direction values surfaced through the provider. Mirrors the union
 * accepted by `@radix-ui/react-direction`'s `DirectionProvider`. Kept as a
 * named literal alias so consumers can spell the type in their own props.
 */
export type DirectionValue = 'ltr' | 'rtl';

/**
 * Direction — pure context wrapper around `@radix-ui/react-direction`'s
 * `DirectionProvider`. Exposes a `dir` value (`'ltr' | 'rtl'`, default
 * `'ltr'`) to every Radix primitive in the descendant tree so directional
 * affordances flip without per-primitive configuration.
 *
 * @remarks Wraps `@radix-ui/react-direction`'s `DirectionProvider`. Renders
 * `children` inside the provider and nothing else — no DOM beyond `children`,
 * no `className` surface, no wrapping element. Descendants read the value via
 * `useDirection()` from `@radix-ui/react-direction`; Radix primitives consume
 * it internally to flip Popover/HoverCard/Tooltip `side`, Slider thumb
 * direction, ContextMenu / DropdownMenu / Menubar alignment, NavigationMenu
 * viewport positioning, and Tabs orientation (vertical-mode keyboard
 * navigation).
 *
 * Direction does NOT set the `dir` attribute on the HTML root. Radix
 * primitives consume the value via context only. If the consuming app also
 * needs `<html dir="rtl">` (for text directionality of plain markup, native
 * form controls, CSS logical-property fallbacks, etc.), the app is
 * responsible for setting it — typically alongside the `Direction` mount.
 *
 * @example
 * ```tsx
 * import { Direction } from '@open-tomato/ui-skeleton';
 *
 * function App() {
 *   return (
 *     <Direction dir="rtl">
 *       <Layout>{routes}</Layout>
 *     </Direction>
 *   );
 * }
 * ```
 */
export interface DirectionProps {
  /**
   * Layout direction propagated to every Radix primitive in the descendant
   * tree. `'ltr'` (default) keeps Western reading order; `'rtl'` flips
   * directional affordances (Popover `side`, Slider thumb, ContextMenu
   * alignment) without per-primitive configuration.
   *
   * @defaultValue `'ltr'`
   */
  dir?: DirectionValue;
  /** Subtree that receives the direction context. */
  children: React.ReactNode;
}

export function Direction({ dir = 'ltr', children }: DirectionProps): React.JSX.Element {
  return <RadixDirectionProvider dir={dir}>{children}</RadixDirectionProvider>;
}
Direction.displayName = 'Direction';
