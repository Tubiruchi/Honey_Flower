/** Validation shared by the two amount-entry presentations; no persistence or habit policy. */
export function isValidWaterAmount(value: string): boolean {
  return (
    /^\d+$/.test(value) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) >= 1 &&
    Number(value) <= 10_000
  );
}
