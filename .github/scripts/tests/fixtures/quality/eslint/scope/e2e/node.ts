export function nodeValue(): string {
  return process.env.NODE_ENV ?? "test";
}
