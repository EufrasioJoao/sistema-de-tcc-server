export {};

declare global {
  // In-memory store for password reset codes
  // eslint-disable-next-line no-var
  var resetCodes: Record<string, { code: string; expiresAt: Date }>;
}
