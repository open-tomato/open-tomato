/**
 * Returns a promise that resolves after the specified number of milliseconds.
 *
 * @param ms - The number of milliseconds to wait before resolving.
 * @returns A promise that resolves to `void` after the delay.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
