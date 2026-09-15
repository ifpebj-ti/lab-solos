export function belowQualityLimits(value: number): number {
  if (value > 0) return value + 1;
  return value;
}
