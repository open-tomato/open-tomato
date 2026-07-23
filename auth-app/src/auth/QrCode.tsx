/**
 * Deterministic QR-ish placeholder for the 2FA scan step.
 *
 * The real flow renders a genuine QR of the `otpauth://` URI (a backend/lib
 * concern). For the PoC this draws a stable pseudo-matrix seeded from the URI
 * so the screen reads as "a QR" and captures deterministically (no randomness).
 */

const GRID = 21;

/** Stable non-crypto hash → 32-bit unsigned. */
const hash = (input: string): number => {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const cellOn = (seed: number, x: number, y: number): boolean => {
  // Finder-pattern corners always filled for a QR-like silhouette.
  const inFinder = (fx: number, fy: number) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7
    && (x === fx || x === fx + 6 || y === fy || y === fy + 6
      || (x >= fx + 2 && x <= fx + 4 && y >= fy + 2 && y <= fy + 4));
  if (inFinder(0, 0) || inFinder(GRID - 7, 0) || inFinder(0, GRID - 7)) return true;
  const isFinderZone = (x < 8 && y < 8) || (x >= GRID - 8 && y < 8) || (x < 8 && y >= GRID - 8);
  if (isFinderZone) return false;
  return ((hash(`${seed}:${x}:${y}`) >> 3) & 1) === 1;
};

export const QrCode = ({ value, size = 168 }: { value: string; size?: number }) => {
  const seed = hash(value);
  const cell = size / GRID;
  const rects: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      if (cellOn(seed, x, y)) rects.push({ x, y });
    }
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Two-factor QR code"
      className="rounded-md border border-border-soft bg-white p-2"
    >
      {rects.map(({ x, y }) => (
        <rect
          key={`${x}-${y}`}
          x={x * cell}
          y={y * cell}
          width={cell}
          height={cell}
          fill="#111"
        />
      ))}
    </svg>
  );
};
