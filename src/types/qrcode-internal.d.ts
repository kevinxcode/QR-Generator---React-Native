declare module 'qrcode/lib/core/alignment-pattern' {
  /** Top-left [row, col] of each 5x5 alignment pattern for the given version. */
  export function getPositions(version: number): [number, number][];
}
