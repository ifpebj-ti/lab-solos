export function safe(input: string): unknown {
  return JSON.parse(input);
}
