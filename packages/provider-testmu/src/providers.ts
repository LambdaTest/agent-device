export function isTestMuAppReference(value: string): boolean {
  return /^lt:\/\/[\w.-]+$/.test(value);
}
