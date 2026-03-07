export function generateUUID(): string {
  return crypto.randomUUID();
}

export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function shortId(uuid: string): string {
  return uuid.slice(0, 8);
}
