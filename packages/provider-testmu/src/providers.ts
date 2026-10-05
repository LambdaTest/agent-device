export function isTestMuAppReference(value: string): boolean {
  return /^lt:\/\/[\w.-]+$/.test(value);
}

/** URI schemes are case-insensitive; the hub matches the lower-case `lt://` spelling. */
export function canonicalTestMuAppReference(value: string): string {
  return value.slice(0, 5).toLowerCase() === 'lt://' ? `lt://${value.slice(5)}` : value;
}
