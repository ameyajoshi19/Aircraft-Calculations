/** Clamp `value` into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Linear interpolation/extrapolation between two known (x, y) points. */
export function lerp(x: number, x0: number, y0: number, x1: number, y1: number): number {
  if (x1 === x0) return y0;
  const t = (x - x0) / (x1 - x0);
  return y0 + t * (y1 - y0);
}

/**
 * Linearly interpolates `y` for `x` from a table of samples, sorted or not.
 * Values outside the table's range are clamped to the nearest edge (no
 * extrapolation), matching how a POH table is read: you don't fly past its
 * charted limits.
 */
export function interpolate1D(x: number, samples: Array<{ x: number; y: number }>): number {
  if (samples.length === 0) return NaN;
  const sorted = [...samples].sort((a, b) => a.x - b.x);
  if (x <= sorted[0].x) return sorted[0].y;
  if (x >= sorted[sorted.length - 1].x) return sorted[sorted.length - 1].y;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (x >= a.x && x <= b.x) {
      return lerp(x, a.x, a.y, b.x, b.y);
    }
  }
  return sorted[sorted.length - 1].y;
}

/**
 * Two-stage linear interpolation over an irregular grid of points, each
 * carrying (gridX, gridY, value). Groups samples into columns by `gridX`,
 * interpolates each column along `gridY`, then interpolates those results
 * along `gridX`. This is how POH performance tables are read by hand:
 * interpolate down a temperature column at each bracketing altitude, then
 * interpolate between those two altitude results.
 */
export function interpolate2D<T extends { gridX: number; gridY: number; value: number }>(
  x: number,
  y: number,
  samples: T[]
): number {
  if (samples.length === 0) return NaN;

  const columns = new Map<number, T[]>();
  for (const s of samples) {
    const col = columns.get(s.gridX) ?? [];
    col.push(s);
    columns.set(s.gridX, col);
  }

  const xs = [...columns.keys()].sort((a, b) => a - b);
  const clampedX = clamp(x, xs[0], xs[xs.length - 1]);

  let xLower = xs[0];
  let xUpper = xs[xs.length - 1];
  for (let i = 0; i < xs.length - 1; i++) {
    if (clampedX >= xs[i] && clampedX <= xs[i + 1]) {
      xLower = xs[i];
      xUpper = xs[i + 1];
      break;
    }
  }

  const valueAtColumn = (gridX: number) => {
    const col = columns.get(gridX)!;
    return interpolate1D(
      y,
      col.map((s) => ({ x: s.gridY, y: s.value }))
    );
  };

  const yLower = valueAtColumn(xLower);
  if (xLower === xUpper) return yLower;
  const yUpper = valueAtColumn(xUpper);
  return lerp(clampedX, xLower, yLower, xUpper, yUpper);
}
