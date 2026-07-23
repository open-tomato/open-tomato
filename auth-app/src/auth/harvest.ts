/**
 * Field harvesting for the published auth templates.
 *
 * LIBRARY-GAP WORKAROUND (see AGENTS.md / auth-api-contract.md): the
 * `@open-tomato/ui-components` auth page templates are fully self-contained —
 * they own their form state internally and expose no value or submit
 * callbacks. To drive REAL flows the app reads the current field values off
 * the rendered DOM at submit time. This keeps the mock genuinely end-to-end
 * (type a wrong code → the mock rejects it) without forking the library.
 *
 * When the library grows controlled props / an `onSubmit`, this module and
 * `FlowScreen`'s delegation go away.
 */

export interface HarvestedFields {
  email?: string;
  password?: string;
  /** Concatenated digits from a CodeInput (single-char numeric cells). */
  code?: string;
}

const isCodeCell = (input: HTMLInputElement): boolean => input.maxLength === 1
  && (input.inputMode === 'numeric' || input.getAttribute('inputmode') === 'numeric');

export const harvestFields = (container: HTMLElement): HarvestedFields => {
  const inputs = Array.from(container.querySelectorAll('input'));

  const codeCells = inputs.filter(isCodeCell);
  const code = codeCells.length > 0
    ? codeCells.map((c) => c.value).join('')
    : undefined;

  const email = inputs.find((i) => i.type === 'email')?.value;
  // First password field is the primary secret (reset has two — the second is
  // the confirmation, validated inside the template itself).
  const password = inputs.find((i) => i.type === 'password')?.value;

  return { email, password, code };
};
